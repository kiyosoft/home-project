import type { TodoItem } from "@ethio/ha-sdk";

import {
  activateScene,
  EMPTY_GLANCE_COPY,
  EMPTY_ON_BY_DOMAIN,
  MAX_TODOS,
  parseWidgetAction,
  toggleFavorite,
  type GlanceCopy,
  type HomeGlanceProps,
  type OnByDomain,
  type TodoChip,
  type ToggleDomain,
} from "./types";

export function emptyOnByDomain(): OnByDomain {
  return { ...EMPTY_ON_BY_DOMAIN };
}

export function bumpOnCount(
  counts: OnByDomain,
  domain: ToggleDomain,
  wasOn: boolean,
): OnByDomain {
  const current = counts[domain] ?? 0;
  return {
    ...counts,
    [domain]: wasOn ? Math.max(0, current - 1) : current + 1,
  };
}

function fillCount(template: string, count: number): string {
  return template.split("{count}").join(String(count));
}

function countCaption(
  count: number,
  off: string,
  one: string,
  many: string,
): string {
  if (count <= 0) return off;
  if (count === 1) return one;
  return fillCount(many, count);
}

function metricCount(props: HomeGlanceProps): number {
  const metric = props.heroMetric;
  return props.onByDomain[metric] ?? 0;
}

export function glanceHero(props: HomeGlanceProps): {
  value: string;
  caption: string;
} {
  const count = metricCount(props);
  const { temperature, heroOff, heroOne, heroMany, summaryOff, summaryOne, summaryMany } =
    props.copy;
  if (temperature) {
    return {
      value: temperature,
      caption: countCaption(count, summaryOff, summaryOne, summaryMany),
    };
  }
  return {
    value: String(count),
    caption: countCaption(count, heroOff, heroOne, heroMany),
  };
}

export function glanceSummary(props: HomeGlanceProps): string {
  const count = metricCount(props);
  const { summaryOff, summaryOne, summaryMany, suffix } = props.copy;
  const lights = countCaption(count, summaryOff, summaryOne, summaryMany);
  if (lights && suffix) return `${lights} · ${suffix}`;
  return lights || suffix;
}

export function collectUpcomingTodos(
  lists: { entityId: string; listName: string; items: TodoItem[] }[],
  limit = MAX_TODOS,
): TodoChip[] {
  const multi =
    lists.filter((list) =>
      list.items.some((item) => item.status === "needs_action"),
    ).length > 1;
  const rows: TodoChip[] = [];
  for (const list of lists) {
    for (const item of list.items) {
      if (item.status === "completed") continue;
      const row: TodoChip = {
        entityId: list.entityId,
        uid: item.uid,
        summary: item.summary,
        listName: multi ? list.listName : "",
      };
      if (item.due) row.due = item.due;
      rows.push(row);
    }
  }
  rows.sort((left, right) => {
    if (left.due && !right.due) return -1;
    if (!left.due && right.due) return 1;
    if (left.due && right.due && left.due !== right.due) {
      return left.due < right.due ? -1 : 1;
    }
    return 0;
  });
  return rows.slice(0, limit);
}

export function paintGlance(props: HomeGlanceProps): HomeGlanceProps {
  const hero = glanceHero(props);
  return {
    ...props,
    heroValue: hero.value,
    heroCaption: hero.caption,
    summaryLine: glanceSummary(props),
  };
}

/**
 * Flip the tapped chip and bump that domain's house-wide on-count.
 * Headline copy is derived from `heroMetric`, not from the tap itself.
 */
export function applyHomeWidgetTap(
  props: HomeGlanceProps,
  target: string,
): HomeGlanceProps {
  const action = parseWidgetAction(target);
  if (!action) return { ...props, pendingTarget: "" };

  if (action.kind === "scene") {
    return paintGlance({
      ...activateScene(props, action.entityId),
      pendingTarget: target,
    });
  }

  if (action.kind === "todo") {
    return paintGlance({
      ...props,
      todos: props.todos.filter(
        (item) =>
          !(item.entityId === action.entityId && item.uid === action.uid),
      ),
      pendingTarget: target,
    });
  }

  const current = props.favorites.find(
    (item) => item.entityId === action.entityId,
  );
  const onByDomain =
    current && current.action === "toggle"
      ? bumpOnCount(props.onByDomain, current.domain, current.isOn)
      : props.onByDomain;

  return paintGlance({
    ...toggleFavorite(props, action.entityId),
    onByDomain,
    pendingTarget: target,
  });
}

export function glanceCopyPack(options: {
  temperatureLabel: string;
  suffix: string;
  heroOff: string;
  heroOne: string;
  heroMany: string;
  summaryOff: string;
  summaryOne: string;
  summaryMany: string;
}): GlanceCopy {
  return {
    ...EMPTY_GLANCE_COPY,
    temperature: options.temperatureLabel,
    suffix: options.suffix,
    heroOff: options.heroOff,
    heroOne: options.heroOne,
    heroMany: options.heroMany,
    summaryOff: options.summaryOff,
    summaryOne: options.summaryOne,
    summaryMany: options.summaryMany,
  };
}

/**
 * The widget extension POSTs `call_service` from the App Intent. JS only
 * retries when that POST never left the device.
 */
export function routeWidgetTap(
  target: string,
  options: { extensionDelivered: boolean; dispatch: (target: string) => void },
): void {
  if (!target || options.extensionDelivered) return;
  options.dispatch(target);
}

export function shouldPushHomeSnapshot(options: {
  currentConnected?: boolean;
  nextConnected: boolean;
  signedOut: boolean;
}): boolean {
  if (options.nextConnected) return true;
  if (!options.currentConnected) return true;
  return options.signedOut;
}
