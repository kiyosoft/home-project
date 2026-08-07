import type { HassEntity } from "@ethio/ha-sdk";
import { useEntityDetail, useEntityDetailState } from "@ethio/plugin-sdk";

import { Dialog } from "@/components/ui/dialog";
import { t, toIntlLocale, type Locale } from "@/i18n";
import { getFriendlyName, getUnit } from "@/lib/entities";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

const HIDDEN_ATTRS = new Set([
  "friendly_name",
  "unit_of_measurement",
  "entity_picture",
  "icon",
  "supported_features",
  "supported_color_modes",
]);

function formatAttrValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatTimestamp(
  value: string | undefined,
  locale: string,
): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function EntityDetailBody({
  entity,
  locale,
}: {
  entity: HassEntity;
  locale: Locale;
}) {
  const unit = getUnit(entity);
  const unavailable =
    entity.state === "unavailable" || entity.state === "unknown";
  const intlLocale = toIntlLocale(locale);
  const lastChanged = formatTimestamp(entity.last_changed, intlLocale);
  const lastUpdated = formatTimestamp(entity.last_updated, intlLocale);
  const attributeEntries = Object.entries(entity.attributes).filter(
    ([key]) => !HIDDEN_ATTRS.has(key),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            unavailable
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-muted text-foreground"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              unavailable ? "bg-destructive" : "bg-success"
            }`}
          />
          {entity.state}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        {lastChanged ? (
          <div className="rounded-xl bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {t(locale, "entity.lastChanged")}
            </p>
            <p className="mt-0.5 font-medium">{lastChanged}</p>
          </div>
        ) : null}
        {lastUpdated ? (
          <div className="rounded-xl bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {t(locale, "entity.lastUpdated")}
            </p>
            <p className="mt-0.5 font-medium">{lastUpdated}</p>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl bg-muted/40 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {t(locale, "entity.entityId")}
        </p>
        <p className="mt-0.5 break-all font-mono text-xs">{entity.entity_id}</p>
      </div>

      {attributeEntries.length > 0 ? (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t(locale, "entity.attributes")}
          </p>
          <div className="space-y-3">
            {attributeEntries.map(([key, value]) => (
              <div
                key={key}
                className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-xs capitalize text-muted-foreground">
                  {key.replace(/_/g, " ")}
                </span>
                <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground/90">
                  {formatAttrValue(value)}
                </pre>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t(locale, "entity.noAttributes")}
        </p>
      )}
    </div>
  );
}

/** Host entity info sheet (Tunet SensorModal-style attribute dump). */
export function EntityDetailSheet() {
  const locale = useLocaleStore((state) => state.locale);
  const { entityId } = useEntityDetailState();
  const { close } = useEntityDetail();
  const entity = useHaStore((state) =>
    entityId ? state.entities[entityId] : undefined,
  );

  return (
    <Dialog
      open={Boolean(entityId)}
      onClose={close}
      title={entity ? getFriendlyName(entity) : t(locale, "entity.fallbackTitle")}
      description={entityId ?? undefined}
      className="max-w-2xl"
    >
      {entity ? (
        <EntityDetailBody entity={entity} locale={locale} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t(locale, "entity.unavailable")}
        </p>
      )}
    </Dialog>
  );
}
