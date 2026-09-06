import { isThemePreference, type ThemePreference } from "@/lib/settings";
import { useT } from "@/store/locale-store";
import { useThemeStore } from "@/store/theme-store";
import { Tabs } from "@/ui/haptic";

const OPTIONS: {
  preference: ThemePreference;
  labelKey:
    | "settings.themeLight"
    | "settings.themeDark"
    | "settings.themeSystem";
}[] = [
  { preference: "light", labelKey: "settings.themeLight" },
  { preference: "dark", labelKey: "settings.themeDark" },
  { preference: "system", labelKey: "settings.themeSystem" },
];

/**
 * Light, Dark, and System sit on one row, same pattern as the language
 * switcher. System is the default so a first launch still follows the phone.
 */
export function ThemeChooser() {
  const t = useT();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  return (
    <Tabs
      value={preference}
      onValueChange={(value) => {
        if (isThemePreference(value)) setPreference(value);
      }}
    >
      <Tabs.List>
        <Tabs.Indicator />
        {OPTIONS.map((option) => (
          <Tabs.Trigger key={option.preference} value={option.preference}>
            <Tabs.Label>{t(option.labelKey)}</Tabs.Label>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
