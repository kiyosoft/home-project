export const THEME_IDS = [
  "light",
  "dark",
  "amoled",
  "glass",
  "minimal",
  "scifi",
  "star-wars",
  "alien",
  "graphite",
  "darkmatter",
  "nature",
  "sage-garden",
  "ocean-breeze",
  "northern-lights",
  "solar-dusk",
  "amber-minimal",
  "bold-tech",
  "supabase",
  "perpetuity",
  "clean-slate",
  "mono",
  "neo-brutalism",
  "cyberpunk",
  "doom-64",
  "einui-ocean",
  "einui-aurora",
  "einui-forest",
] as const;

export type ThemeMode = (typeof THEME_IDS)[number];

export type ThemeGroup =
  | "default"
  | "atmosphere"
  | "scificn"
  | "tweakcn"
  | "einui";

export interface ThemeOption {
  id: ThemeMode;
  label: string;
  group: ThemeGroup;
  swatch: string;
}

const LIGHT_THEMES = new Set<ThemeMode>([
  "light",
  "minimal",
  "nature",
  "sage-garden",
  "ocean-breeze",
  "amber-minimal",
  "clean-slate",
  "neo-brutalism",
]);

export const THEME_OPTIONS: ThemeOption[] = [
  { id: "light", label: "Light", group: "default", swatch: "#0f6b5c" },
  { id: "dark", label: "Dark", group: "default", swatch: "#3dbaa5" },
  { id: "amoled", label: "AMOLED", group: "atmosphere", swatch: "#5b8cff" },
  { id: "glass", label: "Glass", group: "atmosphere", swatch: "#7dd3c0" },
  { id: "minimal", label: "Minimal", group: "atmosphere", swatch: "#6b7280" },
  { id: "scifi", label: "Sci-Fi", group: "scificn", swatch: "#00ed3f" },
  { id: "star-wars", label: "Star Wars", group: "scificn", swatch: "#1a6dff" },
  { id: "alien", label: "Alien", group: "scificn", swatch: "#E0D5BE" },
  { id: "graphite", label: "Graphite", group: "tweakcn", swatch: "#a0a0a0" },
  { id: "darkmatter", label: "Darkmatter", group: "tweakcn", swatch: "#e78a53" },
  { id: "nature", label: "Nature", group: "tweakcn", swatch: "#2e7d32" },
  {
    id: "sage-garden",
    label: "Sage Garden",
    group: "tweakcn",
    swatch: "#7c9082",
  },
  {
    id: "ocean-breeze",
    label: "Ocean Breeze",
    group: "tweakcn",
    swatch: "#22c55e",
  },
  {
    id: "northern-lights",
    label: "Northern Lights",
    group: "tweakcn",
    swatch: "#34a85a",
  },
  { id: "solar-dusk", label: "Solar Dusk", group: "tweakcn", swatch: "#f97316" },
  {
    id: "amber-minimal",
    label: "Amber Minimal",
    group: "tweakcn",
    swatch: "#f59e0b",
  },
  { id: "bold-tech", label: "Bold Tech", group: "tweakcn", swatch: "#8b5cf6" },
  { id: "supabase", label: "Supabase", group: "tweakcn", swatch: "#72e3ad" },
  { id: "perpetuity", label: "Perpetuity", group: "tweakcn", swatch: "#4de8e8" },
  {
    id: "clean-slate",
    label: "Clean Slate",
    group: "tweakcn",
    swatch: "#6366f1",
  },
  { id: "mono", label: "Mono", group: "tweakcn", swatch: "#737373" },
  {
    id: "neo-brutalism",
    label: "Neo Brutalism",
    group: "tweakcn",
    swatch: "#ff3333",
  },
  { id: "cyberpunk", label: "Cyberpunk", group: "tweakcn", swatch: "#ff00c8" },
  { id: "doom-64", label: "Doom 64", group: "tweakcn", swatch: "#e53935" },
  { id: "einui-ocean", label: "Ocean", group: "einui", swatch: "#22d3ee" },
  { id: "einui-aurora", label: "Aurora", group: "einui", swatch: "#c084fc" },
  { id: "einui-forest", label: "Forest", group: "einui", swatch: "#34d399" },
];

export function isThemeMode(value: string | null): value is ThemeMode {
  return THEME_IDS.includes(value as ThemeMode);
}

export function isLightTheme(theme: ThemeMode): boolean {
  return LIGHT_THEMES.has(theme);
}
