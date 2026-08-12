import { useCallback, useEffect, useRef, useState } from "react";
import { CameraView } from "./CameraView";
import { PairPanel } from "./PairPanel";
import { useCamera } from "../hooks/useCamera";
import { useMotionDetection } from "../hooks/useMotionDetection";
import { useRecorder } from "../hooks/useRecorder";
import { useMotionAlert } from "../hooks/useMotionAlert";
import { useTalkback } from "../hooks/useTalkback";
import { useBroadcaster } from "../webrtc/useBroadcaster";
import type { RoomCredentials } from "../webrtc/createRoom";
import type { CameraConfig } from "../types/camera";
import type { ClipRecord } from "../types/clip";

interface CameraTileProps {
  config: CameraConfig;
  now: Date;
  sensitivity: number;
  monitoringEnabled: boolean;
  soundAlertsEnabled: boolean;
  pushAlertsEnabled: boolean;
  isFocused: boolean;
  canFocus: boolean;
  onToggleFocus: () => void;
  onRemove: () => void;
  onClipSaved: (clip: ClipRecord) => void;
  onLiveChange: (cameraId: string, isLive: boolean) => void;
}

export function CameraTile({
  config,
  now,
  sensitivity,
  monitoringEnabled,
  soundAlertsEnabled,
  pushAlertsEnabled,
  isFocused,
  canFocus,
  onToggleFocus,
  onRemove,
  onClipSaved,
  onLiveChange,
}: CameraTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const { stream, status, error, devices } = useCamera({
    audio: false,
    deviceId: config.deviceId,
  });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    onLiveChange(config.id, status === "live");
    return () => onLiveChange(config.id, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, config.id]);

  const { motionLevel, isMotion } = useMotionDetection({
    videoRef,
    active: status === "live" && monitoringEnabled,
    sensitivity,
  });

  const { isRecording } = useRecorder({
    stream,
    videoRef,
    isMotion,
    enabled: status === "live" && monitoringEnabled,
    cameraId: config.id,
    cameraLabel: config.label,
    onClipSaved,
  });

  useMotionAlert({
    isMotion,
    cameraLabel: config.label,
    soundEnabled: soundAlertsEnabled && monitoringEnabled,
    pushEnabled: pushAlertsEnabled && monitoringEnabled,
  });

  const { isTalking, error: talkError, start: startTalk, stop: stopTalk } = useTalkback();

  const [showPairPanel, setShowPairPanel] = useState(false);
  const [room, setRoom] = useState<RoomCredentials | null>(null);
  const [useStun, setUseStun] = useState(false);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const handleRemoteAudio = useCallback((remoteStream: MediaStream) => {
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, []);

  const { viewerCount } = useBroadcaster({
    enabled: !!room && status === "live",
    room: room?.code ?? "",
    hostToken: room?.token ?? "",
    stream,
    useStun,
    status: { isMotion, isRecording, motionLevel, cameraLabel: config.label },
    onRemoteAudio: handleRemoteAudio,
  });

  const currentDeviceLabel =
    devices.find((d) => d.deviceId === config.deviceId)?.label || config.label;

  const handleSnapshot = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${config.label.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className={`camera-tile ${isFocused ? "is-focused" : ""}`}>
      <CameraView
        ref={videoRef}
        status={status}
        error={error}
        isRecording={isRecording}
        isMotion={isMotion}
        motionLevel={motionLevel}
        cameraLabel={config.label}
        now={now}
      />

      <div className="camera-tile__toolbar">
        <span className="camera-tile__name" title={currentDeviceLabel}>
          {config.label}
        </span>
        <div className="camera-tile__actions">
          <button
            className={`camera-tile__talk ${isTalking ? "is-active" : ""}`}
            title="Segure para falar com o pet (mic → caixas de som deste dispositivo)"
            onMouseDown={startTalk}
            onMouseUp={stopTalk}
            onMouseLeave={stopTalk}
            onTouchStart={(e) => {
              e.preventDefault();
              startTalk();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopTalk();
            }}
          >
            {isTalking ? "🔊 FALANDO" : "🎙 FALAR"}
          </button>
          <button className="camera-tile__snapshot" title="Salvar foto" onClick={handleSnapshot}>
            📷
          </button>
          <button
            className={`camera-tile__pair ${room ? "is-active" : ""}`}
            title="Assistir remotamente pelo celular"
            onClick={() => setShowPairPanel(true)}
          >
            📡 PAREAR{room && viewerCount > 0 ? ` (${viewerCount})` : ""}
          </button>
          {canFocus && (
            <button className="camera-tile__focus" onClick={onToggleFocus}>
              {isFocused ? "⤢ GRID" : "⤢ FOCAR"}
            </button>
          )}
          <button className="camera-tile__remove" title="Remover câmera" onClick={onRemove}>
            ✕
          </button>
        </div>
      </div>

      {talkError && <div className="camera-tile__talk-error">{talkError}</div>}

      <audio ref={remoteAudioRef} autoPlay style={{ display: "none" }} />

      {showPairPanel && (
        <PairPanel
          cameraLabel={config.label}
          isBroadcasting={!!room}
          onStartBroadcast={setRoom}
          onStopBroadcast={() => setRoom(null)}
          room={room}
          useStun={useStun}
          onToggleStun={() => setUseStun((v) => !v)}
          viewerCount={viewerCount}
          onClose={() => setShowPairPanel(false)}
        />
      )}
    </div>
  );
}
