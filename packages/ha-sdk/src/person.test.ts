import { describe, expect, it } from "vitest";

import {
  ARRIVAL_WINDOW_MS,
  firstName,
  latestAccountArrival,
  personDisplayName,
  personForUser,
  shouldShowArrivalWelcome,
} from "./person";
import type { HassEntities, HassEntity } from "./types";

function person(options: {
  id: string;
  state: string;
  userId?: string;
  name?: string;
  lastChanged?: string;
}): HassEntity {
  return {
    entity_id: `person.${options.id}`,
    state: options.state,
    last_changed: options.lastChanged,
    attributes: {
      friendly_name: options.name ?? options.id,
      ...(options.userId ? { user_id: options.userId } : {}),
    },
  };
}

describe("personForUser", () => {
  it("returns the person whose user_id matches", () => {
    const entities: HassEntities = {
      "person.kidus": person({ id: "kidus", state: "home", userId: "u-kidus" }),
      "person.sara": person({ id: "sara", state: "not_home", userId: "u-sara" }),
    };
    expect(personForUser(entities, "u-sara")?.entity_id).toBe("person.sara");
  });

  it("ignores people with no account", () => {
    const entities: HassEntities = {
      "person.guest": person({ id: "guest", state: "home" }),
    };
    expect(personForUser(entities, "u-kidus")).toBeUndefined();
  });
});

describe("shouldShowArrivalWelcome", () => {
  const now = Date.parse("2026-09-01T12:00:00.000Z");

  it("is true when they became home inside the window", () => {
    expect(
      shouldShowArrivalWelcome({
        person: person({
          id: "kidus",
          state: "home",
          userId: "u",
          lastChanged: "2026-09-01T11:50:00.000Z",
        }),
        now,
      }),
    ).toBe(true);
  });

  it("is false when they have been home longer than the window", () => {
    expect(
      shouldShowArrivalWelcome({
        person: person({
          id: "kidus",
          state: "home",
          userId: "u",
          lastChanged: new Date(now - ARRIVAL_WINDOW_MS - 1).toISOString(),
        }),
        now,
      }),
    ).toBe(false);
  });

  it("is false when they are not home", () => {
    expect(
      shouldShowArrivalWelcome({
        person: person({
          id: "kidus",
          state: "not_home",
          userId: "u",
          lastChanged: "2026-09-01T11:50:00.000Z",
        }),
        now,
      }),
    ).toBe(false);
  });

  it("ignores a recovery from unavailable", () => {
    expect(
      shouldShowArrivalWelcome({
        person: person({
          id: "kidus",
          state: "home",
          userId: "u",
          lastChanged: "2026-09-01T11:59:00.000Z",
        }),
        previousState: "unavailable",
        now,
      }),
    ).toBe(false);
  });

  it("needs last_changed", () => {
    expect(
      shouldShowArrivalWelcome({
        person: person({ id: "kidus", state: "home", userId: "u" }),
        now,
      }),
    ).toBe(false);
  });
});

describe("latestAccountArrival", () => {
  const now = Date.parse("2026-09-01T12:00:00.000Z");

  it("picks the newest account-holder who just arrived", () => {
    const entities: HassEntities = {
      "person.kidus": person({
        id: "kidus",
        state: "home",
        userId: "u-kidus",
        name: "Kidus",
        lastChanged: "2026-09-01T11:40:00.000Z",
      }),
      "person.sara": person({
        id: "sara",
        state: "home",
        userId: "u-sara",
        name: "Sara",
        lastChanged: "2026-09-01T11:55:00.000Z",
      }),
      "person.guest": person({
        id: "guest",
        state: "home",
        name: "Guest",
        lastChanged: "2026-09-01T11:59:00.000Z",
      }),
    };
    expect(latestAccountArrival({ entities, now })?.entity_id).toBe(
      "person.sara",
    );
  });

  it("returns nothing when nobody with an account arrived recently", () => {
    const entities: HassEntities = {
      "person.guest": person({
        id: "guest",
        state: "home",
        lastChanged: "2026-09-01T11:59:00.000Z",
      }),
    };
    expect(latestAccountArrival({ entities, now })).toBeUndefined();
  });
});

describe("personDisplayName", () => {
  it("prefers the friendly name", () => {
    expect(
      personDisplayName(person({ id: "kidus", state: "home", name: "Kidus S" })),
    ).toBe("Kidus S");
  });

  it("takes the first name token", () => {
    expect(firstName("Kidus Solomon")).toBe("Kidus");
  });
});
