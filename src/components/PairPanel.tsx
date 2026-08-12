import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { createRoom, type RoomCredentials } from "../webrtc/createRoom";

interface PairPanelProps {
  cameraLabel: string;
  isBroadcasting: boolean;
  onStartBroadcast: (room: RoomCredentials) => void;
  onStopBroadcast: () => void;
  room: RoomCredentials | null;
  useStun: boolean;
  onToggleStun: () => void;
  viewerCount: number;
  onClose: () => void;
}

/** Public deploys point VITE_SIGNAL_URL at a real host; local/self-hosted runs fall
 *  back to sharing a link built from the LAN IP the signaling server discovers. */
const SIGNAL_URL_CONFIGURED = Boolean(import.meta.env.VITE_SIGNAL_URL);

export function PairPanel({
  cameraLabel,
  isBroadcasting,
  onStartBroadcast,
  onStopBroadcast,
  room,
  useStun,
  onToggleStun,
  viewerCount,
  onClose,
}: PairPanelProps) {
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [lanIp, setLanIp] = useState<string | null>(null);
  const [ipError, setIpError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (SIGNAL_URL_CONFIGURED || !isBroadcasting) return;
    let cancelled = false;
    const base = (import.meta.env.VITE_SIGNAL_URL as string | undefined) ?? "";
    fetch(`${base || `http://${window.location.hostname}:8787`}/lan-ip`)
      .then((r) => r.json())
      .then((data: { ips: string[] }) => {
        if (!cancelled) setLanIp(data.ips[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setIpError(
            "Servidor de sinalização não encontrado. Rode o projeto com `npm run dev:all`."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isBroadcasting]);

  const shareUrl =
    room &&
    (SIGNAL_URL_CONFIGURED
      ? `${window.location.origin}/?room=${room.code}${useStun ? "&stun=1" : ""}`
      : lanIp
        ? `${window.location.protocol}//${lanIp}:5173/?room=${room.code}${useStun ? "&stun=1" : ""}`
        : null);

  useEffect(() => {
    if (!shareUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(shareUrl, { margin: 1, width: 220 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [shareUrl]);

  const handleToggle = async () => {
    if (isBroadcasting) {
      onStopBroadcast();
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const credentials = await createRoom();
      onStartBroadcast(credentials);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Falha ao criar sala.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span>PAREAR — {cameraLabel}</span>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal__body pair-panel">
          <button
            className={`pair-panel__toggle ${isBroadcasting ? "is-on" : ""}`}
            onClick={handleToggle}
            disabled={creating}
          >
            {creating
              ? "CRIANDO SALA..."
              : isBroadcasting
                ? "📡 TRANSMISSÃO: ON"
                : "📡 TRANSMISSÃO: OFF"}
          </button>

          {createError && <p className="modal__error">{createError}</p>}

          {isBroadcasting && room && (
            <>
              <div className="pair-panel__code">{room.code}</div>
              <p className="modal__hint">
                Este código é novo a cada vez que você liga a transmissão e expira sozinho.
              </p>

              {ipError && <p className="modal__error">{ipError}</p>}

              {shareUrl && (
                <>
                  {qrDataUrl && (
                    <img className="pair-panel__qr" src={qrDataUrl} alt="QR code de pareamento" />
                  )}
                  <p className="modal__hint">
                    Escaneie o QR (mesma rede Wi-Fi, ou de qualquer lugar se publicado) ou abra o
                    link:
                  </p>
                  <code className="pair-panel__url">{shareUrl}</code>
                </>
              )}

              <label className="pair-panel__stun">
                <input type="checkbox" checked={useStun} onChange={onToggleStun} />
                Usar STUN público (ajuda em redes mais restritas; contata a internet apenas
                para descobrir o IP — o vídeo continua ponto-a-ponto)
              </label>

              <p className="modal__hint">{viewerCount} dispositivo(s) assistindo agora.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
