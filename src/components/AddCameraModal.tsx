import { useEffect, useState } from "react";
import { useTranslation } from "../i18n/I18nContext";

interface AddCameraModalProps {
  existingDeviceIds: string[];
  onAdd: (label: string, deviceId: string) => void;
  onClose: () => void;
}

export function AddCameraModal({ existingDeviceIds, onAdd, onClose }: AddCameraModalProps) {
  const { t } = useTranslation();
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
          setLabel(videoInputs[0].label || t("addCamera.fallbackLabel", { n: videoInputs.length }));
        }
      } catch (err) {
        const e = err as DOMException;
        setError(e.message || t("addCamera.listError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDevices();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alreadyAdded = new Set(existingDeviceIds);
  const availableDevices = devices.filter((d) => !alreadyAdded.has(d.deviceId));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span>{t("addCamera.title")}</span>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="modal__body">
          {loading && <p className="modal__hint">{t("addCamera.loading")}</p>}
          {error && <p className="modal__error">{error}</p>}

          {!loading && !error && availableDevices.length === 0 && (
            <p className="modal__hint">{t("addCamera.noneFound")}</p>
          )}

          {!loading && availableDevices.length > 0 && (
            <>
              <label className="modal__field">
                {t("addCamera.device")}
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
                      {d.label || t("addCamera.fallbackLabel", { n: i + 1 })}
                    </option>
                  ))}
                </select>
              </label>

              <label className="modal__field">
                {t("addCamera.name")}
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t("addCamera.namePlaceholder")}
                />
              </label>

              <button
                className="modal__submit"
                onClick={() => {
                  if (selectedDeviceId) onAdd(label, selectedDeviceId);
                }}
              >
                {t("addCamera.submit")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
