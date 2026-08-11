import { Shield } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import {
  defineWidget,
  useAlarm,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

export const alarmConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

function statusText(alarm: NonNullable<ReturnType<typeof useAlarm>>): string {
  if (alarm.isTriggered) return "Triggered";
  if (alarm.isPending) return "Pending";
  if (alarm.isArming) return "Arming";
  if (alarm.isDisarming) return "Disarming";
  if (alarm.isDisarmed) return "Disarmed";
  if (alarm.isArmedHome) return "Armed Home";
  if (alarm.isArmedAway) return "Armed Away";
  if (alarm.isArmedNight) return "Armed Night";
  if (alarm.isArmedVacation) return "Armed Vacation";
  if (alarm.isArmedCustomBypass) return "Armed Bypass";
  return alarm.state;
}

function AlarmWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const customTitle =
    typeof config.title === "string" ? config.title.trim() : "";
  const alarm = useAlarm(entityId);
  const [pending, setPending] = useState(false);
  const [code, setCode] = useState("");

  if (!entityId) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">
          {customTitle || "Alarm"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick an alarm panel in settings.
        </p>
      </div>
    );
  }

  if (!alarm) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-dashed border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold">
          {customTitle || entityId}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
    );
  }

  const displayTitle =
    customTitle ||
    (typeof alarm.attributes.friendly_name === "string"
      ? alarm.attributes.friendly_name
      : alarm.entityId);

  async function run(action: () => Promise<void>) {
    if (!interactive || pending) return;
    setPending(true);
    try {
      await action();
      setCode("");
    } finally {
      setPending(false);
    }
  }

  const needsCode = Boolean(alarm.codeFormat);

  return (
    <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Alarm
          </p>
          <h3 className="mt-1 font-display text-base font-semibold tracking-tight">
            {displayTitle}
          </h3>
        </div>
        <div
          className={`rounded-full p-2 ${
            alarm.isTriggered
              ? "bg-destructive/15 text-destructive"
              : alarm.isDisarmed
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-primary/10 text-primary"
          }`}
        >
          <Shield className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
        {statusText(alarm)}
      </p>
      {interactive ? (
        <div className="mt-auto space-y-2 pt-4">
          {needsCode ? (
            <input
              type={alarm.codeFormat === "number" ? "password" : "text"}
              inputMode={alarm.codeFormat === "number" ? "numeric" : "text"}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Code"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || alarm.isDisarmed}
              onClick={() =>
                void run(() => alarm.disarm(code || undefined))
              }
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 text-sm hover:bg-muted disabled:opacity-50"
            >
              Disarm
            </button>
            {alarm.supportsArmHome ? (
              <button
                type="button"
                disabled={pending || alarm.isArmedHome}
                onClick={() =>
                  void run(() => alarm.armHome(code || undefined))
                }
                className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 text-sm hover:bg-muted disabled:opacity-50"
              >
                Home
              </button>
            ) : null}
            {alarm.supportsArmAway ? (
              <button
                type="button"
                disabled={pending || alarm.isArmedAway}
                onClick={() =>
                  void run(() => alarm.armAway(code || undefined))
                }
                className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 text-sm hover:bg-muted disabled:opacity-50"
              >
                Away
              </button>
            ) : null}
            {alarm.supportsArmNight ? (
              <button
                type="button"
                disabled={pending || alarm.isArmedNight}
                onClick={() =>
                  void run(() => alarm.armNight(code || undefined))
                }
                className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 text-sm hover:bg-muted disabled:opacity-50"
              >
                Night
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const alarmWidget = defineWidget({
  id: "@ethio/core/alarm",
  name: "Alarm",
  description: "Arm and disarm an alarm control panel",
  component: AlarmWidget,
  configSchema: alarmConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 4, h: 4, minW: 3, minH: 3, maxW: 8, maxH: 6 },
  minSize: { w: 3, h: 3 },
  maxSize: { w: 8, h: 6 },
  entityDomains: ["alarm_control_panel"],
  capabilities: ["entity.read", "service.call"],
});
