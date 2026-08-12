import { forwardRef } from "react";
import { formatTimestamp } from "../hooks/useClock";
import type { CameraStatus } from "../hooks/useCamera";

interface CameraViewProps {
  status: CameraStatus;
  error: string | null;
  isRecording: boolean;
  isMotion: boolean;
  motionLevel: number;
  cameraLabel: string;
  now: Date;
}

export const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(
  ({ status, error, isRecording, isMotion, motionLevel, cameraLabel, now }, ref) => {
    return (
      <div className="camera-view">
        <video ref={ref} className="camera-view__video" autoPlay playsInline muted />

        {status !== "live" && (
          <div className="camera-view__overlay-message">
            {status === "requesting" && <p>SOLICITANDO ACESSO À CÂMERA...</p>}
            {status === "denied" && <p className="camera-view__overlay-error">{error}</p>}
            {status === "error" && <p className="camera-view__overlay-error">{error}</p>}
            {status === "idle" && <p>CÂMERA DESLIGADA</p>}
          </div>
        )}

        <div className="camera-view__scanlines" />
        <div className="camera-view__vignette" />

        <div className="camera-view__corner camera-view__corner--tl" />
        <div className="camera-view__corner camera-view__corner--tr" />
        <div className="camera-view__corner camera-view__corner--bl" />
        <div className="camera-view__corner camera-view__corner--br" />

        <div className="camera-view__top-left">
          <span className="camera-view__cam-label">● {cameraLabel}</span>
        </div>

        <div className="camera-view__top-right">
          {isRecording && (
            <span className="camera-view__rec">
              <span className="camera-view__rec-dot" /> REC
            </span>
          )}
          {status === "live" && !isRecording && (
            <span className="camera-view__standby">MONITORANDO</span>
          )}
        </div>

        <div className="camera-view__bottom-left">
          <span className="camera-view__timestamp">{formatTimestamp(now)}</span>
        </div>

        <div className="camera-view__bottom-right">
          <div className={`camera-view__motion ${isMotion ? "is-active" : ""}`}>
            <span className="camera-view__motion-label">MOV</span>
            <div className="camera-view__motion-bar">
              <div
                className="camera-view__motion-bar-fill"
                style={{ width: `${Math.min(100, motionLevel)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CameraView.displayName = "CameraView";
