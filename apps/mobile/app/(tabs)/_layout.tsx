import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS, Platform } from "react-native";

import { hasSession, useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";

export const unstable_settings = {
  initialRouteName: "home",
};

const { Icon, Label, VectorIcon } = NativeTabs.Trigger;

const tintColor =
  Platform.OS === "ios"
    ? DynamicColorIOS({ light: "#0f6b5c", dark: "#7dd3c0" })
    : "#0f6b5c";

export default function TabLayout() {
  const t = useT();
  const status = useHaStore((state) => state.status);

  if (!hasSession(status)) {
    return <Redirect href="/" />;
  }

  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={tintColor}>
      <NativeTabs.Trigger name="home">
        <Label>{t("tabs.home")}</Label>
        <Icon
          sf={{ default: "house", selected: "house.fill" }}
          src={{
            default: <VectorIcon family={Ionicons} name="home-outline" />,
            selected: <VectorIcon family={Ionicons} name="home" />,
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        <Label>{t("tabs.activity")}</Label>
        <Icon
          sf={{ default: "bell", selected: "bell.fill" }}
          src={{
            default: (
              <VectorIcon family={Ionicons} name="notifications-outline" />
            ),
            selected: <VectorIcon family={Ionicons} name="notifications" />,
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Label>{t("tabs.settings")}</Label>
        <Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          src={{
            default: <VectorIcon family={Ionicons} name="settings-outline" />,
            selected: <VectorIcon family={Ionicons} name="settings" />,
          }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
