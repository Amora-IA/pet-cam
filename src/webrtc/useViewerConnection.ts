import { useCallback, useEffect, useRef, useState } from "react";
import { SignalingClient } from "./signalingClient";
import { buildIceServers } from "./iceServers";
import type { CameraStatusMessage } from "./types";

export type ViewerStatus = "connecting" | "connected" | "disconnected";

interface UseViewerConnectionOptions {
  room: string;
  useStun: boolean;
}

export function useViewerConnection({ room, useStun }: UseViewerConnectionOptions) {
  const [status, setStatus] = useState<ViewerStatus>("connecting");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatusMessage | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const micTrackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    if (!room) return;
    let cancelled = false;

    const pc = new RTCPeerConnection({ iceServers: buildIceServers(useStun) });
    const signal = new SignalingClient();
    const id = crypto.randomUUID();
    const remote = new MediaStream();
    setRemoteStream(remote);

    pc.ontrack = (e) => {
      if (cancelled) return;
      remote.addTrack(e.track);
      setRemoteStream(new MediaStream(remote.getTracks()));
    };

    pc.ondatachannel = (e) => {
      e.channel.onmessage = (ev) => {
        if (cancelled) return;
        try {
          setCameraStatus(JSON.parse(ev.data));
        } catch {
          // ignore malformed status payloads
        }
      };
    };

    pc.onicecandidate = (e) => {
      if (cancelled) return;
      if (e.candidate) {
        signal.send({
          type: "signal",
          room,
          to: "host",
          payload: { kind: "ice", candidate: e.candidate.toJSON() },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (cancelled) return;
      if (pc.connectionState === "connected") setStatus("connected");
      else if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        setStatus("disconnected");
      }
    };

    async function setupMicTrack() {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (cancelled) {
          micStream.getTracks().forEach((t) => t.stop());
          return;
        }
        const track = micStream.getTracks()[0];
        track.enabled = false;
        micTrackRef.current = track;
        pc.addTrack(track, micStream);
      } catch {
        setMicError("Microfone indisponível — só será possível assistir.");
      }
    }

    signal.onOpen = () => {
      if (cancelled) return;
      signal.send({ type: "join", room, role: "viewer", id });
    };

    signal.onMessage = async (msg) => {
      if (cancelled) return;
      if (msg.type === "signal" && msg.payload.kind === "offer") {
        await setupMicTrack();
        await pc.setRemoteDescription(msg.payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signal.send({
          type: "signal",
          room,
          to: "host",
          payload: { kind: "answer", sdp: answer },
        });
      } else if (msg.type === "signal" && msg.payload.kind === "ice") {
        try {
          await pc.addIceCandidate(msg.payload.candidate);
        } catch {
          // candidate arrived before remote description; safe to ignore
        }
      } else if (msg.type === "peer-left" || msg.type === "error") {
        setStatus("disconnected");
      }
    };

    signal.onClose = () => {
      if (!cancelled) setStatus("disconnected");
    };

    return () => {
      cancelled = true;
      signal.close();
      pc.close();
      micTrackRef.current?.stop();
    };
  }, [room, useStun]);

  const setTalking = useCallback((on: boolean) => {
    if (micTrackRef.current) micTrackRef.current.enabled = on;
  }, []);

  return { status, remoteStream, cameraStatus, micError, setTalking };
}
