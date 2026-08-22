import { BotMessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AssistPanel } from "@/components/AssistPanel";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import {
  readAnchorRect,
  type AssistAnchorRect,
} from "@/lib/assist-anchor";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

export function AssistHost() {
  const haMode = useHaStore((state) => state.mode);
  const editorMode = useDashboardStore((state) => state.mode);
  const locale = useLocaleStore((state) => state.locale);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<AssistAnchorRect | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const updateAnchor = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    setAnchor(readAnchorRect(el));
  }, []);

  useEffect(() => {
    if (!open) return;
    updateAnchor();
    const onChange = () => updateAnchor();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [open, updateAnchor]);

  if (haMode !== "live" || editorMode === "edit") {
    return null;
  }

  return (
    <>
      {open ? (
        <AssistPanel
          anchor={anchor}
          onClose={() => setOpen(false)}
        />
      ) : null}
      <div className="page-dock pointer-events-none fixed right-0 z-[80]">
        <div ref={wrapRef} className="pointer-events-auto">
          <Button
            type="button"
            size="icon"
            aria-expanded={open}
            aria-controls="ethio-assist-panel"
            aria-label={
              open ? t(locale, "assist.closeAria") : t(locale, "assist.openAria")
            }
            onClick={() => setOpen((current) => !current)}
            className="h-12 w-12 rounded-full shadow-lg"
          >
            <BotMessageSquare className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </>
  );
}
