import "../src/global.css";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider, Spinner } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useHomeScreenSync } from "@/home-screen/use-home-screen-sync";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";
import { useNotificationStore } from "@/store/notification-store";
import { useThemeStore } from "@/store/theme-store";
import { useConnectionWatch } from "@/store/use-connection-watch";
import { useNotifySession } from "@/store/use-notify-session";
import { usePushToken } from "@/store/use-push-token";
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
  const hydrateNotifications = useNotificationStore((state) => state.hydrate);

  useConnectionWatch();
  useNotifySession();
  usePushToken();
  useHomeScreenSync();

  useEffect(() => {
    // Locale first so the Connect screen never flashes the wrong script.
    // Theme in parallel so the first frame is already the saved palette.
    void hydrateLocale().then(() => bootstrap());
    void hydrateDashboard();
    void hydrateTheme();
    void hydrateNotifications();
  }, [
    bootstrap,
    hydrateLocale,
    hydrateDashboard,
    hydrateTheme,
    hydrateNotifications,
  ]);

  const ready = hydrated && themeHydrated;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // The providers mount either way, so the wait has somewhere themed to render
  // rather than the empty frame a bare `null` leaves if the splash goes early.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider>
          <StatusBar style="auto" />
          {ready ? (
            <DetailSheetProvider>
              <Stack screenOptions={{ headerShown: false }} />
              <AssistHost />
            </DetailSheetProvider>
          ) : (
            <View className="bg-background flex-1 items-center justify-center">
              <Spinner />
            </View>
          )}
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
