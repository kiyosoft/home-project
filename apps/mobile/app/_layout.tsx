import "../src/global.css";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";
import { useThemeStore } from "@/store/theme-store";
import { useConnectionWatch } from "@/store/use-connection-watch";
import { AssistHost } from "@/widgets/AssistHost";
import { DetailSheetProvider } from "@/widgets/DetailSheet";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useHaStore((state) => state.hydrated);
  const bootstrap = useHaStore((state) => state.bootstrap);
  const hydrateLocale = useLocaleStore((state) => state.hydrate);
  const hydrateDashboard = useDashboardStore((state) => state.hydrate);
  const themeHydrated = useThemeStore((state) => state.hydrated);
  const hydrateTheme = useThemeStore((state) => state.hydrate);

  useConnectionWatch();

  useEffect(() => {
    // Locale first so the Connect screen never flashes the wrong script.
    // Theme in parallel so the first frame is already the saved palette.
    void hydrateLocale().then(() => bootstrap());
    void hydrateDashboard();
    void hydrateTheme();
  }, [bootstrap, hydrateLocale, hydrateDashboard, hydrateTheme]);

  useEffect(() => {
    if (hydrated && themeHydrated) void SplashScreen.hideAsync();
  }, [hydrated, themeHydrated]);

  if (!hydrated || !themeHydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider>
          <StatusBar style="auto" />
          <DetailSheetProvider>
            <Stack screenOptions={{ headerShown: false }} />
            <AssistHost />
          </DetailSheetProvider>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
