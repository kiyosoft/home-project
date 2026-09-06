import {
  Button as HeroButton,
  Chip as HeroChip,
  LinkButton as HeroLinkButton,
  ListGroup as HeroListGroup,
  PressableFeedback as HeroPressableFeedback,
  Slider as HeroSlider,
  Switch as HeroSwitch,
  Tabs as HeroTabs,
} from "heroui-native";
import {
  forwardRef,
  useRef,
  type ComponentProps,
  type ComponentRef,
} from "react";

import {
  haptic,
  hapticPressProp,
  hapticSelect,
  sliderTickIndex,
  type HapticKind,
} from "@/lib/haptics";

function sliderNumber(value: number | number[]): number {
  return Array.isArray(value) ? (value[0] ?? 0) : value;
}

type ButtonProps = ComponentProps<typeof HeroButton>;
type ChipProps = ComponentProps<typeof HeroChip>;
type LinkButtonProps = ComponentProps<typeof HeroLinkButton>;
type PressableFeedbackProps = ComponentProps<typeof HeroPressableFeedback> & {
  haptic?: HapticKind | false;
};
type SwitchProps = ComponentProps<typeof HeroSwitch>;
type TabsProps = ComponentProps<typeof HeroTabs>;
type SliderProps = ComponentProps<typeof HeroSlider>;
type ListGroupItemProps = ComponentProps<typeof HeroListGroup.Item>;

const ButtonRoot = forwardRef<ComponentRef<typeof HeroButton>, ButtonProps>(
  function Button({ onPress, onLongPress, isDisabled, ...props }, ref) {
    return (
      <HeroButton
        {...props}
        ref={ref}
        isDisabled={isDisabled}
        onPress={hapticPressProp(onPress, isDisabled, "tap", true)}
        onLongPress={hapticPressProp(onLongPress, isDisabled)}
      />
    );
  },
);

export const Button = Object.assign(ButtonRoot, {
  Label: HeroButton.Label,
  Background: HeroButton.Background,
}) as typeof HeroButton;

const ChipRoot = forwardRef<ComponentRef<typeof HeroChip>, ChipProps>(
  function Chip({ onPress, onLongPress, disabled, ...props }, ref) {
    return (
      <HeroChip
        {...props}
        ref={ref}
        disabled={disabled}
        onPress={hapticPressProp(onPress, disabled)}
        onLongPress={hapticPressProp(onLongPress, disabled)}
      />
    );
  },
);

export const Chip = Object.assign(ChipRoot, {
  Label: HeroChip.Label,
  Background: HeroChip.Background,
}) as typeof HeroChip;

const LinkButtonRoot = forwardRef<
  ComponentRef<typeof HeroLinkButton>,
  LinkButtonProps
>(function LinkButton({ onPress, onLongPress, isDisabled, ...props }, ref) {
  return (
    <HeroLinkButton
      {...props}
      ref={ref}
      isDisabled={isDisabled}
      onPress={hapticPressProp(onPress, isDisabled, "tap", true)}
      onLongPress={hapticPressProp(onLongPress, isDisabled)}
    />
  );
});

export const LinkButton = Object.assign(LinkButtonRoot, {
  Label: HeroLinkButton.Label,
}) as typeof HeroLinkButton;

const PressableFeedbackRoot = forwardRef<
  ComponentRef<typeof HeroPressableFeedback>,
  PressableFeedbackProps
>(function PressableFeedback(
  { onPress, onLongPress, isDisabled, haptic: kind = "tap", ...props },
  ref,
) {
  const hapticKind = kind === false ? undefined : kind;
  return (
    <HeroPressableFeedback
      {...props}
      ref={ref}
      isDisabled={isDisabled}
      onPress={
        hapticKind
          ? hapticPressProp(onPress, isDisabled, hapticKind)
          : onPress
      }
      onLongPress={
        hapticKind
          ? hapticPressProp(onLongPress, isDisabled, hapticKind)
          : onLongPress
      }
    />
  );
});

export const PressableFeedback = Object.assign(PressableFeedbackRoot, {
  Scale: HeroPressableFeedback.Scale,
  Highlight: HeroPressableFeedback.Highlight,
  Ripple: HeroPressableFeedback.Ripple,
});

const SwitchRoot = forwardRef<ComponentRef<typeof HeroSwitch>, SwitchProps>(
  function Switch({ onSelectedChange, isDisabled, ...props }, ref) {
    return (
      <HeroSwitch
        {...props}
        ref={ref}
        isDisabled={isDisabled}
        onSelectedChange={
          onSelectedChange
            ? (next) => {
                if (!isDisabled) haptic("toggle");
                onSelectedChange(next);
              }
            : onSelectedChange
        }
      />
    );
  },
);

export const Switch = Object.assign(SwitchRoot, {
  Thumb: HeroSwitch.Thumb,
  StartContent: HeroSwitch.StartContent,
  EndContent: HeroSwitch.EndContent,
  Background: HeroSwitch.Background,
}) as typeof HeroSwitch;

const TabsRoot = forwardRef<ComponentRef<typeof HeroTabs>, TabsProps>(
  function Tabs({ onValueChange, ...props }, ref) {
    return (
      <HeroTabs
        {...props}
        ref={ref}
        onValueChange={
          onValueChange
            ? (value) => {
                hapticSelect();
                onValueChange(value);
              }
            : onValueChange
        }
      />
    );
  },
);

export const Tabs = Object.assign(TabsRoot, {
  List: HeroTabs.List,
  ListBackground: HeroTabs.ListBackground,
  ScrollView: HeroTabs.ScrollView,
  Trigger: HeroTabs.Trigger,
  Label: HeroTabs.Label,
  Indicator: HeroTabs.Indicator,
  Separator: HeroTabs.Separator,
  Content: HeroTabs.Content,
}) as typeof HeroTabs;

const SliderRoot = forwardRef<ComponentRef<typeof HeroSlider>, SliderProps>(
  function Slider(
    { onChange, onChangeEnd, minValue = 0, maxValue = 100, isDisabled, ...props },
    ref,
  ) {
    const tick = useRef<number | null>(null);
    return (
      <HeroSlider
        {...props}
        ref={ref}
        minValue={minValue}
        maxValue={maxValue}
        isDisabled={isDisabled}
        onChange={
          onChange || !isDisabled
            ? (value) => {
                const index = sliderTickIndex(
                  sliderNumber(value),
                  minValue,
                  maxValue,
                );
                if (!isDisabled && tick.current !== index) {
                  tick.current = index;
                  hapticSelect();
                }
                onChange?.(value);
              }
            : onChange
        }
        onChangeEnd={
          onChangeEnd
            ? (value) => {
                tick.current = null;
                onChangeEnd(value);
              }
            : onChangeEnd
        }
      />
    );
  },
);

export const Slider = Object.assign(SliderRoot, {
  Output: HeroSlider.Output,
  Track: HeroSlider.Track,
  TrackBackground: HeroSlider.TrackBackground,
  Fill: HeroSlider.Fill,
  Thumb: HeroSlider.Thumb,
}) as typeof HeroSlider;

const ListGroupItem = forwardRef<
  ComponentRef<typeof HeroListGroup.Item>,
  ListGroupItemProps
>(function ListGroupItem({ onPress, onLongPress, disabled, ...props }, ref) {
  return (
    <HeroListGroup.Item
      {...props}
      ref={ref}
      disabled={disabled}
      onPress={hapticPressProp(onPress, disabled, "select")}
      onLongPress={hapticPressProp(onLongPress, disabled, "select")}
    />
  );
});

export const ListGroup = Object.assign(
  (props: ComponentProps<typeof HeroListGroup>) => <HeroListGroup {...props} />,
  {
    Item: ListGroupItem,
    ItemPrefix: HeroListGroup.ItemPrefix,
    ItemContent: HeroListGroup.ItemContent,
    ItemTitle: HeroListGroup.ItemTitle,
    ItemDescription: HeroListGroup.ItemDescription,
    ItemSuffix: HeroListGroup.ItemSuffix,
  },
) as typeof HeroListGroup;
