import { Palette } from "lucide-react";

import {
  THEME_OPTIONS,
  type ThemeGroup,
  type ThemeMode,
} from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/theme-store";

const GROUPS: { id: ThemeGroup; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "atmosphere", label: "Atmosphere" },
  { id: "scificn", label: "SCIFICN" },
  { id: "tweakcn", label: "tweakcn" },
];

export function ThemeChooser() {
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
      <span className="sr-only">Theme</span>
      <select
        className="max-w-36 cursor-pointer appearance-none bg-transparent pr-1 font-medium outline-none sm:max-w-none"
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemeMode)}
        aria-label="Choose theme"
      >
        {GROUPS.map((group) => (
          <optgroup key={group.id} label={group.label}>
            {THEME_OPTIONS.filter((option) => option.group === group.id).map(
              (option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ),
            )}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
