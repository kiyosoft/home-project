import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { getFriendlyName } from "@/lib/entities";
import { cn } from "@/lib/utils";
import { useHaStore } from "@/store/ha-store";

interface EntityPickerProps {
  value: string;
  onChange: (entityId: string) => void;
  domains?: string[];
}

export function EntityPicker({ value, onChange, domains }: EntityPickerProps) {
  const entities = useHaStore((state) => state.entities);
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    return Object.values(entities)
      .filter((entity) => {
        if (!domains?.length) return true;
        const domain = entity.entity_id.split(".")[0] ?? "";
        return domains.includes(domain);
      })
      .filter((entity) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        const name = getFriendlyName(entity).toLowerCase();
        return name.includes(q) || entity.entity_id.toLowerCase().includes(q);
      })
      .sort((a, b) =>
        getFriendlyName(a).localeCompare(getFriendlyName(b), undefined, {
          sensitivity: "base",
        }),
      );
  }, [entities, domains, query]);

  return (
    <div className="space-y-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search entities…"
      />
      <div className="max-h-56 overflow-y-auto rounded-xl border border-border">
        {options.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            No matching entities
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
