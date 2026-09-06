import Ionicons from "@expo/vector-icons/Ionicons";
import { deriveMedia } from "@ethio/ha-sdk";
import { Label, Surface, Text } from "heroui-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";

import { useT } from "@/store/locale-store";
import { Button, Slider, Switch } from "@/ui/haptic";
import { useEntity } from "@/store/use-entity";
import { EntityDetailBody } from "@/widgets/EntityDetailBody";
import { useArtworkUrl } from "@/widgets/media/artwork";
import { MediaArtwork } from "@/widgets/media/MediaArtwork";
import { useMediaControls } from "@/widgets/media/use-media-controls";
import { singleSliderValue } from "@/widgets/types";

const Icon = withUniwind(Ionicons);

function Transport({
  icon,
  label,
  onPress,
  isPrimary = false,
  isDisabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  isPrimary?: boolean;
  isDisabled?: boolean;
}) {
  return (
    <Button
      isIconOnly
      size={isPrimary ? "lg" : "md"}
      variant={isPrimary ? "primary" : "secondary"}
      onPress={onPress}
      isDisabled={isDisabled}
      accessibilityLabel={label}
    >
      <Icon
        name={icon}
        size={isPrimary ? 26 : 20}
        className={isPrimary ? "text-accent-foreground" : "text-foreground"}
      />
    </Button>
  );
}

export function MediaDetailBody({ entityId }: { entityId: string }) {
  const t = useT();
  const entity = useEntity(entityId);
  const view = deriveMedia(entity);
  const artwork = useArtworkUrl(view?.entityPicture);
  const controls = useMediaControls(entityId, view);

  if (!view) {
    return <Text className="text-muted">{t("widget.entityMissing")}</Text>;
  }

  return (
    <View className="gap-6">
      <View className="flex-row items-center gap-4">
        <MediaArtwork uri={artwork} size={80} label={view.title} />
        <View className="flex-1 gap-1">
          <Text
            numberOfLines={2}
            className="text-foreground text-xl font-semibold leading-snug"
          >
            {view.title ?? t("widget.media.nothingPlaying")}
          </Text>
          {view.artist ? (
            <Text numberOfLines={2} className="text-muted text-sm">
              {view.artist}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center justify-center gap-5">
        <Transport
          icon="play-skip-back"
          label={t("widget.media.previous")}
          onPress={() => controls.skip("previous")}
          isDisabled={!view.supportsPrevious}
        />
        <Transport
          icon={controls.isPlaying ? "pause" : "play"}
          label={t("widget.media.playPause")}
          onPress={controls.playPause}
          isPrimary
        />
        <Transport
          icon="play-skip-forward"
          label={t("widget.media.next")}
          onPress={() => controls.skip("next")}
          isDisabled={!view.supportsNext}
        />
      </View>

      {view.supportsVolumeSet ? (
        <Slider
          value={controls.volumePercent}
          onChange={(value) => controls.previewVolume(singleSliderValue(value))}
          onChangeEnd={(value) => controls.setVolume(singleSliderValue(value))}
          minValue={0}
          maxValue={100}
          step={1}
        >
          <View className="mb-2 flex-row items-center justify-between">
            <Label>{t("widget.media.volume")}</Label>
            <Text className="text-muted text-sm">
              {t("widget.volumeValue", { percent: controls.volumePercent })}
            </Text>
          </View>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      ) : null}

      {view.supportsVolumeMute ? (
        <Surface
          variant="secondary"
          className="rounded-inner flex-row items-center justify-between p-4"
        >
          <Label>{t("widget.media.mute")}</Label>
          <Switch
            isSelected={controls.isMuted}
            onSelectedChange={controls.setMuted}
          />
        </Surface>
      ) : null}

      {view.powerAction ? (
        <Surface
          variant="secondary"
          className="rounded-inner flex-row items-center justify-between p-4"
        >
          <Label>{t("widget.media.power")}</Label>
          <Switch
            isSelected={!controls.isOff}
            onSelectedChange={controls.setPower}
          />
        </Surface>
      ) : null}

      <EntityDetailBody entityId={entityId} />
    </View>
  );
}
