import { Speaker } from "lucide-react";

import { resolveEntityImageUrl } from "@ethio/plugin-sdk";

import type { MediaChoice } from "./media-utils";

export function MediaBrowseSection({
  title,
  items,
  baseUrl,
  onPlay,
}: {
  title: string;
  items: MediaChoice[];
  baseUrl: string;
  onPlay: (choice: MediaChoice) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const image = resolveEntityImageUrl(item.image, baseUrl);
          return (
            <li key={`${item.type}:${item.id}`}>
              <button
                type="button"
                onClick={() => onPlay(item)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted"
              >
                {image ? (
                  <img
                    src={image}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Speaker className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.label}
                  </span>
                  {item.source ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.source}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
