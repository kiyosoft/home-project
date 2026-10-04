import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CornerUpLeft,
  Gamepad2,
  Home,
  Minus,
  Plus,
  Power,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";

import {
  deriveRemote,
  fetchEntityPlatform,
  remotePress,
  remoteSeesTv,
  showsTvRemote,
  type RemoteCommand,
} from "@ethio/ha-sdk";
import {
  defineWidget,
  PluginScope,
  useCallService,
  useDetailModal,
  useEntities,
  useEntity,
  usePluginId,
  useSendMessage,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { friendlyName, widgetEntityId, widgetTitle } from "./names";
import { StatusTile } from "./StatusTile";

export const remoteConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

function Key({
  label,
  disabled,
  onClick,
  className,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex size-12 items-center justify-center rounded-full text-foreground hover:bg-foreground/10 active:scale-95 disabled:opacity-50 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function useEntityPlatform(entityId: string): string | undefined {
  const send = useSendMessage();
  const [platform, setPlatform] = useState<string | undefined>();
  useEffect(() => {
    let live = true;
    void fetchEntityPlatform(send, entityId).then((next) => {
      if (live) setPlatform(next);
    });
    return () => {
      live = false;
    };
  }, [entityId, send]);
  return platform;
}

/** Handheld remote for a TV. Hidden for speakers. */
export function RemotePad({ entityId }: { entityId: string }) {
  const entity = useEntity(entityId);
  const entities = useEntities();
  const awake = entity ? remoteSeesTv(entity, entities) : false;
  const platform = useEntityPlatform(entityId);
  const callService = useCallService();
  const [pending, setPending] = useState(false);

  if (!showsTvRemote(entity, entities)) return null;

  async function press(command: RemoteCommand) {
    const call = remotePress(platform, command, entityId);
    if (!call || pending) return;
    setPending(true);
    try {
      await callService(call.domain, call.service, call.data);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-60 flex-col items-center gap-6 rounded-[36px] border border-border bg-card px-6 pt-5 pb-8 text-card-foreground">
      <div className="flex w-full justify-end">
        <Key
          label={awake ? "Power off" : "Power on"}
          disabled={pending}
          onClick={() => void press(awake ? "powerOff" : "power")}
        >
          <Power className="size-5 text-destructive" />
        </Key>
      </div>

      <div className="relative flex size-56 items-center justify-center rounded-full border border-border bg-muted">
        <div className="absolute top-1">
          <Key label="Up" disabled={pending} onClick={() => void press("up")}>
            <ChevronUp className="size-5" />
          </Key>
        </div>
        <div className="absolute bottom-1">
          <Key label="Down" disabled={pending} onClick={() => void press("down")}>
            <ChevronDown className="size-5" />
          </Key>
        </div>
        <div className="absolute left-1">
          <Key label="Left" disabled={pending} onClick={() => void press("left")}>
            <ChevronLeft className="size-5" />
          </Key>
        </div>
        <div className="absolute right-1">
          <Key label="Right" disabled={pending} onClick={() => void press("right")}>
            <ChevronRight className="size-5" />
          </Key>
        </div>
        <Key
          label="OK"
          disabled={pending}
          onClick={() => void press("ok")}
          className="size-16 bg-card text-sm font-semibold"
        >
          OK
        </Key>
      </div>

      <div className="flex w-full justify-between px-2">
        <Key
          label="Back"
          disabled={pending}
          onClick={() => void press("back")}
          className="bg-muted"
        >
          <CornerUpLeft className="size-5" />
        </Key>
        <Key
          label="Home"
          disabled={pending}
          onClick={() => void press("home")}
          className="bg-muted"
        >
          <Home className="size-5" />
        </Key>
      </div>

      <div className="flex flex-col items-center rounded-full border border-border bg-muted py-1">
        <Key
          label="Volume up"
          disabled={pending}
          onClick={() => void press("volumeUp")}
        >
          <Plus className="size-5" />
        </Key>
        <div className="h-px w-6 bg-border" />
        <Key
          label="Volume down"
          disabled={pending}
          onClick={() => void press("volumeDown")}
        >
          <Minus className="size-5" />
        </Key>
      </div>
    </div>
  );
}

function RemoteDetail({ entityId }: { entityId: string }) {
  const entity = useEntity(entityId);
  const view = deriveRemote(entity);
  const callService = useCallService();
  const [pending, setPending] = useState(false);

  if (!view) {
    return <p className="text-sm text-muted-foreground">Entity unavailable</p>;
  }

  return (
    <div className="space-y-4">
      <RemotePad entityId={entityId} />
      {view.activities.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {view.activities.map((activity) => (
            <button
              key={activity}
              type="button"
              disabled={pending}
              aria-pressed={activity === view.activity}
              onClick={() => {
                setPending(true);
                void callService("remote", "turn_on", {
                  entity_id: entityId,
                  activity,
                }).finally(() => setPending(false));
              }}
              className={`rounded-full border px-3 py-1.5 text-sm disabled:opacity-50 ${
                activity === view.activity
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              }`}
            >
              {activity}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RemoteWidget({
  config,
  interactive = true,
}: WidgetComponentProps) {
  const entityId = widgetEntityId(config);
  const customTitle = widgetTitle(config);
  const entity = useEntity(entityId);
  const entities = useEntities();
  const view = deriveRemote(entity);
  const awake = entity ? remoteSeesTv(entity, entities) : false;
  const detailModal = useDetailModal();
  const pluginId = usePluginId();
  const title = customTitle || friendlyName(entity, "Remote");

  function openDetail() {
    if (!interactive || !pluginId || !entityId) return;
    detailModal.open({
      title,
      description: "Remote",
      className: "max-w-lg",
      body: (
        <PluginScope pluginId={pluginId}>
          <RemoteDetail entityId={entityId} />
        </PluginScope>
      ),
    });
  }

  return (
    <StatusTile
      kicker="Remote"
      title={title}
      status={
        !entity
          ? "Unavailable"
          : (view?.activity ?? (awake ? "On" : "Off"))
      }
      icon={Gamepad2}
      active={awake}
      interactive={interactive}
      onClick={openDetail}
    />
  );
}

export const remoteWidget = defineWidget({
  id: "@ethio/core/remote",
  name: "Remote",
  description: "Buttons and activities for a remote",
  component: RemoteWidget,
  configSchema: remoteConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 2, h: 1, minW: 2, minH: 1, maxW: 4, maxH: 3 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 4, h: 3 },
  entityDomains: ["remote"],
  capabilities: ["entity.read", "service.call"],
});
