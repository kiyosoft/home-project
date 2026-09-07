import {
  Circle,
  HStack,
  Image,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import { ACTIVITY_WIDGET_NAME, type ActivityGlanceProps } from "./types";

/**
 * The `'widget'` function is serialized and evaluated in the extension's JS
 * context. Only globals from `@expo/ui` exist there, so this body cannot call
 * helpers from this file or `@/`.
 */
const ActivityGlanceView = (
  props: ActivityGlanceProps,
  environment: WidgetEnvironment,
) => {
  "widget";
  const dark = environment.colorScheme === "dark";
  const fg = dark ? "#eef6f8" : "#1c1916";
  const muted = dark ? "#9db0b8" : "#6b645b";
  const accent = dark ? "#7dd3c0" : "#0f6b5c";
  // iOS 17 hides the widget unless the root adopts containerBackground.
  const canvas = containerBackground(dark ? "#1c1916" : "#F7F3EC", "widget");
  const family = environment.widgetFamily ?? "systemSmall";
  const unread = props.unread ?? 0;
  const unreadLabel = props.unreadLabel || "unread";
  const headline = props.headline || props.openMessage || "Open Ethio Home";
  const count = unread > 99 ? "99+" : String(unread);

  const badge = (
    <ZStack>
      <Circle
        modifiers={[
          frame({ width: 40, height: 40 }),
          foregroundStyle(unread > 0 ? accent : dark ? "#3A4550" : "#E5DFD6"),
        ]}
      />
      <Image
        systemName={unread > 0 ? "bell.fill" : "checkmark"}
        color={
          unread > 0
            ? dark
              ? "#1c1916"
              : "#FFFFFF"
            : dark
              ? "#C5D0D6"
              : "#5C564E"
        }
        size={18}
      />
    </ZStack>
  );

  if (unread <= 0) {
    return (
      <VStack
        spacing={10}
        modifiers={[padding({ all: 14 }), widgetURL("ethiohome://activity"), canvas]}
      >
        {badge}
        <Text
          modifiers={[
            font({ weight: "semibold", size: 15 }),
            foregroundStyle(fg),
          ]}
        >
          {headline}
        </Text>
      </VStack>
    );
  }

  const number = (
    <Text
      modifiers={[
        font({ weight: "bold", design: "rounded", size: family === "systemSmall" ? 40 : 44 }),
        foregroundStyle(fg),
        monospacedDigit(),
      ]}
    >
      {count}
    </Text>
  );

  if (family === "systemSmall") {
    return (
      <VStack
        alignment="leading"
        spacing={2}
        modifiers={[padding({ all: 14 }), widgetURL("ethiohome://activity"), canvas]}
      >
        <HStack>
          <Spacer />
          {badge}
        </HStack>
        {number}
        <Text modifiers={[font({ size: 13, weight: "medium" }), foregroundStyle(muted)]}>
          {unreadLabel}
        </Text>
      </VStack>
    );
  }

  return (
    <HStack
      spacing={12}
      modifiers={[padding({ all: 14 }), widgetURL("ethiohome://activity"), canvas]}
    >
      <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity })]}>
        {number}
        <Text modifiers={[font({ size: 13, weight: "medium" }), foregroundStyle(muted)]}>
          {unreadLabel}
        </Text>
        <Spacer />
        {props.latestTitle ? (
          <Text
            modifiers={[
              font({ size: 13, weight: "medium" }),
              foregroundStyle(fg),
              lineLimit(2),
            ]}
          >
            {props.latestTitle}
          </Text>
        ) : null}
      </VStack>
      <VStack>
        {badge}
        <Spacer />
      </VStack>
    </HStack>
  );
};

const ActivityGlance = createWidget(ACTIVITY_WIDGET_NAME, ActivityGlanceView);

ActivityGlance.updateSnapshot({
  connected: false,
  unread: 0,
  unreadLabel: "unread",
  latestTitle: "",
  headline: "All caught up",
  openMessage: "Open Ethio Home",
});

export default ActivityGlance;
