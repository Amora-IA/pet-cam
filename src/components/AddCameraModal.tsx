import { useEffect, useState } from "react";

interface AddCameraModalProps {
  existingDeviceIds: string[];
  onAdd: (label: string, deviceId: string) => void;
  onClose: () => void;
}

export function AddCameraModal({ existingDeviceIds, onAdd, onClose }: AddCameraModalProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDevices() {
      try {
        let list = await navigator.mediaDevices.enumerateDevices();
        const hasLabels = list.some((d) => d.kind === "videoinput" && d.label);
        if (!hasLabels) {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStream.getTracks().forEach((t) => t.stop());
          list = await navigator.mediaDevices.enumerateDevices();
        }
        if (cancelled) return;
        const videoInputs = list.filter((d) => d.kind === "videoinput");
        setDevices(videoInputs);
        if (videoInputs.length > 0) {
          setSelectedDeviceId(videoInputs[0].deviceId);
          setLabel(videoInputs[0].label || `Câmera ${videoInputs.length}`);
        }
      } catch (err) {
        const e = err as DOMException;
        setError(e.message || "Não foi possível listar as câmeras.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDevices();
    return () => {
      cancelled = true;
    };
  }, []);

  const alreadyAdded = new Set(existingDeviceIds);
  const availableDevices = devices.filter((d) => !alreadyAdded.has(d.deviceId));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span>ADICIONAR CÂMERA</span>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="modal__body">
          {loading && <p className="modal__hint">Buscando câmeras disponíveis...</p>}
          {error && <p className="modal__error">{error}</p>}

          {!loading && !error && availableDevices.length === 0 && (
            <p className="modal__hint">
              Nenhuma câmera nova encontrada. Todas as câmeras conectadas já foram adicionadas, ou
              conecte uma webcam USB adicional e tente novamente.
            </p>
          )}

          {!loading && availableDevices.length > 0 && (
            <>
              <label className="modal__field">
                DISPOSITIVO
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    const d = devices.find((dev) => dev.deviceId === e.target.value);
                    if (d) setLabel(d.label || label);
                  }}
                >
                  {availableDevices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Câmera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="modal__field">
                NOME
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Sala, Quintal, Quarto do pet"
                />
              </label>

              <button
                className="modal__submit"
                onClick={() => {
                  if (selectedDeviceId) onAdd(label, selectedDeviceId);
                }}
              >
                ADICIONAR
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
