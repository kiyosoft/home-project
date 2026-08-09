import { MediaBrowseSection } from "./MediaBrowseSection";
import type { MediaChoice } from "./media-utils";

export function MediaDetailBrowsePanel({
  isMass,
  canBrowse,
  pending,
  showBrowse,
  browseLoading,
  browseError,
  playlists,
  library,
  baseUrl,
  onToggleBrowse,
  onPlay,
}: {
  isMass: boolean;
  canBrowse: boolean;
  pending: boolean;
  showBrowse: boolean;
  browseLoading: boolean;
  browseError: string;
  playlists: MediaChoice[];
  library: MediaChoice[];
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
              ? "Browse Music Assistant playlists and library"
              : canBrowse
                ? "Browse media on this player"
                : "This player does not expose browse_media"}
          </p>
        </div>
        <button
          type="button"
          disabled={!canBrowse || pending}
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
              {playlists.length === 0 && library.length === 0 ? (
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
