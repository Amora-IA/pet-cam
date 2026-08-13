import { useEffect, useState } from "react";
import type { ClipRecord } from "../types/clip";
import { getClipBlob } from "../db/clipsDb";
import { formatTimestamp } from "../hooks/useClock";
import { useTranslation } from "../i18n/I18nContext";

interface ClipPlayerProps {
  clip: ClipRecord;
  onClose: () => void;
}

export function ClipPlayer({ clip, onClose }: ClipPlayerProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    getClipBlob(clip.id).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [clip.id]);

  return (
    <div className="clip-player-backdrop" onClick={onClose}>
      <div className="clip-player" onClick={(e) => e.stopPropagation()}>
        <div className="clip-player__header">
          <span>{formatTimestamp(new Date(clip.startedAt))}</span>
          <button onClick={onClose}>✕</button>
        </div>
        {url ? (
          <video src={url} controls autoPlay className="clip-player__video" />
        ) : (
          <div className="clip-player__loading">{t("clipPlayer.loading")}</div>
        )}
      </div>
    </div>
  );
}
