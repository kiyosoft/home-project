import { DetailModalProvider, EntityDetailProvider } from "@ethio/plugin-sdk";
import { LazyMotion, domAnimation } from "motion/react";
import { useEffect, useState } from "react";

import { DashboardRuntime } from "@/components/DashboardRuntime";
import { DetailModalHost } from "@/components/DetailModalHost";
import { EntityDetailSheet } from "@/components/EntityDetailSheet";
import { SetupScreen } from "@/components/SetupScreen";
import { t } from "@/i18n";
import { bootstrapPlugins } from "@/plugins/bootstrap";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";
import { useThemeStore } from "@/store/theme-store";

export default function App() {
  const [ready, setReady] = useState(false);
  const status = useHaStore((state) => state.status);
  const mode = useHaStore((state) => state.mode);
  const entities = useHaStore((state) => state.entities);
  const bootstrap = useHaStore((state) => state.bootstrap);
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const hydrateLocale = useLocaleStore((state) => state.hydrate);
  const locale = useLocaleStore((state) => state.locale);
  const hydrateDashboard = useDashboardStore((state) => state.hydrate);
  const dashboardHydrated = useDashboardStore((state) => state.hydrated);
  const resetSession = useDashboardStore((state) => state.resetSession);

  useEffect(() => {
    hydrateTheme();
    hydrateLocale();
    void bootstrapPlugins()
      .then(() => bootstrap())
      .finally(() => setReady(true));
  }, [bootstrap, hydrateTheme, hydrateLocale]);

  useEffect(() => {
    if (status !== "connected") {
      if (dashboardHydrated) resetSession();
      return;
    }
    if (!ready || dashboardHydrated) return;
    hydrateDashboard({ connectionMode: mode, entities });
  }, [
    ready,
    status,
    mode,
    entities,
    hydrateDashboard,
    dashboardHydrated,
    resetSession,
  ]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {t(locale, "app.starting")}
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <DetailModalProvider>
        <EntityDetailProvider>
          {status === "connected" ? <DashboardRuntime /> : <SetupScreen />}
          <DetailModalHost />
          <EntityDetailSheet />
        </EntityDetailProvider>
      </DetailModalProvider>
    </LazyMotion>
  );
}
