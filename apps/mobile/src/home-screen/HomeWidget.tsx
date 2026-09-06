import {
  Button,
  Circle,
  HStack,
  Image,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  background,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  monospacedDigit,
  multilineTextAlignment,
  padding,
  shapes,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import {
  HOME_WIDGET_NAME,
  type AccessoryChip,
  type HomeGlanceProps,
  type SceneChip,
} from "./types";

/**
 * The `'widget'` function is serialized and evaluated in the extension's JS
 * context. Only globals from `@expo/ui` exist there, so this body cannot call
 * helpers from this file or `@/`. Nested functions in this body are fine.
 */
const HomeGlanceView = (
  props: HomeGlanceProps,
  environment: WidgetEnvironment,
) => {
  "widget";
  const dark = environment.colorScheme === "dark";
  const fg = dark ? "#eef6f8" : "#1c1916";
  const muted = dark ? "#9db0b8" : "#6b645b";
  const accent = dark ? "#7dd3c0" : "#0f6b5c";
  const family = environment.widgetFamily ?? "systemMedium";
  const allScenes = props.scenes ?? [];
  const allFavorites = props.favorites ?? [];
  const connected = props.connected === true;
  const openMessage = props.openMessage || "Open Ethio Home";
  const heroValue = props.heroValue || "";
  const heroCaption = props.heroCaption || "";
  const small = family === "systemSmall";
  const large = family === "systemLarge";
  const tileSize = small ? 52 : large ? 48 : 44;

  const grid: AccessoryChip[] = [];
  for (const item of allFavorites) {
    if (grid.length >= 4) break;
    grid.push(item);
  }
  for (const scene of allScenes) {
    if (grid.length >= 4) break;
    grid.push(scene);
  }

  const capsules = allScenes.slice(0, large ? 4 : 0);
  const accessories = large ? allFavorites.slice(0, 4) : grid;

  function isOn(item: AccessoryChip): boolean {
    if (item.action === "scene") {
      return item.running || props.activatedSceneId === item.entityId;
    }
    return item.isOn === true;
  }

  function fillFor(item: AccessoryChip, on: boolean): string {
    if (item.action === "scene") {
      if (on) return "#0f6b5c";
      return dark ? "#3A4550" : "#E8E0D4";
    }
    if (item.domain === "light" && on) return "#F5C542";
    if (item.domain === "fan" && on) return "#3DA9C4";
    if (on) return dark ? "#7dd3c0" : "#0f6b5c";
    return dark ? "#3A4550" : "#E5DFD6";
  }

  function iconFor(item: AccessoryChip, on: boolean): string {
    if (item.action === "scene") {
      if (on) return "#FFFFFF";
      return dark ? "#7dd3c0" : "#0f6b5c";
    }
    if (item.domain === "light" && on) return "#1C1916";
    if (on) return dark ? "#1c1916" : "#FFFFFF";
    return dark ? "#C5D0D6" : "#5C564E";
  }

  function pressItem(item: AccessoryChip): HomeGlanceProps {
    if (item.action === "scene") {
      return {
        ...props,
        activatedSceneId: item.entityId,
        scenes: (props.scenes ?? []).map((entry) =>
          entry.entityId === item.entityId
            ? { ...entry, running: true }
            : entry,
        ),
      };
    }
    return {
      ...props,
      favorites: (props.favorites ?? []).map((entry) =>
        entry.entityId === item.entityId
          ? { ...entry, isOn: !entry.isOn }
          : entry,
      ),
    };
  }

  function accessoryButton(item: AccessoryChip, size: number) {
    const on = isOn(item);
    const fill = fillFor(item, on);
    const icon = iconFor(item, on);
    const label = item.shortName || item.name;
    return (
      <Button
        key={item.entityId}
        target={`${item.action}:${item.entityId}`}
        onPress={() => pressItem(item)}
        modifiers={[buttonStyle("plain"), frame({ maxWidth: Infinity })]}
      >
        <VStack spacing={5} modifiers={[frame({ maxWidth: Infinity })]}>
          <ZStack>
            <Circle
              modifiers={[
                frame({ width: size, height: size }),
                foregroundStyle(fill),
              ]}
            />
            <Image
              systemName={item.sfSymbol}
              color={icon}
              size={Math.round(size * 0.42)}
            />
          </ZStack>
          <Text
            modifiers={[
              font({ size: 11, weight: "medium" }),
              foregroundStyle(muted),
              lineLimit(1),
              multilineTextAlignment("center"),
            ]}
          >
            {label}
          </Text>
        </VStack>
      </Button>
    );
  }

  function sceneCapsule(scene: SceneChip) {
    const on = isOn(scene);
    const fill = fillFor(scene, on);
    const icon = iconFor(scene, on);
    const label =
      on && props.activatedLabel ? props.activatedLabel : scene.shortName || scene.name;
    return (
      <Button
        key={scene.entityId}
        target={`scene:${scene.entityId}`}
        onPress={() => pressItem(scene)}
        modifiers={[buttonStyle("plain")]}
      >
        <HStack
          spacing={6}
          modifiers={[
            padding({ horizontal: 10, vertical: 7 }),
            background(fill, shapes.capsule()),
          ]}
        >
          <Image systemName={scene.sfSymbol} color={icon} size={13} />
          <Text
            modifiers={[
              font({ size: 12, weight: "semibold" }),
              foregroundStyle(on ? "#FFFFFF" : fg),
              lineLimit(1),
            ]}
          >
            {label}
          </Text>
        </HStack>
      </Button>
    );
  }

  function tileGrid(items: AccessoryChip[], size: number) {
    const row0 = items.slice(0, 2);
    const row1 = items.slice(2, 4);
    return (
      <VStack spacing={10} modifiers={[frame({ maxWidth: Infinity })]}>
        {row0.length > 0 ? (
          <HStack spacing={10} modifiers={[frame({ maxWidth: Infinity })]}>
            {row0.map((item) => accessoryButton(item, size))}
          </HStack>
        ) : null}
        {row1.length > 0 ? (
          <HStack spacing={10} modifiers={[frame({ maxWidth: Infinity })]}>
            {row1.map((item) => accessoryButton(item, size))}
          </HStack>
        ) : null}
      </VStack>
    );
  }

  function hero(size: number) {
    return (
      <VStack alignment="leading" spacing={2}>
        <Text
          modifiers={[
            font({ weight: "bold", design: "rounded", size }),
            foregroundStyle(fg),
            monospacedDigit(),
          ]}
        >
          {heroValue || "—"}
        </Text>
        {heroCaption ? (
          <Text
            modifiers={[
              font({ size: 13, weight: "medium" }),
              foregroundStyle(muted),
              lineLimit(2),
            ]}
          >
            {heroCaption}
          </Text>
        ) : null}
      </VStack>
    );
  }

  if (!connected) {
    return (
      <VStack
        spacing={10}
        modifiers={[padding({ all: 14 }), widgetURL("ethiohome://home")]}
      >
        <ZStack>
          <Circle
            modifiers={[
              frame({ width: 56, height: 56 }),
              foregroundStyle(accent),
            ]}
          />
          <Image systemName="house.fill" color={dark ? "#1c1916" : "#FFFFFF"} size={24} />
        </ZStack>
        <Text
          modifiers={[
            font({ weight: "semibold", size: 15 }),
            foregroundStyle(fg),
            multilineTextAlignment("center"),
          ]}
        >
          {openMessage}
        </Text>
      </VStack>
    );
  }

  if (small) {
    if (grid.length === 0) {
      return (
        <VStack
          alignment="leading"
          spacing={4}
          modifiers={[padding({ all: 14 }), widgetURL("ethiohome://home")]}
        >
          {hero(36)}
          <Spacer />
        </VStack>
      );
    }
    // Buttons must not sit under widgetURL: that modifier wins the tap and
    // the companion never receives the App Intent that actually toggles.
    return (
      <VStack modifiers={[padding({ all: 12 })]}>
        {tileGrid(grid, tileSize)}
      </VStack>
    );
  }

  if (large) {
    return (
      <VStack
        alignment="leading"
        spacing={12}
        modifiers={[padding({ all: 14 })]}
      >
        <HStack
          alignment="bottom"
          modifiers={[widgetURL("ethiohome://home")]}
        >
          {hero(38)}
          <Spacer />
          {props.unreadLine ? (
            <Text modifiers={[font({ size: 12, weight: "medium" }), foregroundStyle(accent)]}>
              {props.unreadLine}
            </Text>
          ) : null}
        </HStack>
        {capsules.length > 0 ? (
          <VStack spacing={8}>
            <HStack spacing={8}>
              {capsules.slice(0, 2).map((scene) => sceneCapsule(scene))}
            </HStack>
            {capsules.length > 2 ? (
              <HStack spacing={8}>
                {capsules.slice(2, 4).map((scene) => sceneCapsule(scene))}
              </HStack>
            ) : null}
          </VStack>
        ) : null}
        {accessories.length > 0 ? tileGrid(accessories, tileSize) : null}
        {accessories.length === 0 && capsules.length === 0 && props.summaryLine ? (
          <Text modifiers={[font({ size: 13 }), foregroundStyle(muted), lineLimit(2)]}>
            {props.summaryLine}
          </Text>
        ) : null}
        <Spacer />
      </VStack>
    );
  }

  return (
    <HStack spacing={12} modifiers={[padding({ all: 14 })]}>
      <VStack
        alignment="leading"
        spacing={4}
        modifiers={[
          frame({ maxWidth: Infinity }),
          layoutPriority(1),
          widgetURL("ethiohome://home"),
        ]}
      >
        {hero(34)}
        <Spacer />
        {props.summaryLine && props.summaryLine !== heroCaption ? (
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(2)]}>
            {props.summaryLine}
          </Text>
        ) : null}
      </VStack>
      {grid.length > 0 ? tileGrid(grid, tileSize) : null}
    </HStack>
  );
};

const HomeGlance = createWidget(HOME_WIDGET_NAME, HomeGlanceView);

HomeGlance.updateSnapshot({
  connected: false,
  summaryLine: "",
  heroValue: "",
  heroCaption: "",
  unread: 0,
  unreadLine: "",
  scenes: [],
  favorites: [],
  activatedSceneId: "",
  activatedLabel: "Activated",
  openMessage: "Open Ethio Home",
});

export default HomeGlance;
