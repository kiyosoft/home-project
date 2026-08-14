interface LockLike {
  isLocked: boolean;
  isUnlocked: boolean;
  isLocking: boolean;
  isUnlocking: boolean;
  isJammed: boolean;
}

export interface LockVisuals {
  label: string;
  /** Shackle pose. In-flight states show where the lock is heading. */
  open: boolean;
  jammed: boolean;
  /** True while the lock is mid-travel or its state is unreadable. */
  busy: boolean;
  /** Card surface, as border and background classes. */
  card: string;
  /** Padlock glyph color. */
  glyph: string;
}

/**
 * A lock says one thing at a time, so its state picks a whole look rather than
 * a set of independent tints.
 */
export function lockVisuals(lock: LockLike): LockVisuals {
  if (lock.isJammed) {
    return {
      label: "Jammed",
      open: true,
      jammed: true,
      busy: true,
      card: "border-destructive/40 bg-destructive/10",
      glyph: "text-destructive",
    };
  }

  if (lock.isLocking || lock.isUnlocking) {
    return {
      label: lock.isLocking ? "Locking…" : "Unlocking…",
      open: lock.isUnlocking,
      jammed: false,
      busy: true,
      card: "border-border bg-muted/40",
      glyph: "text-muted-foreground",
    };
  }

  if (lock.isLocked) {
    return {
      label: "Locked",
      open: false,
      jammed: false,
      busy: false,
      card: "border-success/40 bg-success/10",
      glyph: "text-success",
    };
  }

  if (lock.isUnlocked) {
    return {
      label: "Unlocked",
      open: true,
      jammed: false,
      busy: false,
      card: "border-warning/40 bg-warning/10",
      glyph: "text-warning",
    };
  }

  // An unreadable lock stays shut on screen rather than claiming it is open.
  return {
    label: "Unknown",
    open: false,
    jammed: false,
    busy: true,
    card: "border-border bg-card",
    glyph: "text-muted-foreground",
  };
}
