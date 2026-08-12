import type { ClientMessage, ServerMessage } from "./types";

export const SIGNAL_PORT = 8787;

/** wss://host:port or ws://host:port, without trailing slash */
export function signalingUrl(): string {
  const configured = import.meta.env.VITE_SIGNAL_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, "");
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.hostname}:${SIGNAL_PORT}`;
}

/** http(s) base for REST calls to the same signaling server, without trailing slash */
export function signalingHttpBase(): string {
  return signalingUrl().replace(/^ws/, "http");
}

export class SignalingClient {
  private ws: WebSocket;
  private queue: ClientMessage[] = [];
  private open = false;

  onMessage: ((msg: ServerMessage) => void) | null = null;
  onOpen: (() => void) | null = null;
  onClose: (() => void) | null = null;
  onError: (() => void) | null = null;

  constructor() {
    this.ws = new WebSocket(signalingUrl());
    this.ws.onopen = () => {
      this.open = true;
      this.queue.forEach((m) => this.ws.send(JSON.stringify(m)));
      this.queue = [];
      this.onOpen?.();
    };
    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as ServerMessage;
        this.onMessage?.(msg);
      } catch {
        // ignore malformed messages
      }
    };
    this.ws.onclose = () => this.onClose?.();
    this.ws.onerror = () => this.onError?.();
  }

  send(message: ClientMessage) {
    if (this.open) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.queue.push(message);
    }
  }

  close() {
    this.ws.close();
  }
}
