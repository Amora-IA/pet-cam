import { signalingHttpBase } from "./signalingClient";

/**
 * TURN credentials are fetched through our own signaling server, which holds
 * the provider API key server-side. Never put a TURN API key in a VITE_
 * env var — anything with that prefix ships straight into the public JS
 * bundle, so anyone could read it and mint credentials on your account.
 */
async function fetchTurnServers(): Promise<RTCIceServer[]> {
  try {
    const res = await fetch(`${signalingHttpBase()}/turn-credentials`);
    if (!res.ok) return [];
    const servers = await res.json();
    return Array.isArray(servers) ? servers : [];
  } catch {
    return [];
  }
}

export async function buildIceServers(useStun: boolean): Promise<RTCIceServer[]> {
  const servers: RTCIceServer[] = [];
  if (useStun) servers.push({ urls: "stun:stun.l.google.com:19302" });
  servers.push(...(await fetchTurnServers()));
  return servers;
}
