import { useCallback, useEffect, useRef, useState } from "react";
import { saveClip, pruneOldest } from "../db/clipsDb";
import type { ClipRecord } from "../types/clip";

interface UseRecorderOptions {
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isMotion: boolean;
  enabled: boolean;
  cameraId: string;
  cameraLabel: string;
  maxClipMs?: number;
  maxStorageBytes?: number;
  onClipSaved?: (clip: ClipRecord) => void;
}

function pickMimeType(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((c) => window.MediaRecorder?.isTypeSupported?.(c));
}

export function useRecorder({
  stream,
  videoRef,
  isMotion,
  enabled,
  cameraId,
  cameraLabel,
  maxClipMs = 30000,
  maxStorageBytes = 500 * 1024 * 1024,
  onClipSaved,
}: UseRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const maxTimerRef = useRef<number | null>(null);

  const captureThumbnail = useCallback((): string => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return "";
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.6);
  }, [videoRef]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    if (maxTimerRef.current) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(
    (thumbnail: string) => {
      if (!stream || recorderRef.current) return;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const durationMs = Date.now() - startedAtRef.current;
        recorderRef.current = null;
        setIsRecording(false);

        if (blob.size > 1000 && durationMs > 500) {
          const record: ClipRecord = {
            id: crypto.randomUUID(),
            cameraId,
            cameraLabel,
            startedAt: startedAtRef.current,
            durationMs,
            thumbnail,
            sizeBytes: blob.size,
            reason: "motion",
          };
          await saveClip(record, blob);
          await pruneOldest(maxStorageBytes);
          onClipSaved?.(record);
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);

      maxTimerRef.current = window.setTimeout(() => {
        stopRecording();
      }, maxClipMs);
    },
    [stream, cameraId, cameraLabel, maxClipMs, maxStorageBytes, onClipSaved, stopRecording]
  );

  useEffect(() => {
    if (!enabled || !stream) {
      if (recorderRef.current) stopRecording();
      return;
    }
    if (isMotion && !recorderRef.current) {
      startRecording(captureThumbnail());
    } else if (!isMotion && recorderRef.current) {
      stopRecording();
    }
  }, [isMotion, enabled, stream, startRecording, stopRecording, captureThumbnail]);

  useEffect(() => {
    return () => stopRecording();
  }, [stopRecording]);

  return { isRecording };
}
