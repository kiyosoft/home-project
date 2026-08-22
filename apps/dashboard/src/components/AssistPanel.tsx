import { AudioLines, Mic, Send, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useAssistSession, type AssistBubble } from "@/hooks/useAssistSession";
import { usePhoneViewport } from "@/hooks/usePhoneViewport";
import { t } from "@/i18n";
import {
  assistPanelBox,
  type AssistAnchorRect,
} from "@/lib/assist-anchor";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/store/locale-store";

interface AssistPanelProps {
  onClose: () => void;
  anchor: AssistAnchorRect | null;
}

function bubbleRowClass(kind: AssistBubble["kind"]): string {
  if (kind === "user") return "justify-end";
  return "justify-start";
}

function bubbleClass(kind: AssistBubble["kind"]): string {
  if (kind === "user") {
    return "rounded-br-md bg-primary text-primary-foreground";
  }
  if (kind === "error") {
    return "rounded-bl-md border border-destructive/40 bg-destructive/10 text-destructive";
  }
  return "rounded-bl-md bg-muted text-foreground";
}

export function AssistPanel({ onClose, anchor }: AssistPanelProps) {
  const locale = useLocaleStore((state) => state.locale);
  const phone = usePhoneViewport();
  const titleId = useId();
  const endRef = useRef<HTMLDivElement>(null);
  const box = useMemo(() => {
    if (!anchor || typeof window === "undefined") return null;
    return assistPanelBox(anchor, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, [anchor]);
  const {
    messages,
    draft,
    setDraft,
    phase,
    sendText,
    toggleMic,
    wakeAvailable,
    wakeEnabled,
    toggleWake,
  } = useAssistSession();

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, phase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const listening = phase === "listening";
  const waking = phase === "wake";
  const thinking = phase === "thinking";
  const empty = messages.length === 0 && !listening && !thinking;

  const sheet = (
    <section
      id="ethio-assist-panel"
      role="dialog"
      aria-modal={phone}
      aria-labelledby={titleId}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden bg-card/95 text-card-foreground backdrop-blur",
        phone
          ? "h-full w-full"
          : "h-full rounded-2xl border border-border shadow-lg",
      )}
    >
      <header className="flex shrink-0 items-center gap-2 px-3 py-2">
        <h2
          id={titleId}
          className="text-sm font-medium tracking-tight text-foreground"
        >
          {t(locale, "assist.title")}
        </h2>
        {wakeAvailable ? (
          <Button
            type="button"
            variant={wakeEnabled ? "default" : "ghost"}
            size="icon"
            className="ml-auto h-8 w-8"
            aria-pressed={wakeEnabled}
            aria-label={
              wakeEnabled
                ? t(locale, "assist.wakeOnAria")
                : t(locale, "assist.wakeOffAria")
            }
            onClick={toggleWake}
          >
            <AudioLines className="h-4 w-4" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", !wakeAvailable && "ml-auto")}
          aria-label={t(locale, "assist.closeAria")}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-2">
        {empty ? (
          <p className="m-auto max-w-[16rem] text-center text-sm leading-relaxed text-muted-foreground">
            {t(
              locale,
              waking || wakeEnabled ? "assist.emptyWake" : "assist.empty",
            )}
          </p>
        ) : (
          <>
            {messages.map((bubble) => (
              <div
                key={bubble.id}
                className={cn("flex", bubbleRowClass(bubble.kind))}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    bubbleClass(bubble.kind),
                  )}
                >
                  {bubble.text}
                </div>
              </div>
            ))}
            {waking || listening || thinking ? (
              <p className="px-1 text-xs text-muted-foreground">
                {waking
                  ? t(locale, "assist.wake")
                  : listening
                    ? t(locale, "assist.listening")
                    : t(locale, "assist.thinking")}
              </p>
            ) : null}
            <div ref={endRef} />
          </>
        )}
      </div>

      <form
        className="shrink-0 px-3 pb-3 pt-1"
        onSubmit={(event) => {
          event.preventDefault();
          void sendText();
        }}
      >
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-background/70 px-1 py-1">
          <Button
            type="button"
            variant={listening ? "default" : "ghost"}
            size="icon"
            className={cn(
              "h-9 w-9 shrink-0",
              (listening || waking) && "animate-pulse",
            )}
            aria-label={
              listening
                ? t(locale, "assist.micStopAria")
                : t(locale, "assist.micStartAria")
            }
            onClick={() => void toggleMic()}
          >
            <Mic className="h-4 w-4" />
          </Button>
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t(locale, "assist.placeholder")}
            aria-label={t(locale, "assist.placeholder")}
            className="h-9 min-w-0 flex-1 bg-transparent px-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label={t(locale, "assist.sendAria")}
            disabled={!draft.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </section>
  );

  if (phone) {
    return <div className="fixed inset-0 z-[70] flex flex-col bg-card">{sheet}</div>;
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label={t(locale, "assist.closeAria")}
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      <div
        className="fixed z-[80]"
        style={
          box
            ? {
                right: box.right,
                bottom: box.bottom,
                width: box.width,
                height: box.height,
              }
            : {
                right: 16,
                bottom: 72,
                width: 448,
                height: 576,
              }
        }
      >
        {sheet}
      </div>
    </div>
  );
}
