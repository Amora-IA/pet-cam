import { signalingHttpBase } from "./signalingClient";

export interface RoomCredentials {
  code: string;
  token: string;
}

export async function createRoom(): Promise<RoomCredentials> {
  const res = await fetch(`${signalingHttpBase()}/rooms`, { method: "POST" });
  if (!res.ok) {
    throw new Error(
      res.status === 429
        ? "Muitas tentativas — aguarde um minuto e tente novamente."
        : "Não foi possível criar a sala de pareamento."
    );
  }
  return res.json();
}
