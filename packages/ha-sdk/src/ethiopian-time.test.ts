import { describe, expect, it } from "vitest";

import { secondProgress, clockFace, toEthiopianClock } from "./ethiopian-time";

function at(hours: number, minutes = 0, seconds = 0): Date {
  return new Date(2026, 8, 2, hours, minutes, seconds);
}

describe("toEthiopianClock", () => {
  it("counts from 06:00 as 12 ቀን", () => {
    expect(toEthiopianClock(at(6))).toEqual({
      hours: 12,
      minutes: 0,
      seconds: 0,
      period: "day",
    });
  });

  it("maps 07:00 to 1 ቀን", () => {
    expect(toEthiopianClock(at(7, 5, 9))).toMatchObject({
      hours: 1,
      minutes: 5,
      seconds: 9,
      period: "day",
    });
  });

  it("maps noon to 6 ቀን", () => {
    expect(toEthiopianClock(at(12)).hours).toBe(6);
    expect(toEthiopianClock(at(12)).period).toBe("day");
  });

  it("counts from 18:00 as 12 ሌሊት", () => {
    expect(toEthiopianClock(at(18))).toEqual({
      hours: 12,
      minutes: 0,
      seconds: 0,
      period: "night",
    });
  });

  it("maps 19:00 to 1 ሌሊት", () => {
    expect(toEthiopianClock(at(19)).hours).toBe(1);
    expect(toEthiopianClock(at(19)).period).toBe("night");
  });

  it("maps midnight to 6 ሌሊት", () => {
    expect(toEthiopianClock(at(0)).hours).toBe(6);
    expect(toEthiopianClock(at(0)).period).toBe("night");
  });
});

describe("secondProgress", () => {
  it("is 0 at the start of a minute", () => {
    expect(secondProgress(at(10, 0, 0))).toBe(0);
  });

  it("is half at 30 seconds", () => {
    expect(secondProgress(at(10, 0, 30))).toBeCloseTo(0.5);
  });
});

describe("clockFace", () => {
  it("uses western hours unless Ethiopian hours are on", () => {
    const western = clockFace(at(19, 5), false);
    expect(western.hours).toBe(19);
    expect(western.minutes).toBe(5);
    expect(western.periodLabel).toBeNull();
    expect(western.western).toBe("19:05");
  });

  it("shows 1 ሌሊት at 19:00", () => {
    const face = clockFace(at(19), true);
    expect(face.hours).toBe(1);
    expect(face.periodLabel).toBe("ሌሊት");
  });
});
