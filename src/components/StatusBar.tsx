import { formatClock } from "../hooks/useClock";

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
}: StatusBarProps) {
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
          SENSIBILIDADE
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
          {soundAlertsEnabled ? "🔔 SOM: ON" : "🔕 SOM: OFF"}
        </button>

        <button
          className={`status-bar__toggle ${pushAlertsEnabled ? "is-on" : ""}`}
          onClick={onTogglePushAlerts}
        >
          {pushAlertsEnabled ? "📲 PUSH: ON" : "📲 PUSH: OFF"}
        </button>

        <button
          className={`status-bar__toggle ${monitoringEnabled ? "is-on" : ""}`}
          onClick={onToggleMonitoring}
        >
          {monitoringEnabled ? "MONITORAMENTO: ON" : "MONITORAMENTO: OFF"}
        </button>

        <button className="status-bar__add-camera" onClick={onAddCamera}>
          + CÂMERA
        </button>
      </div>

      <div className="status-bar__meta">
        <span>{storageUsedMb.toFixed(1)} MB usados</span>
        <span className="status-bar__clock">{formatClock(now)}</span>
      </div>
    </header>
  );
}
