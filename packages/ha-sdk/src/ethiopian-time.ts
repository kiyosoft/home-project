export type EthiopianPeriod = "day" | "night";

export interface EthiopianClock {
  /** 1–12, counted from 06:00. */
  hours: number;
  minutes: number;
  seconds: number;
  period: EthiopianPeriod;
}

/**
 * Ethiopian civil time: 12-hour clocks that start at 06:00 and 18:00.
 * 07:00 is 1 ቀን, 19:00 is 1 ሌሊት.
 */
export function toEthiopianClock(date: Date): EthiopianClock {
  const westernHour = date.getHours();
  return {
    hours: ((westernHour + 18) % 12) || 12,
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
    period: westernHour >= 6 && westernHour < 18 ? "day" : "night",
  };
}

export function ethiopianPeriodLabel(period: EthiopianPeriod): string {
  return period === "day" ? "ቀን" : "ሌሊት";
}

export function padClock(value: number): string {
  return String(value).padStart(2, "0");
}

/** How far through the current minute we are, 0–1, including milliseconds. */
export function secondProgress(date: Date): number {
  return (date.getSeconds() + date.getMilliseconds() / 1000) / 60;
}

/** Tick often enough that a 60-second ring visibly moves. */
export const CLOCK_TICK_MS = 80;

export interface ClockFace {
  hours: number;
  minutes: number;
  seconds: number;
  progress: number;
  periodLabel: string | null;
  weekday: string;
  date: string;
  western: string;
}

export interface AnalogHands {
  hourDeg: number;
  minuteDeg: number;
  secondDeg: number;
}

/** Hand angles for a 12-hour dial. 0° is 12 o'clock, clockwise. */
export function analogHands(date: Date, ethiopianHours: boolean): AnalogHands {
  const seconds = date.getSeconds() + date.getMilliseconds() / 1000;
  const minutes = date.getMinutes() + seconds / 60;
  const hour12 = ethiopianHours
    ? (toEthiopianClock(date).hours % 12) + minutes / 60
    : (date.getHours() % 12) + minutes / 60;
  return {
    hourDeg: hour12 * 30,
    minuteDeg: minutes * 6,
    secondDeg: seconds * 6,
  };
}

export function clockFace(date: Date, ethiopianHours: boolean): ClockFace {
  const ethiopian = toEthiopianClock(date);
  const minutes = date.getMinutes();
  return {
    hours: ethiopianHours ? ethiopian.hours : date.getHours(),
    minutes,
    seconds: date.getSeconds(),
    progress: secondProgress(date),
    periodLabel: ethiopianHours
      ? ethiopianPeriodLabel(ethiopian.period)
      : null,
    weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
    date: date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    }),
    western: `${padClock(date.getHours())}:${padClock(minutes)}`,
  };
}
