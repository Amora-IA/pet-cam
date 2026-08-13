import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildPixPayload } from "../pix/buildPixPayload";
import { useTranslation } from "../i18n/I18nContext";

const PIX = { key: "beatriz@webne.com.br", name: "Beatriz Amaral", city: "Porto Alegre" };
const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/beatrizamaral";

interface DonateModalProps {
  onClose: () => void;
}

export function DonateModal({ onClose }: DonateModalProps) {
  const { t } = useTranslation();
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string | null>(null);
  const [bmcQrDataUrl, setBmcQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pixPayload = buildPixPayload(PIX);

  useEffect(() => {
    QRCode.toDataURL(pixPayload, { margin: 1, width: 200 })
      .then(setPixQrDataUrl)
      .catch(() => setPixQrDataUrl(null));
  }, [pixPayload]);

  useEffect(() => {
    QRCode.toDataURL(BUY_ME_A_COFFEE_URL, { margin: 1, width: 200 })
      .then(setBmcQrDataUrl)
      .catch(() => setBmcQrDataUrl(null));
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(pixPayload);
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

          <div className="donate-options">
            <div className="donate-option">
              <span className="donate-option__label">{t("donate.pixLabel")}</span>
              {pixQrDataUrl && (
                <img className="pair-panel__qr" src={pixQrDataUrl} alt="QR code Pix" />
              )}
              <p className="modal__hint">{t("donate.scanHint")}</p>
              <code className="pair-panel__url">{PIX.key}</code>
              <button className="modal__submit" onClick={handleCopy}>
                {copied ? t("donate.copied") : t("donate.copy")}
              </button>
            </div>

            <div className="donate-option">
              <span className="donate-option__label">{t("donate.bmcLabel")}</span>
              {bmcQrDataUrl && (
                <img
                  className="pair-panel__qr"
                  src={bmcQrDataUrl}
                  alt="QR code Buy Me a Coffee"
                />
              )}
              <p className="modal__hint">{t("donate.bmcHint")}</p>
              <a
                className="modal__submit donate-option__bmc-link"
                href={BUY_ME_A_COFFEE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("donate.bmcButton")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
