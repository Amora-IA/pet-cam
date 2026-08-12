import { createStore, set, get, del, keys } from "idb-keyval";
import type { ClipRecord, ClipWithBlob } from "../types/clip";

const store = createStore("pet-cam", "clips");

const META_PREFIX = "meta:";
const BLOB_PREFIX = "blob:";

export async function saveClip(record: ClipRecord, blob: Blob): Promise<void> {
  await set(META_PREFIX + record.id, record, store);
  await set(BLOB_PREFIX + record.id, blob, store);
}

export async function listClips(): Promise<ClipRecord[]> {
  const allKeys = await keys(store);
  const metaKeys = allKeys.filter(
    (k) => typeof k === "string" && k.startsWith(META_PREFIX)
  );
  const records = await Promise.all(
    metaKeys.map((k) => get<ClipRecord>(k as string, store))
  );
  return records
    .filter((r): r is ClipRecord => !!r)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export async function getClipBlob(id: string): Promise<Blob | undefined> {
  return get<Blob>(BLOB_PREFIX + id, store);
}

export async function getClipWithBlob(id: string): Promise<ClipWithBlob | undefined> {
  const [meta, blob] = await Promise.all([
    get<ClipRecord>(META_PREFIX + id, store),
    get<Blob>(BLOB_PREFIX + id, store),
  ]);
  if (!meta || !blob) return undefined;
  return { ...meta, blob };
}

export async function deleteClip(id: string): Promise<void> {
  await Promise.all([
    del(META_PREFIX + id, store),
    del(BLOB_PREFIX + id, store),
  ]);
}

export async function getTotalStorageBytes(): Promise<number> {
  const clips = await listClips();
  return clips.reduce((sum, c) => sum + c.sizeBytes, 0);
}

export async function pruneOldest(maxBytes: number): Promise<void> {
  let clips = await listClips();
  let total = clips.reduce((sum, c) => sum + c.sizeBytes, 0);
  clips = clips.sort((a, b) => a.startedAt - b.startedAt);
  while (total > maxBytes && clips.length > 0) {
    const oldest = clips.shift()!;
    await deleteClip(oldest.id);
    total -= oldest.sizeBytes;
  }
}
