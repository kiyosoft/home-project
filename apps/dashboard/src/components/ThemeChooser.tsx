import { Palette } from "lucide-react";

import { t, type MessageKey } from "@/i18n";
import {
  THEME_OPTIONS,
  type ThemeGroup,
  type ThemeMode,
} from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/store/locale-store";
import { useThemeStore } from "@/store/theme-store";

const GROUPS: { id: ThemeGroup; labelKey: MessageKey }[] = [
  { id: "default", labelKey: "theme.group.default" },
  { id: "atmosphere", labelKey: "theme.group.atmosphere" },
  { id: "scificn", labelKey: "theme.group.scificn" },
  { id: "tweakcn", labelKey: "theme.group.tweakcn" },
  { id: "einui", labelKey: "theme.group.einui" },
];

function themeLabelKey(id: ThemeMode): MessageKey {
  return `theme.${id}` as MessageKey;
}

export function ThemeChooser() {
  const locale = useLocaleStore((state) => state.locale);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const current = THEME_OPTIONS.find((option) => option.id === theme);

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground",
        "focus-within:ring-2 focus-within:ring-ring",
      )}
    >
      <Palette className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
        style={{ backgroundColor: current?.swatch }}
        aria-hidden
      />
      <span className="sr-only">{t(locale, "theme.label")}</span>
      <select
        className="max-w-36 cursor-pointer appearance-none bg-transparent pr-1 font-medium outline-none sm:max-w-none"
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemeMode)}
        aria-label={t(locale, "theme.chooseAria")}
      >
        {GROUPS.map((group) => {
          const options = [];
          for (const option of THEME_OPTIONS) {
            if (option.group !== group.id) continue;
            options.push(
              <option key={option.id} value={option.id}>
                {t(locale, themeLabelKey(option.id))}
              </option>,
            );
          }
          return (
            <optgroup key={group.id} label={t(locale, group.labelKey)}>
              {options}
            </optgroup>
          );
        })}
      </select>
    </label>
  );
}
