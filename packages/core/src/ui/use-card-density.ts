import { useElementSize, type ElementSize } from "./use-element-size";

const CARD_COMPACT_HEIGHT = 176;
const CARD_TIGHT_HEIGHT = 140;
const CARD_CHIP_HEIGHT = 96;

export const cardShellClass =
  "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl";

export const chipShellClass =
  "ethio-card-chip flex h-full min-h-0 w-full items-center overflow-hidden rounded-full border px-2.5 shadow-sm";

export interface CardDensity<T extends HTMLElement = HTMLDivElement> {
  ref: (node: T | null) => void;
  size: ElementSize;
  compact: boolean;
  tight: boolean;
  chip: boolean;
}

export function useCardDensity<T extends HTMLElement = HTMLDivElement>(): CardDensity<T> {
  const [ref, size] = useElementSize<T>();
  return {
    ref,
    size,
    compact: size.height > 0 && size.height < CARD_COMPACT_HEIGHT,
    tight: size.height > 0 && size.height < CARD_TIGHT_HEIGHT,
    chip: size.height > 0 && size.height < CARD_CHIP_HEIGHT,
  };
}
