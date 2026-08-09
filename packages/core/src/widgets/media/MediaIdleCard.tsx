import { Power, Speaker } from "lucide-react";
import type { MouseEvent } from "react";

export function MediaIdleCard({
  name,
  interactive,
  pending,
  powerAction,
  onOpenDetail,
  onPowerOn,
}: {
  name: string;
  interactive: boolean;
  pending: boolean;
  powerAction: "turn_on" | "turn_off" | null;
  onOpenDetail: () => void;
  onPowerOn: (event: MouseEvent) => void;
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
      className={`flex h-full min-h-36 flex-col items-center justify-center rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm outline-none transition-colors ${
        interactive
          ? "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
          : ""
      }`}
    >
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        <Speaker className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Nothing playing</p>
      <h3 className="mt-1 font-display text-base font-semibold tracking-tight">
        {name}
      </h3>
      {interactive && powerAction === "turn_on" ? (
        <button
          type="button"
          disabled={pending}
          onClick={onPowerOn}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 text-sm hover:bg-muted disabled:opacity-50"
        >
          <Power className="h-4 w-4" />
          Power on
        </button>
      ) : null}
    </div>
  );
}
