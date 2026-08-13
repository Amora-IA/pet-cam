import { formatClock } from "../hooks/useClock";
import { useTranslation } from "../i18n/I18nContext";
import type { Locale } from "../i18n/translations";

interface StatusBarProps {
  now: Date;
  camerasLive: number;
  camerasTotal: number;
  monitoringEnabled: boolean;
  onToggleMonitoring: () => void;
  sensitivity: number;
  onSensitivityChange: (v: number) => void;
  soundAlertsEnabled: boolean;
  onToggleSoundAlerts: () => void;
  pushAlertsEnabled: boolean;
  onTogglePushAlerts: () => void;
  storageUsedMb: number;
  onAddCamera: () => void;
  onDonate: () => void;
}

export function StatusBar({
  now,
  camerasLive,
  camerasTotal,
  monitoringEnabled,
  onToggleMonitoring,
  sensitivity,
  onSensitivityChange,
  soundAlertsEnabled,
  onToggleSoundAlerts,
  pushAlertsEnabled,
  onTogglePushAlerts,
  storageUsedMb,
  onAddCamera,
  onDonate,
}: StatusBarProps) {
  const { t, locale, setLocale } = useTranslation();

  return (
    <header className="status-bar">
      <div className="status-bar__brand">
        <span className="status-bar__logo">◉ PETWATCH</span>
        <span className={`status-bar__pill ${camerasLive > 0 ? "is-live" : "is-off"}`}>
          {camerasLive}/{camerasTotal} ONLINE
        </span>
      </div>

      <div className="status-bar__controls">
        <label className="status-bar__sensitivity">
          {t("statusBar.sensitivity")}
          <input
            type="range"
            min={0}
            max={100}
            value={sensitivity}
            onChange={(e) => onSensitivityChange(Number(e.target.value))}
          />
        </label>

        <button
          className={`status-bar__toggle ${soundAlertsEnabled ? "is-on" : ""}`}
          onClick={onToggleSoundAlerts}
        >
          {soundAlertsEnabled ? t("statusBar.soundOn") : t("statusBar.soundOff")}
        </button>

        <button
          className={`status-bar__toggle ${pushAlertsEnabled ? "is-on" : ""}`}
          onClick={onTogglePushAlerts}
        >
          {pushAlertsEnabled ? t("statusBar.pushOn") : t("statusBar.pushOff")}
        </button>

        <button
          className={`status-bar__toggle ${monitoringEnabled ? "is-on" : ""}`}
          onClick={onToggleMonitoring}
        >
          {monitoringEnabled ? t("statusBar.monitoringOn") : t("statusBar.monitoringOff")}
        </button>

        <button className="status-bar__add-camera" onClick={onAddCamera}>
          {t("statusBar.addCamera")}
        </button>

        <LanguageSwitch locale={locale} onChange={setLocale} />
      </div>

      <div className="status-bar__meta">
        <button className="status-bar__donate" onClick={onDonate}>
          {t("statusBar.donate")}
        </button>
        <span>{t("statusBar.storageUsed", { mb: storageUsedMb.toFixed(1) })}</span>
        <span className="status-bar__clock">{formatClock(now)}</span>
      </div>
    </header>
  );
}

export function LanguageSwitch({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (l: Locale) => void;
}) {
  return (
    <div className="lang-switch">
      <button className={locale === "pt" ? "is-active" : ""} onClick={() => onChange("pt")}>
        PT
      </button>
      <span>/</span>
      <button className={locale === "en" ? "is-active" : ""} onClick={() => onChange("en")}>
        EN
      </button>
    </div>
  );
}
