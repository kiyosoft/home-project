import type { LucideIcon } from "lucide-react";

import { cx } from "../ui";

export function ChipFace({
  title,
  status,
  icon: Icon,
  active = false,
}: {
  title: string;
  status: string;
  icon?: LucideIcon;
  active?: boolean;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2">
      <span
        className={cx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          active
            ? "bg-primary text-primary-foreground shadow-[0_0_14px_color-mix(in_oklab,var(--primary)_50%,transparent)]"
            : "bg-muted text-foreground",
        )}
      >
        {Icon ? <Icon className="h-4 w-4" /> : null}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] leading-tight text-muted-foreground">
          {title}
        </p>
        <p className="truncate font-display text-[15px] font-semibold leading-tight tracking-tight">
          {status}
        </p>
      </div>
    </div>
  );
}
