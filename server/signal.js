import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";
import { WebSocketServer } from "ws";

// SIGNAL_PORT takes priority; PORT is what Render/Fly/Railway/etc inject
// automatically, so falling back to it means one less thing to configure.
const PORT = Number(process.env.SIGNAL_PORT ?? process.env.PORT ?? 8787);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// TURN credentials stay server-side only — never ship an API key to the
// browser bundle, or anyone reading the JS could mint credentials on your
// account and burn through your quota.
const TURN_API_KEY = process.env.TURN_API_KEY ?? "";
const TURN_DOMAIN = process.env.TURN_DOMAIN ?? "";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 ambiguity
const ROOM_UNCLAIMED_TTL_MS = 5 * 60 * 1000;
const HOST_RECONNECT_GRACE_MS = 2 * 60 * 1000;

function randomCode(length) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  return out;
}

function randomToken() {
  return randomBytes(24).toString("hex");
}

function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) return xff.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

/** ip -> { count, resetAt } */
function makeLimiter(limit, windowMs) {
  const hits = new Map();
  // periodically forget IPs whose window has already lapsed, otherwise this
  // map only ever grows for the lifetime of the process
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (now > entry.resetAt) hits.delete(ip);
    }
  }, windowMs).unref();

  return (ip) => {
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now > entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  };
}

const roomCreationLimiter = makeLimiter(10, 5 * 60 * 1000);
const wsJoinLimiter = makeLimiter(40, 60 * 1000);
const turnCredentialsLimiter = makeLimiter(20, 5 * 60 * 1000);

function isOriginAllowed(origin) {
  if (ALLOWED_ORIGINS.length === 0) return true; // permissive: local/dev usage
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}

/**
 * room code -> {
 *   hostToken, host, viewers: Map<id, ws>,
 *   createdAt, claimedAt, graceTimer
 * }
 */
const rooms = new Map();

function cleanupRoom(code) {
  const entry = rooms.get(code);
  if (!entry) return;
  if (entry.graceTimer) clearTimeout(entry.graceTimer);
  for (const viewerWs of entry.viewers.values()) viewerWs.close();
  rooms.delete(code);
}

setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of rooms) {
    if (!entry.claimedAt && now - entry.createdAt > ROOM_UNCLAIMED_TTL_MS) {
      cleanupRoom(code);
    }
  }
}, 60 * 1000).unref();

function send(ws, message) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

function setCors(res, origin) {
  if (ALLOWED_ORIGINS.length === 0) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const httpServer = createServer((req, res) => {
  const origin = req.headers.origin;
  setCors(res, origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/rooms" && req.method === "POST") {
    const ip = clientIp(req);
    if (!roomCreationLimiter(ip)) {
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "rate_limited" }));
      return;
    }
    let code = randomCode(8);
    while (rooms.has(code)) code = randomCode(8);
    const hostToken = randomToken();
    rooms.set(code, {
      hostToken,
      host: null,
      viewers: new Map(),
      createdAt: Date.now(),
      claimedAt: null,
      graceTimer: null,
    });
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ code, token: hostToken }));
    return;
  }

  if (req.url === "/turn-credentials" && req.method === "GET") {
    if (!TURN_API_KEY || !TURN_DOMAIN) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify([]));
      return;
    }
    const ip = clientIp(req);
    if (!turnCredentialsLimiter(ip)) {
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "rate_limited" }));
      return;
    }
    fetch(`https://${TURN_DOMAIN}/api/v1/turn/credentials?apiKey=${TURN_API_KEY}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((iceServers) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(Array.isArray(iceServers) ? iceServers : []));
      })
      .catch(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify([]));
      });
    return;
  }

  if (req.url === "/lan-ip") {
    const ips = [];
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.family === "IPv4" && !net.internal) ips.push(net.address);
      }
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ips }));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("petwatch signaling server\n");
});

const wss = new WebSocketServer({
  server: httpServer,
  verifyClient: ({ origin }) => isOriginAllowed(origin),
  // real messages here (join/signal) are a few KB at most — a generous cap
  // still blocks someone from sending giant frames to exhaust memory
  maxPayload: 32 * 1024,
});

wss.on("connection", (ws, req) => {
  ws.meta = null;
  const ip = clientIp(req);

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      if (!wsJoinLimiter(ip)) {
        send(ws, { type: "error", message: "rate_limited" });
        ws.close();
        return;
      }

      const { room, role, id, token } = msg;
      if (!room || !role || !id) return;
      const entry = rooms.get(room);
      if (!entry) {
        send(ws, { type: "error", message: "room_not_found" });
        ws.close();
        return;
      }

      if (role === "host") {
        if (token !== entry.hostToken) {
          send(ws, { type: "error", message: "invalid_token" });
          ws.close();
          return;
        }
        if (entry.graceTimer) {
          clearTimeout(entry.graceTimer);
          entry.graceTimer = null;
        }
        entry.host = ws;
        entry.claimedAt = Date.now();
        ws.meta = { room, role, id };
        for (const viewerId of entry.viewers.keys()) {
          send(ws, { type: "viewer-joined", viewerId });
        }
      } else {
        if (id === "host" || entry.viewers.has(id)) {
          send(ws, { type: "error", message: "id_taken" });
          ws.close();
          return;
        }
        ws.meta = { room, role, id };
        entry.viewers.set(id, ws);
        if (entry.host) {
          send(entry.host, { type: "viewer-joined", viewerId: id });
          send(ws, { type: "host-available" });
        }
      }
      return;
    }

    if (msg.type === "signal") {
      const { room, to, payload } = msg;
      // a socket may only relay within the exact room it joined, and only
      // to the peer role it's allowed to talk to (host<->viewer, never
      // viewer<->viewer) — otherwise any joined socket could guess another
      // room's code and inject signaling messages into it
      if (!ws.meta || ws.meta.room !== room) return;
      const entry = rooms.get(room);
      if (!entry) return;

      let target;
      if (ws.meta.role === "host") {
        target = entry.viewers.get(to);
      } else if (to === "host") {
        target = entry.host;
      }
      send(target, { type: "signal", from: ws.meta.id, payload });
      return;
    }
  });

  ws.on("close", () => {
    if (!ws.meta) return;
    const { room, role, id } = ws.meta;
    const entry = rooms.get(room);
    if (!entry) return;

    if (role === "host") {
      entry.host = null;
      for (const viewerWs of entry.viewers.values()) {
        send(viewerWs, { type: "peer-left", id: "host" });
      }
      entry.graceTimer = setTimeout(() => cleanupRoom(room), HOST_RECONNECT_GRACE_MS);
    } else {
      entry.viewers.delete(id);
      if (entry.host) send(entry.host, { type: "peer-left", id });
      if (!entry.host && entry.viewers.size === 0 && entry.claimedAt) {
        cleanupRoom(room);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[petwatch signal] listening on :${PORT}`);
  if (ALLOWED_ORIGINS.length === 0) {
    console.warn(
      "[petwatch signal] ALLOWED_ORIGINS is not set — accepting requests from ANY origin. " +
        "Fine for local dev, but set ALLOWED_ORIGINS before exposing this publicly."
    );
  }
});
