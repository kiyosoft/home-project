import { describe, expect, it, vi } from "vitest";

import {
  applyHomeWidgetTap,
  collectUpcomingTodos,
  glanceCopyPack,
  glanceHero,
  glanceSummary,
  routeWidgetTap,
  shouldPushHomeSnapshot,
} from "./glance";
import {
  DEFAULT_HERO_METRIC,
  EMPTY_HOME_PROPS,
  EMPTY_ON_BY_DOMAIN,
  type FavoriteChip,
  type HomeGlanceProps,
  type TodoChip,
} from "./types";

const sofa: FavoriteChip = {
  action: "toggle",
  entityId: "light.sofa",
  name: "Sofa",
  shortName: "Sofa",
  domain: "light",
  isOn: false,
  sfSymbol: "lightbulb.fill",
};

const porch: FavoriteChip = {
  action: "toggle",
  entityId: "switch.porch",
  name: "Porch",
  shortName: "Porch",
  domain: "switch",
  isOn: false,
  sfSymbol: "switch.2",
};

const front: FavoriteChip = {
  action: "unlock",
  entityId: "lock.front",
  name: "Front",
  shortName: "Front",
  domain: "lock",
  isOn: true,
  sfSymbol: "lock.fill",
};

function house(overrides: Partial<HomeGlanceProps> = {}): HomeGlanceProps {
  const copy = glanceCopyPack({
    temperatureLabel: "",
    suffix: "",
    heroOff: "All off",
    heroOne: "light on",
    heroMany: "lights on",
    summaryOff: "All lights off",
    summaryOne: "1 light on",
    summaryMany: "{count} lights on",
  });
  return {
    ...EMPTY_HOME_PROPS,
    connected: true,
    onByDomain: { ...EMPTY_ON_BY_DOMAIN },
    heroMetric: DEFAULT_HERO_METRIC,
    copy,
    heroValue: "0",
    heroCaption: "All off",
    summaryLine: "All lights off",
    favorites: [sofa, porch],
    ...overrides,
  };
}

describe("routeWidgetTap", () => {
  it("does not send a second service call after the extension already delivered", () => {
    const dispatch = vi.fn();
    routeWidgetTap("toggle:switch.porch", {
      extensionDelivered: true,
      dispatch,
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("still dispatches when the extension could not reach Home Assistant", () => {
    const dispatch = vi.fn();
    routeWidgetTap("toggle:switch.porch", {
      extensionDelivered: false,
      dispatch,
    });
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledWith("toggle:switch.porch");
  });
});

describe("applyHomeWidgetTap", () => {
  it("flips any favourite chip and bumps that domain's on-count", () => {
    const lit = applyHomeWidgetTap(house(), "toggle:light.sofa");
    expect(lit.favorites[0]?.isOn).toBe(true);
    expect(lit.onByDomain).toEqual({
      light: 1,
      switch: 0,
      input_boolean: 0,
      fan: 0,
    });
    expect(lit.pendingTarget).toBe("toggle:light.sofa");
    expect(glanceHero(lit)).toEqual({ value: "1", caption: "light on" });

    const switched = applyHomeWidgetTap(house(), "toggle:switch.porch");
    expect(switched.favorites[1]?.isOn).toBe(true);
    expect(switched.onByDomain.switch).toBe(1);
    expect(switched.onByDomain.light).toBe(0);
    expect(glanceHero(switched)).toEqual({ value: "0", caption: "All off" });
  });

  it("flips a lock chip without bumping light counts", () => {
    const next = applyHomeWidgetTap(
      house({ favorites: [front, sofa] }),
      "unlock:lock.front",
    );
    expect(next.favorites[0]).toMatchObject({
      entityId: "lock.front",
      isOn: false,
      action: "lock",
      sfSymbol: "lock.open.fill",
    });
    expect(next.onByDomain).toEqual({
      light: 0,
      switch: 0,
      input_boolean: 0,
      fan: 0,
    });
    expect(next.pendingTarget).toBe("unlock:lock.front");
  });

  it("removes the completed to-do from the glance", () => {
    const milk: TodoChip = {
      entityId: "todo.shopping_list",
      uid: "uid-1",
      summary: "Milk",
      listName: "",
    };
    const bread: TodoChip = {
      entityId: "todo.shopping_list",
      uid: "uid-2",
      summary: "Bread",
      listName: "",
    };
    const next = applyHomeWidgetTap(house({ todos: [milk, bread] }), "todo:todo.shopping_list:uid-1");
    expect(next.todos).toEqual([bread]);
    expect(next.pendingTarget).toBe("todo:todo.shopping_list:uid-1");
  });

  it("rebuilds headline copy from the hero metric, not the tapped domain", () => {
    const next = applyHomeWidgetTap(
      house({
        copy: glanceCopyPack({
          temperatureLabel: "21°",
          suffix: "21°",
          heroOff: "All off",
          heroOne: "light on",
          heroMany: "lights on",
          summaryOff: "All lights off",
          summaryOne: "1 light on",
          summaryMany: "{count} lights on",
        }),
      }),
      "toggle:light.sofa",
    );
    expect(glanceHero(next)).toEqual({ value: "21°", caption: "1 light on" });
    expect(glanceSummary(next)).toBe("1 light on · 21°");
  });
});

describe("collectUpcomingTodos", () => {
  it("skips completed items, prefers due dates, and caps at 4", () => {
    expect(
      collectUpcomingTodos([
        {
          entityId: "todo.shopping_list",
          listName: "Shopping",
          items: [
            { uid: "a", summary: "Milk", status: "needs_action" },
            { uid: "b", summary: "Paid", status: "completed" },
            { uid: "c", summary: "Eggs", status: "needs_action", due: "2026-09-20" },
            { uid: "d", summary: "Bread", status: "needs_action" },
          ],
        },
        {
          entityId: "todo.chores",
          listName: "Chores",
          items: [
            { uid: "e", summary: "Vacuum", status: "needs_action", due: "2026-09-18" },
            { uid: "f", summary: "Mop", status: "needs_action" },
            { uid: "g", summary: "Dust", status: "needs_action" },
          ],
        },
      ]),
    ).toEqual([
      {
        entityId: "todo.chores",
        uid: "e",
        summary: "Vacuum",
        listName: "Chores",
        due: "2026-09-18",
      },
      {
        entityId: "todo.shopping_list",
        uid: "c",
        summary: "Eggs",
        listName: "Shopping",
        due: "2026-09-20",
      },
      {
        entityId: "todo.shopping_list",
        uid: "a",
        summary: "Milk",
        listName: "Shopping",
      },
      {
        entityId: "todo.shopping_list",
        uid: "d",
        summary: "Bread",
        listName: "Shopping",
      },
    ]);
  });
});

describe("shouldPushHomeSnapshot", () => {
  it("does not replace a live widget with the sign-in card while reconnecting", () => {
    expect(
      shouldPushHomeSnapshot({
        currentConnected: true,
        nextConnected: false,
        signedOut: false,
      }),
    ).toBe(false);
  });

  it("clears the widget after sign-out", () => {
    expect(
      shouldPushHomeSnapshot({
        currentConnected: true,
        nextConnected: false,
        signedOut: true,
      }),
    ).toBe(true);
  });
});
