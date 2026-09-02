import { numericAttr, stringAttr } from "./attrs";
import type { HassEntity } from "./types";

export interface WeatherForecastPoint {
  at: Date;
  temperature: number;
  condition?: string;
}

export interface WeatherView {
  entityId: string;
  state: string;
  temperature: number | undefined;
  apparent: number | undefined;
  humidity: number | undefined;
  windSpeed: number | undefined;
  windUnit: string;
  temperatureUnit: string;
  forecast: WeatherForecastPoint[];
}

function forecastPoint(raw: unknown): WeatherForecastPoint | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const temperature = numericAttr(record, "temperature");
  if (temperature == null) return null;
  const stamp =
    typeof record.datetime === "string"
      ? record.datetime
      : typeof record.datetime === "number"
        ? new Date(record.datetime).toISOString()
        : undefined;
  const at = stamp ? new Date(stamp) : new Date();
  if (Number.isNaN(at.getTime())) return null;
  const condition =
    typeof record.condition === "string" ? record.condition : undefined;
  return { at, temperature, condition };
}

export function weatherForecast(entity: HassEntity | undefined): WeatherForecastPoint[] {
  if (!entity) return [];
  const raw = entity.attributes.forecast;
  if (!Array.isArray(raw)) return [];
  const points: WeatherForecastPoint[] = [];
  for (const item of raw) {
    const point = forecastPoint(item);
    if (point) points.push(point);
  }
  return points;
}

export function deriveWeather(entity: HassEntity | undefined): WeatherView | null {
  if (!entity) return null;
  const attrs = entity.attributes;
  return {
    entityId: entity.entity_id,
    state: entity.state,
    temperature: numericAttr(attrs, "temperature"),
    apparent:
      numericAttr(attrs, "apparent_temperature") ??
      numericAttr(attrs, "feels_like"),
    humidity: numericAttr(attrs, "humidity"),
    windSpeed: numericAttr(attrs, "wind_speed"),
    windUnit: stringAttr(attrs, "wind_speed_unit") ?? "km/h",
    temperatureUnit: stringAttr(attrs, "temperature_unit") ?? "°",
    forecast: weatherForecast(entity),
  };
}

export const WEATHER_SPARKLINE = { width: 120, height: 36 } as const;

/** Short unit on the tile face: "°C" / "°F" become "°". */
export function compactTemperatureUnit(unit: string): string {
  return unit.replace("°C", "°").replace("°F", "°");
}

export function weatherSparklinePath(
  points: Array<{ temperature: number }>,
  width = WEATHER_SPARKLINE.width,
  height = WEATHER_SPARKLINE.height,
): string | null {
  if (points.length < 2) return null;
  let min = points[0]!.temperature;
  let max = min;
  for (const point of points) {
    if (point.temperature < min) min = point.temperature;
    if (point.temperature > max) max = point.temperature;
  }
  const span = Math.max(1, max - min);
  const last = points.length - 1;
  const parts: string[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const temperature = points[index]!.temperature;
    const x = (index / last) * width;
    const y = height - ((temperature - min) / span) * (height - 4) - 2;
    parts.push(`${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return parts.join(" ");
}
