import type { ClipRecord } from "../types/clip";
import { formatDuration, formatTimestamp } from "../hooks/useClock";
import { useTranslation } from "../i18n/I18nContext";

interface EventTimelineProps {
  clips: ClipRecord[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  selectedId: string | null;
}

export function EventTimeline({ clips, onSelect, onDelete, selectedId }: EventTimelineProps) {
  const { t } = useTranslation();

  return (
    <aside className="event-timeline">
      <div className="event-timeline__header">
        <span>{t("timeline.header")}</span>
        <span className="event-timeline__count">{clips.length}</span>
      </div>

      {clips.length === 0 && (
        <div className="event-timeline__empty">
          {t("timeline.emptyLine1")}
          <br />
          {t("timeline.emptyLine2")}
        </div>
      )}

      <ul className="event-timeline__list">
        {clips.map((clip) => (
          <li
            key={clip.id}
            className={`event-timeline__item ${selectedId === clip.id ? "is-selected" : ""}`}
            onClick={() => onSelect(clip.id)}
          >
            <div className="event-timeline__thumb">
              {clip.thumbnail ? (
                <img src={clip.thumbnail} alt="" />
              ) : (
                <div className="event-timeline__thumb-placeholder" />
              )}
              <span className="event-timeline__duration">{formatDuration(clip.durationMs)}</span>
            </div>
            <div className="event-timeline__info">
              <span className="event-timeline__time">
                {formatTimestamp(new Date(clip.startedAt))}
              </span>
              <span className="event-timeline__reason">
                {clip.cameraLabel} ·{" "}
                {clip.reason === "motion" ? t("timeline.motionDetected") : t("timeline.manualRecording")}
              </span>
            </div>
            <button
              className="event-timeline__delete"
              title={t("timeline.deleteTitle")}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(clip.id);
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
