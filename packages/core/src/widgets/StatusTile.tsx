import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cardShellClass, chipShellClass, cx, useCardDensity } from "../ui";
import { cardActivateProps } from "./card-activate";
import { ChipFace } from "./ChipFace";

export interface StatusTileProps {
  kicker: string;
  title: string;
  status: string;
  icon: LucideIcon;
  active?: boolean;
  glowClass?: string;
  interactive?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

export function StatusTile({
  kicker,
  title,
  status,
  icon: Icon,
  active = false,
  glowClass = "text-primary",
  interactive = false,
  onClick,
  children,
}: StatusTileProps) {
  const { ref, compact, tight, chip } = useCardDensity();

  const cardClass = cx(
    chip ? chipShellClass : cardShellClass,
    !chip && "p-4",
    "text-left",
    active
      ? "border-primary/30 bg-primary/15 text-card-foreground"
      : "border-border bg-card text-card-foreground",
    !chip && "border shadow-sm",
    interactive
      ? "cursor-pointer outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
      : "",
  );

  return (
    <div
      ref={ref}
      className={cardClass}
      {...(interactive && onClick ? cardActivateProps(true, onClick) : {})}
    >
      {chip ? (
        <ChipFace
          title={title}
          status={status}
          icon={Icon}
          active={active}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {kicker}
            </p>
            <span
              className={cx(
                "flex items-center justify-center rounded-full",
                compact ? "h-8 w-8" : "h-10 w-10",
                active
                  ? cx("bg-current/15 shadow-[0_0_18px_currentColor]", glowClass)
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className={cx("h-5 w-5", active ? glowClass : "")} />
            </span>
          </div>
          <h3
            className={cx(
              "truncate font-display text-base font-semibold tracking-tight",
              compact ? "mt-2" : "mt-3",
            )}
          >
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{status}</p>
          {tight ? null : children}
        </>
      )}
    </div>
  );
}
