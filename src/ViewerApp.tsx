import { useEffect, useRef, useState } from "react";
import { useViewerConnection } from "./webrtc/useViewerConnection";
import { formatTimestamp } from "./hooks/useClock";
import { useClock } from "./hooks/useClock";
import "./App.css";
import "./ViewerApp.css";

interface ViewerAppProps {
  initialRoom: string;
  useStun: boolean;
}

export function ViewerApp({ initialRoom, useStun }: ViewerAppProps) {
  const [room, setRoom] = useState(initialRoom);
  const [roomInput, setRoomInput] = useState(initialRoom);
  const now = useClock();
  const videoRef = useRef<HTMLVideoElement>(null);

  const { status, remoteStream, cameraStatus, micError, setTalking } = useViewerConnection({
    room,
    useStun,
  });

  useEffect(() => {
    if (!videoRef.current || !remoteStream) return;
    videoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (!room) {
    return (
      <div className="viewer-join">
        <div className="viewer-join__box">
          <h1>◉ PETWATCH</h1>
          <p>Digite o código de pareamento mostrado no computador da câmera.</p>
          <input
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
            placeholder="EX: A1B2C3"
            maxLength={8}
          />
          <button onClick={() => setRoom(roomInput.trim())} disabled={!roomInput.trim()}>
            CONECTAR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="viewer-app">
      <div className="camera-view">
        <video ref={videoRef} className="camera-view__video" autoPlay playsInline />

        {status !== "connected" && (
          <div className="camera-view__overlay-message">
            <p>
              {status === "connecting" ? "CONECTANDO À CÂMERA..." : "CONEXÃO PERDIDA"}
            </p>
          </div>
        )}

        <div className="camera-view__scanlines" />
        <div className="camera-view__vignette" />
        <div className="camera-view__corner camera-view__corner--tl" />
        <div className="camera-view__corner camera-view__corner--tr" />
        <div className="camera-view__corner camera-view__corner--bl" />
        <div className="camera-view__corner camera-view__corner--br" />

        <div className="camera-view__top-left">
          <span className="camera-view__cam-label">
            ● {cameraStatus?.cameraLabel ?? "PETWATCH"}
          </span>
        </div>

        <div className="camera-view__top-right">
          {cameraStatus?.isRecording && (
            <span className="camera-view__rec">
              <span className="camera-view__rec-dot" /> REC
            </span>
          )}
        </div>

        <div className="camera-view__bottom-left">
          <span className="camera-view__timestamp">{formatTimestamp(now)}</span>
        </div>

        {cameraStatus && (
          <div className="camera-view__bottom-right">
            <div className={`camera-view__motion ${cameraStatus.isMotion ? "is-active" : ""}`}>
              <span className="camera-view__motion-label">MOV</span>
              <div className="camera-view__motion-bar">
                <div
                  className="camera-view__motion-bar-fill"
                  style={{ width: `${Math.min(100, cameraStatus.motionLevel)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="viewer-app__toolbar">
        <span className={`viewer-app__status is-${status}`}>
          {status === "connected" ? "AO VIVO" : status === "connecting" ? "CONECTANDO" : "OFFLINE"}
        </span>
        <button
          className="viewer-app__talk"
          onMouseDown={() => setTalking(true)}
          onMouseUp={() => setTalking(false)}
          onMouseLeave={() => setTalking(false)}
          onTouchStart={(e) => {
            e.preventDefault();
            setTalking(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            setTalking(false);
          }}
          disabled={!!micError}
        >
          🎙 SEGURE PARA FALAR
        </button>
        {micError && <span className="viewer-app__mic-error">{micError}</span>}
      </div>
    </div>
  );
}
