import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/I18nContext";

export type CameraStatus = "idle" | "requesting" | "live" | "error" | "denied";

interface UseCameraOptions {
  audio?: boolean;
  deviceId?: string;
}

export function useCamera({ audio = false, deviceId }: UseCameraOptions = {}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "videoinput"));
    } catch {
      // ignore, will surface via getUserMedia error path
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    setStatus("requesting");
    setError(null);
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio,
      });
      streamRef.current = stream;
      setStatus("live");
      await refreshDevices();
    } catch (err) {
      const e = err as DOMException;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setStatus("denied");
        setError(t("camera.errorPermissionDenied"));
      } else if (e.name === "NotFoundError") {
        setStatus("error");
        setError(t("camera.errorNotFound"));
      } else {
        setStatus("error");
        setError(e.message || t("camera.errorGeneric"));
      }
    }
  }, [audio, deviceId, refreshDevices, stop, t]);

  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, audio]);

  useEffect(() => {
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDevices);
  }, [refreshDevices]);

  return {
    stream: streamRef.current,
    status,
    error,
    devices,
    start,
    stop,
  };
}
