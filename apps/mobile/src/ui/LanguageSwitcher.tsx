import { Tabs } from "heroui-native";

import { isLocale, type Locale } from "@/i18n";
import { useLocaleStore, useT } from "@/store/locale-store";

const OPTIONS: {
  locale: Locale;
  labelKey: "settings.langEn" | "settings.langAm";
}[] = [
  { locale: "en", labelKey: "settings.langEn" },
  { locale: "am", labelKey: "settings.langAm" },
];

export function LanguageSwitcher() {
  const t = useT();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <Tabs
      value={locale}
      onValueChange={(value) => {
        if (isLocale(value)) setLocale(value);
      }}
    >
      <Tabs.List className="self-start">
        <Tabs.Indicator />
        {OPTIONS.map((option) => (
          <Tabs.Trigger key={option.locale} value={option.locale}>
            <Tabs.Label>{t(option.labelKey)}</Tabs.Label>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
