import { t, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/store/locale-store";

const OPTIONS: { id: Locale; labelKey: "settings.langEn" | "settings.langAm" }[] =
  [
    { id: "en", labelKey: "settings.langEn" },
    { id: "am", labelKey: "settings.langAm" },
  ];

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="group">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={cn(
            "rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors",
            locale === option.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted",
          )}
          aria-pressed={locale === option.id}
          onClick={() => setLocale(option.id)}
        >
          {t(locale, option.labelKey)}
        </button>
      ))}
    </div>
  );
}
