import { deriveMedia } from "@ethio/ha-sdk";
import { Text } from "heroui-native";
import { View } from "react-native";

import { useT } from "@/store/locale-store";
import { Slider } from "@/ui/haptic";
import { MediaDetailBody } from "@/widgets/detail/MediaDetailBody";
import { useArtworkUrl } from "@/widgets/media/artwork";
import { MediaArtwork } from "@/widgets/media/MediaArtwork";
import { useMediaControls } from "@/widgets/media/use-media-controls";
import { TileButton } from "@/widgets/TileButton";
import { singleSliderValue, type WidgetBodyProps } from "@/widgets/types";
import { useTile } from "@/widgets/use-tile";
import { WidgetTile } from "@/widgets/WidgetTile";

export function MediaTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const { entityId, entity, title, unavailable, sheet } = useTile(config);
  const view = deriveMedia(entity);
  const artwork = useArtworkUrl(view?.entityPicture);
  const controls = useMediaControls(entityId, view, unavailable);

  const openDetail = () => {
    sheet.open({
      title,
      body: <MediaDetailBody entityId={entityId} />,
    });
  };

  const status = unavailable
    ? t("widget.state.unavailable")
    : controls.isOff
      ? t("widget.state.off")
      : (view?.artist ??
        (controls.isPlaying
          ? t("widget.state.playing")
          : view?.isActive
            ? t("widget.state.paused")
            : t("widget.state.idle")));

  // Off is its own tile: no track, no transport, just a name and a way back on.
  const playing = !unavailable && !controls.isOff;
  const showVolume = size === "md" && (view?.supportsVolumeSet ?? false);

  return (
    <WidgetTile
      title={title}
      status={status}
      icon={unavailable || controls.isOff ? "power" : "musical-notes"}
      size={size}
      active={controls.isPlaying && !unavailable}
      disabled={unavailable}
      onPress={openDetail}
      onLongPress={openDetail}
      onIconPress={
        controls.isOff && view?.powerAction === "turn_on"
          ? () => controls.setPower(true)
          : undefined
      }
      iconLabel={t("widget.media.power")}
      accessory={
        playing ? (
          <MediaArtwork uri={artwork} size={40} label={view?.title} />
        ) : null
      }
    >
      {playing ? (
        <View className="gap-3">
          <Text
            numberOfLines={1}
            className="text-foreground text-xl font-semibold"
          >
            {view?.title ?? t("widget.media.nothingPlaying")}
          </Text>

          <View className="flex-row items-center gap-3">
            <TileButton
              icon="play"
              label={t("widget.media.play")}
              onPress={controls.play}
              disabled={unavailable}
            />
            <TileButton
              icon="pause"
              label={t("widget.media.pause")}
              onPress={controls.pause}
              disabled={unavailable}
            />
            {size === "md" && view?.supportsPrevious ? (
              <TileButton
                icon="play-skip-back"
                label={t("widget.media.previous")}
                onPress={() => controls.skip("previous")}
                disabled={unavailable}
              />
            ) : null}
            {size === "md" && view?.supportsNext ? (
              <TileButton
                icon="play-skip-forward"
                label={t("widget.media.next")}
                onPress={() => controls.skip("next")}
                disabled={unavailable}
              />
            ) : null}
            {showVolume ? (
              <View className="flex-1">
                <Slider
                  value={controls.volumePercent}
                  onChange={(value) =>
                    controls.previewVolume(singleSliderValue(value))
                  }
                  onChangeEnd={(value) =>
                    controls.setVolume(singleSliderValue(value))
                  }
                  minValue={0}
                  maxValue={100}
                  step={1}
                  isDisabled={unavailable}
                  accessibilityLabel={t("widget.media.volume")}
                >
                  <Slider.Track>
                    <Slider.Fill />
                    <Slider.Thumb />
                  </Slider.Track>
                </Slider>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </WidgetTile>
  );
}
