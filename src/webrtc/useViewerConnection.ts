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
    let pc: RTCPeerConnection | null = null;
    let signal: SignalingClient | null = null;

    (async () => {
      const iceServers = await buildIceServers(useStun);
      if (cancelled) return;

      pc = new RTCPeerConnection({ iceServers });
      const activePc = pc;
      signal = new SignalingClient();
      const activeSignal = signal;
      const id = crypto.randomUUID();
      const remote = new MediaStream();
      setRemoteStream(remote);

      activePc.ontrack = (e) => {
        if (cancelled) return;
        remote.addTrack(e.track);
        setRemoteStream(new MediaStream(remote.getTracks()));
      };

      activePc.ondatachannel = (e) => {
        e.channel.onmessage = (ev) => {
          if (cancelled) return;
          try {
            setCameraStatus(JSON.parse(ev.data));
          } catch {
            // ignore malformed status payloads
          }
        };
      };

      activePc.onicecandidate = (e) => {
        if (cancelled) return;
        if (e.candidate) {
          activeSignal.send({
            type: "signal",
            room,
            to: "host",
            payload: { kind: "ice", candidate: e.candidate.toJSON() },
          });
        }
      };

      activePc.onconnectionstatechange = () => {
        if (cancelled) return;
        if (activePc.connectionState === "connected") setStatus("connected");
        else if (["failed", "disconnected", "closed"].includes(activePc.connectionState)) {
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
          activePc.addTrack(track, micStream);
        } catch {
          setMicError("Microfone indisponível — só será possível assistir.");
        }
      }

      activeSignal.onOpen = () => {
        if (cancelled) return;
        activeSignal.send({ type: "join", room, role: "viewer", id });
      };

      activeSignal.onMessage = async (msg) => {
        if (cancelled) return;
        if (msg.type === "signal" && msg.payload.kind === "offer") {
          await setupMicTrack();
          await activePc.setRemoteDescription(msg.payload.sdp);
          const answer = await activePc.createAnswer();
          await activePc.setLocalDescription(answer);
          activeSignal.send({
            type: "signal",
            room,
            to: "host",
            payload: { kind: "answer", sdp: answer },
          });
        } else if (msg.type === "signal" && msg.payload.kind === "ice") {
          try {
            await activePc.addIceCandidate(msg.payload.candidate);
          } catch {
            // candidate arrived before remote description; safe to ignore
          }
        } else if (msg.type === "peer-left" || msg.type === "error") {
          setStatus("disconnected");
        }
      };

      activeSignal.onClose = () => {
        if (!cancelled) setStatus("disconnected");
      };
    })();

    return () => {
      cancelled = true;
      signal?.close();
      pc?.close();
      micTrackRef.current?.stop();
    };
  }, [room, useStun]);

  const setTalking = useCallback((on: boolean) => {
    if (micTrackRef.current) micTrackRef.current.enabled = on;
  }, []);

  return { status, remoteStream, cameraStatus, micError, setTalking };
}
