import { LinearGradient } from "expo-linear-gradient";
import { PressableFeedback, Text } from "heroui-native";
import { StyleSheet, View } from "react-native";

import type { MessageKey } from "@/i18n";
import { useT } from "@/store/locale-store";
import { GlassSurface } from "@/ui/GlassSurface";
import { CameraStill } from "@/widgets/camera/CameraStill";
import { useCamera } from "@/widgets/camera/use-camera";
import { CameraDetailBody } from "@/widgets/detail/CameraDetailBody";
import type { WidgetBodyProps } from "@/widgets/types";
import { useTile } from "@/widgets/use-tile";

const WASH: [string, string, string] = [
  "transparent",
  "rgba(0,0,0,0.18)",
  "rgba(0,0,0,0.72)",
];

const STATUS_KEYS: Record<string, MessageKey> = {
  on: "widget.state.on",
  off: "widget.state.off",
  idle: "widget.state.idle",
  streaming: "widget.state.streaming",
  recording: "widget.state.recording",
};

export function CameraTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const { entityId, title, unavailable, sheet } = useTile(config);
  const camera = useCamera(entityId);
  const compact = size === "sm";
  const state = camera.view?.state.toLowerCase() ?? "";
  const statusKey = STATUS_KEYS[state];
  const status = unavailable
    ? t("widget.state.unavailable")
    : statusKey
      ? t(statusKey)
      : camera.view?.state;

  const openDetail = () => {
    if (!entityId) return;
    sheet.open({
      title,
      body: <CameraDetailBody entityId={entityId} />,
    });
  };

  return (
    <PressableFeedback
      onPress={openDetail}
      onLongPress={openDetail}
      isDisabled={unavailable}
      accessibilityLabel={status ? `${title}, ${status}` : title}
      className="flex-1"
    >
      <GlassSurface
        level="tile"
        interactive
        className="flex-1 overflow-hidden"
        style={{ minHeight: compact ? 168 : 200 }}
      >
        <CameraStill
          uri={unavailable ? null : camera.stillUrl}
          label={title}
          className="absolute inset-0"
        />
        <LinearGradient
          colors={WASH}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View
          className={`flex-1 justify-end p-4 ${unavailable ? "opacity-50" : ""}`}
        >
          <Text numberOfLines={1} className="text-base font-medium text-white">
            {title}
          </Text>
          {status ? (
            <Text numberOfLines={1} className="text-sm text-white/70">
              {status}
            </Text>
          ) : null}
        </View>
      </GlassSurface>
    </PressableFeedback>
  );
}
