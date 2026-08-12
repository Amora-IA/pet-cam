import { useEffect, useRef } from "react";

interface UseMotionAlertOptions {
  isMotion: boolean;
  cameraLabel: string;
  soundEnabled: boolean;
  pushEnabled: boolean;
  cooldownMs?: number;
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new Ctor();
  if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
  return sharedAudioCtx;
}

function playBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + i * 0.14;
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  });
}

function firePushNotification(cameraLabel: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification("PetWatch — movimento detectado", {
      body: `${cameraLabel}: algo se mexeu agora.`,
      tag: "petwatch-motion",
      silent: true,
    });
  } catch {
    // some browsers require a service worker for Notification(); ignore failures
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

export function useMotionAlert({
  isMotion,
  cameraLabel,
  soundEnabled,
  pushEnabled,
  cooldownMs = 30000,
}: UseMotionAlertOptions) {
  const lastAlertAtRef = useRef(0);
  const wasMotionRef = useRef(false);

  useEffect(() => {
    if (isMotion && !wasMotionRef.current) {
      const now = Date.now();
      if (now - lastAlertAtRef.current > cooldownMs) {
        lastAlertAtRef.current = now;
        if (soundEnabled) playBeep();
        if (pushEnabled) firePushNotification(cameraLabel);
      }
    }
    wasMotionRef.current = isMotion;
  }, [isMotion, soundEnabled, pushEnabled, cameraLabel, cooldownMs]);
}
