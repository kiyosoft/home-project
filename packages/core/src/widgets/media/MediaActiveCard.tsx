import {
  Pause,
  Play,
  Power,
  SkipBack,
  SkipForward,
  Speaker,
} from "lucide-react";
import type { MouseEvent } from "react";

export function MediaActiveCard({
  name,
  title,
  artist,
  picture,
  coverMode,
  lightOnArt,
  interactive,
  pending,
  isPlaying,
  canPrev,
  canNext,
  powerAction,
  onOpenDetail,
  onPrev,
  onPlayPause,
  onNext,
  onPower,
}: {
  name: string;
  title: string | undefined;
  artist: string | undefined;
  picture: string | null;
  coverMode: boolean;
  lightOnArt: boolean;
  interactive: boolean;
  pending: boolean;
  isPlaying: boolean;
  canPrev: boolean;
  canNext: boolean;
  powerAction: "turn_on" | "turn_off" | null;
  onOpenDetail: () => void;
  onPrev: (event: MouseEvent) => void;
  onPlayPause: (event: MouseEvent) => void;
  onNext: (event: MouseEvent) => void;
  onPower: (event: MouseEvent) => void;
}) {
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onOpenDetail : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpenDetail();
              }
            }
          : undefined
      }
      className={`relative flex h-full min-h-36 flex-col justify-between overflow-hidden rounded-2xl border border-border shadow-sm outline-none transition-colors ${
        interactive
          ? "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
          : ""
      } ${lightOnArt ? "text-white" : "bg-card text-card-foreground"}`}
    >
      {picture ? (
        <>
          <img
            src={picture}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover ${
              coverMode ? "" : "scale-110 blur-xl"
            }`}
          />
          <div
            className={`absolute inset-0 ${
              coverMode
                ? "bg-gradient-to-t from-black/80 via-black/35 to-black/10"
                : "bg-black/45"
            }`}
          />
        </>
      ) : null}

      <div className="relative flex items-start justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <p
            className={`text-xs uppercase tracking-[0.14em] ${
              lightOnArt ? "text-white/70" : "text-muted-foreground"
            }`}
          >
            Media
          </p>
          <h3 className="mt-1 truncate font-display text-base font-semibold tracking-tight">
            {name}
          </h3>
        </div>
        {!coverMode ? (
          picture ? (
            <img
              src={picture}
              alt=""
              className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-md"
            />
          ) : (
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Speaker className="h-4 w-4" />
            </div>
          )
        ) : null}
      </div>

      <div className="relative space-y-1 px-5 pt-4">
        <p className="truncate font-display text-lg font-semibold tracking-tight">
          {title || "Active"}
        </p>
        {artist ? (
          <p
            className={`truncate text-sm ${
              lightOnArt ? "text-white/80" : "text-muted-foreground"
            }`}
          >
            {artist}
          </p>
        ) : null}
      </div>

      {interactive ? (
        <div className="relative mt-auto flex items-center justify-center gap-2 p-5 pt-4">
          {canPrev ? (
            <button
              type="button"
              disabled={pending}
              onClick={onPrev}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                lightOnArt
                  ? "text-white/85 hover:bg-white/15"
                  : "border border-border hover:bg-muted"
              }`}
              aria-label="Previous track"
            >
              <SkipBack className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={onPlayPause}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full shadow-sm transition-transform hover:scale-105 disabled:opacity-50 ${
              coverMode
                ? "border border-white/30 bg-white/20 text-white backdrop-blur-md"
                : "bg-white text-black"
            }`}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 pl-0.5" />
            )}
          </button>
          {canNext ? (
            <button
              type="button"
              disabled={pending}
              onClick={onNext}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                lightOnArt
                  ? "text-white/85 hover:bg-white/15"
                  : "border border-border hover:bg-muted"
              }`}
              aria-label="Next track"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          ) : null}
          {powerAction ? (
            <button
              type="button"
              disabled={pending}
              onClick={onPower}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                lightOnArt
                  ? "text-white/85 hover:bg-white/15"
                  : "border border-border hover:bg-muted"
              }`}
              aria-label={
                powerAction === "turn_off" ? "Power off" : "Power on"
              }
            >
              <Power className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="p-5 pt-4" />
      )}
    </div>
  );
}
