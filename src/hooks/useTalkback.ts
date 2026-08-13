import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/I18nContext";

export function useTalkback() {
  const { t } = useTranslation();
  const [isTalking, setIsTalking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const stop = useCallback(() => {
    sourceRef.current?.disconnect();
    gainRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    setIsTalking(false);
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error(t("talkback.noWebAudio"));
      const ctx = new Ctor();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      gain.gain.value = 1.3;
      source.connect(gain).connect(ctx.destination);
      sourceRef.current = source;
      gainRef.current = gain;
      setIsTalking(true);
    } catch (err) {
      const e = err as DOMException;
      setError(e.message || t("talkback.micDenied"));
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [t]);

  useEffect(() => () => stop(), [stop]);

  return { isTalking, error, start, stop };
}
