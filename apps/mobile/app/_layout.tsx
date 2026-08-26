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
import { useConnectionWatch } from "@/store/use-connection-watch";
import { DetailSheetProvider } from "@/widgets/DetailSheet";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useHaStore((state) => state.hydrated);
  const bootstrap = useHaStore((state) => state.bootstrap);
  const hydrateLocale = useLocaleStore((state) => state.hydrate);
  const hydrateDashboard = useDashboardStore((state) => state.hydrate);

  useConnectionWatch();

  useEffect(() => {
    // Locale first so the Connect screen never flashes the wrong script.
    void hydrateLocale().then(() => bootstrap());
    void hydrateDashboard();
  }, [bootstrap, hydrateLocale, hydrateDashboard]);

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider>
          <StatusBar style="auto" />
          <DetailSheetProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </DetailSheetProvider>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
