import { MediaBrowseSection } from "./MediaBrowseSection";
import type { MediaChoice } from "./media-utils";

export function MediaDetailBrowsePanel({
  isMass,
  canOpenLibrary,
  pending,
  showBrowse,
  browseLoading,
  browseError,
  playlists,
  library,
  radio,
  radioLabel,
  baseUrl,
  onToggleBrowse,
  onPlay,
}: {
  isMass: boolean;
  canOpenLibrary: boolean;
  pending: boolean;
  showBrowse: boolean;
  browseLoading: boolean;
  browseError: string;
  playlists: MediaChoice[];
  library: MediaChoice[];
  radio: MediaChoice[];
  radioLabel: string;
  baseUrl: string;
  onToggleBrowse: () => void;
  onPlay: (choice: MediaChoice) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Library</p>
          <p className="text-xs text-muted-foreground">
            {isMass
              ? "Browse Music Assistant and Home Assistant radio"
              : canOpenLibrary
                ? "Browse media and Home Assistant radio"
                : "This player cannot play or browse media"}
          </p>
        </div>
        <button
          type="button"
          disabled={!canOpenLibrary || pending}
          onClick={onToggleBrowse}
          className="rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          {showBrowse ? "Hide" : "Choose"}
        </button>
      </div>

      {showBrowse ? (
        <div className="max-h-64 space-y-4 overflow-y-auto rounded-xl border border-border p-3">
          {browseLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {browseError ? (
            <p className="text-sm text-destructive">{browseError}</p>
          ) : null}
          {!browseLoading && !browseError ? (
            <>
              <MediaBrowseSection
                title="Playlists"
                items={playlists}
                baseUrl={baseUrl}
                onPlay={onPlay}
              />
              <MediaBrowseSection
                title="Library"
                items={library}
                baseUrl={baseUrl}
                onPlay={onPlay}
              />
              <MediaBrowseSection
                title={radioLabel ? `Radio · ${radioLabel}` : "Radio"}
                items={radio}
                baseUrl={baseUrl}
                onPlay={onPlay}
              />
              {playlists.length === 0 &&
              library.length === 0 &&
              radio.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No playable media found.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
