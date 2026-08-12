import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { useClock } from "./hooks/useClock";
import { useCameraConfigs } from "./hooks/useCameraConfigs";
import { requestNotificationPermission } from "./hooks/useMotionAlert";
import { StatusBar } from "./components/StatusBar";
import { CameraTile } from "./components/CameraTile";
import { AddCameraModal } from "./components/AddCameraModal";
import { EventTimeline } from "./components/EventTimeline";
import { ClipPlayer } from "./components/ClipPlayer";
import { listClips, deleteClip, getTotalStorageBytes } from "./db/clipsDb";
import type { ClipRecord } from "./types/clip";

function App() {
  const now = useClock();
  const { configs, addCamera, removeCamera } = useCameraConfigs();

  const [sensitivity, setSensitivity] = useState(25);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(true);
  const [pushAlertsEnabled, setPushAlertsEnabled] = useState(false);
  const [showAddCamera, setShowAddCamera] = useState(configs.length === 0);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [liveMap, setLiveMap] = useState<Record<string, boolean>>({});

  const [clips, setClips] = useState<ClipRecord[]>([]);
  const [storageBytes, setStorageBytes] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const refreshClips = useCallback(async () => {
    const [list, bytes] = await Promise.all([listClips(), getTotalStorageBytes()]);
    setClips(list);
    setStorageBytes(bytes);
  }, []);

  useEffect(() => {
    refreshClips();
  }, [refreshClips]);

  const handleLiveChange = useCallback((cameraId: string, isLive: boolean) => {
    setLiveMap((prev) => ({ ...prev, [cameraId]: isLive }));
  }, []);

  const handleDeleteClip = useCallback(
    async (id: string) => {
      await deleteClip(id);
      if (selectedClipId === id) setSelectedClipId(null);
      refreshClips();
    },
    [refreshClips, selectedClipId]
  );

  const handleTogglePushAlerts = useCallback(async () => {
    if (!pushAlertsEnabled) {
      const perm = await requestNotificationPermission();
      if (perm === "granted") setPushAlertsEnabled(true);
    } else {
      setPushAlertsEnabled(false);
    }
  }, [pushAlertsEnabled]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;
  const visibleConfigs = focusedId ? configs.filter((c) => c.id === focusedId) : configs;
  const liveCount = configs.filter((c) => liveMap[c.id]).length;

  return (
    <div className="app">
      <StatusBar
        now={now}
        camerasLive={liveCount}
        camerasTotal={configs.length}
        monitoringEnabled={monitoringEnabled}
        onToggleMonitoring={() => setMonitoringEnabled((v) => !v)}
        sensitivity={sensitivity}
        onSensitivityChange={setSensitivity}
        soundAlertsEnabled={soundAlertsEnabled}
        onToggleSoundAlerts={() => setSoundAlertsEnabled((v) => !v)}
        pushAlertsEnabled={pushAlertsEnabled}
        onTogglePushAlerts={handleTogglePushAlerts}
        storageUsedMb={storageBytes / (1024 * 1024)}
        onAddCamera={() => setShowAddCamera(true)}
      />

      <main className="app__main">
        {configs.length === 0 ? (
          <div className="app__empty">
            <p>Nenhuma câmera configurada ainda.</p>
            <button className="app__empty-add" onClick={() => setShowAddCamera(true)}>
              + ADICIONAR PRIMEIRA CÂMERA
            </button>
          </div>
        ) : (
          <div className={`camera-grid camera-grid--count-${visibleConfigs.length}`}>
            {visibleConfigs.map((config) => (
              <CameraTile
                key={config.id}
                config={config}
                now={now}
                sensitivity={sensitivity}
                monitoringEnabled={monitoringEnabled}
                soundAlertsEnabled={soundAlertsEnabled}
                pushAlertsEnabled={pushAlertsEnabled}
                isFocused={focusedId === config.id}
                canFocus={configs.length > 1}
                onToggleFocus={() =>
                  setFocusedId((f) => (f === config.id ? null : config.id))
                }
                onRemove={() => {
                  removeCamera(config.id);
                  if (focusedId === config.id) setFocusedId(null);
                }}
                onClipSaved={() => refreshClips()}
                onLiveChange={handleLiveChange}
              />
            ))}
          </div>
        )}

        <EventTimeline
          clips={clips}
          onSelect={setSelectedClipId}
          onDelete={handleDeleteClip}
          selectedId={selectedClipId}
        />
      </main>

      {showAddCamera && (
        <AddCameraModal
          existingDeviceIds={configs.map((c) => c.deviceId)}
          onAdd={(label, deviceId) => {
            addCamera(label, deviceId);
            setShowAddCamera(false);
          }}
          onClose={() => setShowAddCamera(false)}
        />
      )}

      {selectedClip && (
        <ClipPlayer clip={selectedClip} onClose={() => setSelectedClipId(null)} />
      )}
    </div>
  );
}

export default App;
