import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildPixPayload } from "../pix/buildPixPayload";
import { useTranslation } from "../i18n/I18nContext";

const PIX = { key: "beatriz@webne.com.br", name: "Beatriz Amaral", city: "Porto Alegre" };

interface DonateModalProps {
  onClose: () => void;
}

export function DonateModal({ onClose }: DonateModalProps) {
  const { t } = useTranslation();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const payload = buildPixPayload(PIX);

  useEffect(() => {
    QRCode.toDataURL(payload, { margin: 1, width: 240 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [payload]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span>{t("donate.title")}</span>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal__body pair-panel">
          <p className="modal__hint">{t("donate.blurb")}</p>

          {qrDataUrl && <img className="pair-panel__qr" src={qrDataUrl} alt="QR code Pix" />}

          <p className="modal__hint">{t("donate.scanHint")}</p>
          <code className="pair-panel__url">{PIX.key}</code>

          <button className="modal__submit" onClick={handleCopy}>
            {copied ? t("donate.copied") : t("donate.copy")}
          </button>
        </div>
      </div>
    </div>
  );
}
