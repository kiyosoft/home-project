import { usePathname } from "expo-router";
import { useState } from "react";

import { hasSession, useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { AssistFab } from "@/ui/AssistFab";
import { AssistSheet } from "@/widgets/AssistSheet";

/** Screens outside the tab shell, which have no tab bar and no session yet. */
const SHELL_FREE_ROUTES = new Set(["/", "/connection"]);

/**
 * Owns the floating Assist button and its sheet for the whole tab shell, so a
 * single instance follows the user across Home, Activity and Settings.
 */
export function AssistHost() {
  const status = useHaStore((state) => state.status);
  const mode = useHaStore((state) => state.mode);
  const pathname = usePathname();
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  // The demo client has no assist pipeline, so the button would only ever error.
  const available =
    hasSession(status) && mode === "live" && !SHELL_FREE_ROUTES.has(pathname);

  if (!available) return null;

  return (
    <>
      <AssistFab label={t("assist.open")} onPress={() => setIsOpen(true)} />
      <AssistSheet isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
