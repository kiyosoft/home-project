import "../src/global.css";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useHaStore((state) => state.hydrated);
  const bootstrap = useHaStore((state) => state.bootstrap);
  const hydrateLocale = useLocaleStore((state) => state.hydrate);

  useEffect(() => {
    // Locale first so the Connect screen never flashes the wrong script.
    void hydrateLocale().then(() => bootstrap());
  }, [bootstrap, hydrateLocale]);

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
