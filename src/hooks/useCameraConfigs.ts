import { useCallback, useEffect, useState } from "react";
import type { CameraConfig } from "../types/camera";

const STORAGE_KEY = "petwatch:cameras";

function load(): CameraConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c: Partial<CameraConfig>) => ({
      id: c.id ?? crypto.randomUUID(),
      label: c.label ?? "Câmera",
      deviceId: c.deviceId ?? "",
      micEnabled: c.micEnabled ?? false,
    }));
  } catch {
    return [];
  }
}

function persist(configs: CameraConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function useCameraConfigs() {
  const [configs, setConfigs] = useState<CameraConfig[]>(() => load());

  useEffect(() => {
    persist(configs);
  }, [configs]);

  const addCamera = useCallback(
    (label: string, deviceId: string) => {
      const config: CameraConfig = {
        id: crypto.randomUUID(),
        label: label.trim() || `Câmera ${configs.length + 1}`,
        deviceId,
        micEnabled: false,
      };
      setConfigs((prev) => [...prev, config]);
      return config;
    },
    [configs.length]
  );

  const removeCamera = useCallback((id: string) => {
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const renameCamera = useCallback((id: string, label: string) => {
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));
  }, []);

  const toggleMic = useCallback((id: string) => {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, micEnabled: !c.micEnabled } : c))
    );
  }, []);

  return { configs, addCamera, removeCamera, renameCamera, toggleMic };
}
