import {
  GlassView as LiquidGlassView,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { GlassView as BlurGlassView } from "heroui-native";
import { createContext, useContext } from "react";
import { View, type ViewProps } from "react-native";
import { withUniwind } from "uniwind";

import { cn } from "./cn";

const LiquidGlass = withUniwind(LiquidGlassView);

/**
 * Concentric radii: floating chrome wraps tiles, tiles wrap their own content.
 * Each level must be smaller than the one containing it or the curves stop
 * looking parallel.
 */
export type GlassLevel = "chrome" | "tile" | "inner";

const RADIUS: Record<GlassLevel, number> = {
  chrome: 28,
  tile: 22,
  inner: 16,
};

/**
 * True once a GlassSurface is on screen. Descendants read this to avoid
 * stacking a second glass material on top of the first.
 */
const InsideGlassContext = createContext(false);

const hasLiquidGlass = isLiquidGlassAvailable();

export interface GlassSurfaceProps extends ViewProps {
  level?: GlassLevel;
  /** iOS 26 only: the material reacts to touch. */
  interactive?: boolean;
  tintColor?: string;
  className?: string;
}

/**
 * The single glass primitive. Renders real Liquid Glass on iOS 26, an
 * expo-blur layer elsewhere, and an opaque surface when nested inside another
 * GlassSurface — glass never stacks on glass.
 */
export function GlassSurface({
  level = "tile",
  interactive = false,
  tintColor,
  className,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const nested = useContext(InsideGlassContext);
  const shape = {
    borderRadius: RADIUS[level],
    borderCurve: "continuous",
  } as const;

  if (nested) {
    return (
      <View
        className={cn("bg-surface overflow-hidden", className)}
        style={[shape, style]}
        {...rest}
      >
        {children}
      </View>
    );
  }

  return (
    <InsideGlassContext.Provider value={true}>
      {hasLiquidGlass ? (
        <LiquidGlass
          isInteractive={interactive}
          tintColor={tintColor}
          className={cn("overflow-hidden", className)}
          style={[shape, style]}
          {...rest}
        >
          {children}
        </LiquidGlass>
      ) : (
        <View
          className={cn("overflow-hidden", className)}
          style={[shape, style]}
          {...rest}
        >
          <BlurGlassView />
          {children}
        </View>
      )}
    </InsideGlassContext.Provider>
  );
}
