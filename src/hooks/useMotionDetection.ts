import { useEffect, useRef, useState } from "react";

interface UseMotionDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  /** 0-100, higher = less sensitive */
  sensitivity?: number;
  /** ms of continued stillness before motion is considered over */
  cooldownMs?: number;
  sampleWidth?: number;
  sampleHeight?: number;
}

export function useMotionDetection({
  videoRef,
  active,
  sensitivity = 25,
  cooldownMs = 2500,
  sampleWidth = 96,
  sampleHeight = 54,
}: UseMotionDetectionOptions) {
  const [motionLevel, setMotionLevel] = useState(0);
  const [isMotion, setIsMotion] = useState(false);
  const lastFrameRef = useRef<Uint8ClampedArray | null>(null);
  const lastMotionAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      lastFrameRef.current = null;
      setMotionLevel(0);
      setIsMotion(false);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const threshold = 255 * (1 - sensitivity / 100) * 0.5;

    const tick = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
        const frame = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;

        if (lastFrameRef.current) {
          const prev = lastFrameRef.current;
          let diffPixels = 0;
          const totalPixels = sampleWidth * sampleHeight;
          for (let i = 0; i < frame.length; i += 4) {
            const dr = Math.abs(frame[i] - prev[i]);
            const dg = Math.abs(frame[i + 1] - prev[i + 1]);
            const db = Math.abs(frame[i + 2] - prev[i + 2]);
            const delta = (dr + dg + db) / 3;
            if (delta > threshold) diffPixels++;
          }
          const level = Math.min(100, Math.round((diffPixels / totalPixels) * 100 * 4));
          setMotionLevel(level);

          const motionDetected = level > 3;
          const now = performance.now();
          if (motionDetected) {
            lastMotionAtRef.current = now;
            setIsMotion(true);
          } else if (now - lastMotionAtRef.current > cooldownMs) {
            setIsMotion(false);
          }
        }
        lastFrameRef.current = frame;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, sensitivity, cooldownMs, sampleWidth, sampleHeight, videoRef]);

  return { motionLevel, isMotion };
}
