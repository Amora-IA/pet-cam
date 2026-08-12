export interface ClipRecord {
  id: string;
  cameraId: string;
  cameraLabel: string;
  startedAt: number;
  durationMs: number;
  thumbnail: string; // data URL
  sizeBytes: number;
  reason: "motion" | "manual";
}

export interface ClipWithBlob extends ClipRecord {
  blob: Blob;
}
