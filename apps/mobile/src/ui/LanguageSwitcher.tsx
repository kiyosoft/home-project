import { Pressable, Text, View } from "react-native";

import type { Locale } from "@/i18n";
import { useLocaleStore, useT } from "@/store/locale-store";

import { cn } from "./cn";

const OPTIONS: { locale: Locale; labelKey: "settings.langEn" | "settings.langAm" }[] = [
  { locale: "en", labelKey: "settings.langEn" },
  { locale: "am", labelKey: "settings.langAm" },
];

/**
 * The one place both scripts sit together, per the v1 UI spec. Rendered as a
 * segmented pair rather than a picker so neither language is buried.
 */
export function LanguageSwitcher() {
  const t = useT();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <View className="bg-surface-secondary flex-row gap-1 rounded-inner p-1">
      {OPTIONS.map((option) => {
        const active = locale === option.locale;
        return (
          <Pressable
            key={option.locale}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => setLocale(option.locale)}
            className={cn(
              "min-h-11 justify-center rounded-inner px-4",
              active && "bg-segment",
            )}
          >
            <Text
              className={cn(
                "text-[17px]",
                active ? "text-foreground font-semibold" : "text-muted",
              )}
            >
              {t(option.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
