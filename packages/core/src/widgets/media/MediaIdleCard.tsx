import { Power, Speaker } from "lucide-react";
import type { MouseEvent } from "react";

import { cardShellClass, chipShellClass, cx, useCardDensity } from "../../ui";
import { ChipFace } from "../ChipFace";

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
  const { ref, compact, tight, chip } = useCardDensity();
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
      ref={ref}
      className={cx(
        chip ? chipShellClass : cardShellClass,
        "border-border bg-card text-card-foreground outline-none transition-colors",
        !chip && "items-center justify-center border shadow-sm",
        !chip && (compact ? "p-4" : "p-5"),
        interactive
          ? "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
          : "",
      )}
    >
      {chip ? (
        <ChipFace title={name} status="Idle" icon={Speaker} />
      ) : (
      <>
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        <Speaker className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Nothing playing</p>
      <h3 className="mt-1 font-display text-base font-semibold tracking-tight">
        {name}
      </h3>
      {interactive && powerAction === "turn_on" && !tight ? (
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
      </>
      )}
    </div>
  );
}
