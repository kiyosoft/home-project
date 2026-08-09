import { useMemo, useState } from "react";
import type { HassEntity } from "@ethio/ha-sdk";

import { Input } from "@/components/ui/input";
import { t, toIntlLocale } from "@/i18n";
import { getFriendlyName } from "@/lib/entities";
import { cn } from "@/lib/utils";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

interface EntityPickerProps {
  value: string;
  onChange: (entityId: string) => void;
  domains?: string[];
}

export function EntityPicker({ value, onChange, domains }: EntityPickerProps) {
  const locale = useLocaleStore((state) => state.locale);
  const entities = useHaStore((state) => state.entities);
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const domainSet = domains?.length ? new Set(domains) : null;
    const q = query.trim().toLowerCase();
    const next: HassEntity[] = [];
    for (const entity of Object.values(entities)) {
      if (domainSet) {
        const domain = entity.entity_id.split(".")[0] ?? "";
        if (!domainSet.has(domain)) continue;
      }
      if (q) {
        const name = getFriendlyName(entity).toLowerCase();
        if (
          !name.includes(q) &&
          !entity.entity_id.toLowerCase().includes(q)
        ) {
          continue;
        }
      }
      next.push(entity);
    }
    next.sort((a, b) =>
      getFriendlyName(a).localeCompare(
        getFriendlyName(b),
        toIntlLocale(locale),
        { sensitivity: "base" },
      ),
    );
    return next;
  }, [entities, domains, query, locale]);

  return (
    <div className="space-y-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t(locale, "entityPicker.search")}
      />
      <div className="max-h-56 overflow-y-auto rounded-xl border border-border">
        {options.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            {t(locale, "entityPicker.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {options.map((entity) => {
              const selected = entity.entity_id === value;
              return (
                <li key={entity.entity_id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-muted",
                      selected && "bg-primary/10 text-primary",
                    )}
                    onClick={() => onChange(entity.entity_id)}
                  >
                    <span className="font-medium">
                      {getFriendlyName(entity)}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {entity.entity_id}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
