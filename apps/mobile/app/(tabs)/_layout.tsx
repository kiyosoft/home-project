import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs } from "expo-router";

import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";

export const unstable_settings = {
  initialRouteName: "home",
};

export default function TabLayout() {
  const t = useT();
  const status = useHaStore((state) => state.status);

  if (status !== "connected") {
    return <Redirect href="/" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="assist"
        options={{
          title: t("tabs.assist"),
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: t("tabs.activity"),
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
