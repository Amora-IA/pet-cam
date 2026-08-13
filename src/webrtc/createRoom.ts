import { signalingHttpBase } from "./signalingClient";

export interface RoomCredentials {
  code: string;
  token: string;
}

/** Thrown with a machine-readable code so callers can translate the message. */
export class CreateRoomError extends Error {
  code: "rate_limited" | "unknown";
  constructor(code: "rate_limited" | "unknown") {
    super(code);
    this.code = code;
  }
}

export async function createRoom(): Promise<RoomCredentials> {
  const res = await fetch(`${signalingHttpBase()}/rooms`, { method: "POST" });
  if (!res.ok) {
    throw new CreateRoomError(res.status === 429 ? "rate_limited" : "unknown");
  }
  return res.json();
}
