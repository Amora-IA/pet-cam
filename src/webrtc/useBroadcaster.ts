import { useEffect, useRef, useState } from "react";
import { SignalingClient } from "./signalingClient";
import { buildIceServers } from "./iceServers";
import type { CameraStatusMessage } from "./types";

interface UseBroadcasterOptions {
  enabled: boolean;
  room: string;
  hostToken: string;
  stream: MediaStream | null;
  useStun: boolean;
  status: CameraStatusMessage;
  onRemoteAudio?: (stream: MediaStream) => void;
}

interface PeerEntry {
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
}

export function useBroadcaster({
  enabled,
  room,
  hostToken,
  stream,
  useStun,
  status,
  onRemoteAudio,
}: UseBroadcasterOptions) {
  const [viewerCount, setViewerCount] = useState(0);
  const signalRef = useRef<SignalingClient | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    if (!enabled || !room || !hostToken || !stream) return;
    let cancelled = false;
    let signal: SignalingClient | null = null;

    (async () => {
      const iceServers = await buildIceServers(useStun);
      if (cancelled) return;

      signal = new SignalingClient();
      signalRef.current = signal;
      const activeSignal = signal;
      const id = "host";

      function createPeer(viewerId: string): PeerEntry {
        const pc = new RTCPeerConnection({ iceServers });
        stream!.getTracks().forEach((track) => pc.addTrack(track, stream!));
        // reserve an audio m-line to receive the viewer's talkback mic even
        // though the host stream itself carries no audio track
        pc.addTransceiver("audio", { direction: "recvonly" });

        const dataChannel = pc.createDataChannel("status");
        dataChannel.onopen = () => {
          dataChannel.send(JSON.stringify(statusRef.current));
        };

        pc.ontrack = (e) => {
          if (e.track.kind === "audio") {
            onRemoteAudio?.(e.streams[0]);
          }
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            activeSignal.send({
              type: "signal",
              room,
              to: viewerId,
              payload: { kind: "ice", candidate: e.candidate.toJSON() },
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed" || pc.connectionState === "closed") {
            removePeer(viewerId);
          }
        };

        return { pc, dataChannel };
      }

      function removePeer(viewerId: string) {
        const entry = peersRef.current.get(viewerId);
        if (entry) {
          entry.pc.close();
          peersRef.current.delete(viewerId);
          setViewerCount(peersRef.current.size);
        }
      }

      async function offerTo(viewerId: string) {
        const entry = createPeer(viewerId);
        peersRef.current.set(viewerId, entry);
        setViewerCount(peersRef.current.size);
        const offer = await entry.pc.createOffer();
        await entry.pc.setLocalDescription(offer);
        activeSignal.send({
          type: "signal",
          room,
          to: viewerId,
          payload: { kind: "offer", sdp: offer },
        });
      }

      activeSignal.onOpen = () => {
        if (cancelled) return;
        activeSignal.send({ type: "join", room, role: "host", id, token: hostToken });
      };

      activeSignal.onMessage = async (msg) => {
        if (cancelled) return;
        if (msg.type === "viewer-joined") {
          offerTo(msg.viewerId);
        } else if (msg.type === "peer-left") {
          removePeer(msg.id);
        } else if (msg.type === "signal") {
          const entry = peersRef.current.get(msg.from);
          if (!entry) return;
          if (msg.payload.kind === "answer") {
            await entry.pc.setRemoteDescription(msg.payload.sdp);
          } else if (msg.payload.kind === "ice") {
            try {
              await entry.pc.addIceCandidate(msg.payload.candidate);
            } catch {
              // candidate arrived before remote description; safe to ignore occasional races
            }
          }
        }
      };
    })();

    return () => {
      cancelled = true;
      signal?.close();
      signalRef.current = null;
      peersRef.current.forEach((entry) => entry.pc.close());
      peersRef.current.clear();
      setViewerCount(0);
    };
  }, [enabled, room, hostToken, stream, useStun, onRemoteAudio]);

  useEffect(() => {
    peersRef.current.forEach((entry) => {
      if (entry.dataChannel?.readyState === "open") {
        entry.dataChannel.send(JSON.stringify(status));
      }
    });
  }, [status]);

  return { viewerCount };
}
