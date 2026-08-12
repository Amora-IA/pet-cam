export function buildIceServers(useStun: boolean): RTCIceServer[] {
  const servers: RTCIceServer[] = [];
  if (useStun) servers.push({ urls: "stun:stun.l.google.com:19302" });

  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: import.meta.env.VITE_TURN_USERNAME as string | undefined,
      credential: import.meta.env.VITE_TURN_CREDENTIAL as string | undefined,
    });
  }

  return servers;
}
