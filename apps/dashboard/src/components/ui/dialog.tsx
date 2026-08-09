import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  footer,
}: DialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const closingRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    if (open) {
      if (!dialog.open) {
        previousActiveRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        dialog.showModal();
      }

      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      const nonCloseTarget = focusables.find(
        (el) => !el.classList.contains("dialog-close"),
      );
      const target = nonCloseTarget ?? focusables[0] ?? dialog;
      target.focus();

      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }

    if (dialog.open) {
      closingRef.current = true;
      dialog.close();
      closingRef.current = false;
    }

    const previous = previousActiveRef.current;
    if (previous) previous.focus();
    return undefined;
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn(
        // Never set display:flex unconditionally — it overrides UA display:none
        // when closed and leaves invisible/visible shells trapping clicks.
        "fixed z-[100] m-0 max-h-[85vh] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-xl open:flex",
        "left-4 right-4 bottom-4 top-auto translate-x-0 translate-y-0",
        "sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
        "[&::backdrop]:bg-black/50 [&::backdrop]:backdrop-blur-sm",
        className,
      )}
      onCancel={(event) => {
        event.preventDefault();
        onCloseRef.current();
      }}
      onClose={() => {
        // Ignore the close event we trigger ourselves when syncing open→false.
        if (closingRef.current) return;
        onCloseRef.current();
      }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2
            id={titleId}
            className="font-display text-lg font-semibold tracking-tight"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="dialog-close"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer ? (
        <div className="border-t border-border px-5 py-3">{footer}</div>
      ) : null}
    </dialog>
  );
}
