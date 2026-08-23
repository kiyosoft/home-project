import { Redirect } from "expo-router";
import { Button } from "heroui-native";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { GlassSurface } from "@/ui/GlassSurface";

/**
 * Placeholder for the Overview page. The dashboard document, the tile grid and
 * the add-widget flow are the next slice; this only proves the socket is live.
 */
export default function Home() {
  const t = useT();
  const insets = useSafeAreaInsets();

  const status = useHaStore((state) => state.status);
  const mode = useHaStore((state) => state.mode);
  const entityCount = useHaStore(
    (state) => Object.keys(state.entities).length,
  );
  const disconnect = useHaStore((state) => state.disconnect);

  if (status !== "connected") {
    return <Redirect href="/" />;
  }

  return (
    <View
      className="bg-background flex-1 justify-center gap-5 px-5"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <GlassSurface level="chrome" className="gap-3 p-6">
        <Text className="text-foreground text-[28px] font-bold">
          {mode === "demo"
            ? t("home.placeholderDemo")
            : t("home.placeholderTitle")}
        </Text>
        <Text className="text-muted text-[15px] leading-5">
          {t("home.placeholderBody")}
        </Text>
        <Text className="text-success text-[15px] font-medium">
          {t("home.entityCount", { count: entityCount })}
        </Text>
      </GlassSurface>

      <Button
        variant="danger-soft"
        onPress={() => disconnect({ clearSaved: true })}
      >
        {t("home.disconnect")}
      </Button>
    </View>
  );
}
