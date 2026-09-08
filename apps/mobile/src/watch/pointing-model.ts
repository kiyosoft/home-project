/**
 * Shared pointing math. The watch runs a Swift twin of these functions; keep
 * the fixtures in pointing-model.fixtures.json in lockstep with both sides.
 *
 * Heading is compass degrees: 0 = north, clockwise. Pitch is degrees, 0 =
 * arm level, negative toward the floor.
 */

export const STEP_METERS = 0.7;
export const MIN_SPAN_M = 0.4;
export const HEADING_OK_DEG = 28;
export const HEADING_GAP_DEG = 8;
export const PITCH_WEIGHT = 0.25;
export const PAINT_SECONDS = 5;

const DEG = Math.PI / 180;

export interface Sample {
  headingDeg: number;
  pitchDeg: number;
  x: number;
  y: number;
}

export interface Pose {
  headingDeg: number;
  pitchDeg: number;
  x: number;
  y: number;
}

export interface DeviceModel {
  entityId: string;
  areaId: string;
  headingMean: number;
  headingKappa: number;
  pitchMean: number;
  x?: number;
  y?: number;
  sampleCount: number;
  contested: boolean;
}

export interface InferResult {
  entityId: string | null;
  runnerUpId: string | null;
  contested: boolean;
  score: number;
}

export function wrapDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function circularDistanceDeg(a: number, b: number): number {
  const delta = Math.abs(wrapDeg(a) - wrapDeg(b));
  return delta > 180 ? 360 - delta : delta;
}

export function shortestSignedDeg(from: number, to: number): number {
  const raw = wrapDeg(to) - wrapDeg(from);
  if (raw > 180) return raw - 360;
  if (raw < -180) return raw + 360;
  return raw;
}

export function circularMeanDeg(headings: number[]): number {
  if (headings.length === 0) return 0;
  let x = 0;
  let y = 0;
  for (const heading of headings) {
    const radians = heading * DEG;
    x += Math.cos(radians);
    y += Math.sin(radians);
  }
  return wrapDeg(Math.atan2(y, x) / DEG);
}

/**
 * 2D von Mises concentration from the mean resultant length. 0 is a uniform
 * smear; large values mean the wearer stood still and pointed steadily.
 */
export function circularKappa(headings: number[]): number {
  if (headings.length < 2) return 0;
  let x = 0;
  let y = 0;
  for (const heading of headings) {
    const radians = heading * DEG;
    x += Math.cos(radians);
    y += Math.sin(radians);
  }
  const result = Math.hypot(x, y) / headings.length;
  if (result < 1e-6) return 0;
  if (result > 0.999) return 50;
  return (result * (2 - result * result)) / (1 - result * result);
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

export function pdrStep(
  pose: Pose,
  walkHeadingDeg: number,
  stepMeters = STEP_METERS,
): Pose {
  const radians = walkHeadingDeg * DEG;
  return {
    ...pose,
    x: pose.x + stepMeters * Math.sin(radians),
    y: pose.y + stepMeters * Math.cos(radians),
  };
}

function boundingSpan(samples: Sample[]): number {
  if (samples.length === 0) return 0;
  let minX = samples[0].x;
  let maxX = samples[0].x;
  let minY = samples[0].y;
  let maxY = samples[0].y;
  for (const sample of samples) {
    if (sample.x < minX) minX = sample.x;
    if (sample.x > maxX) maxX = sample.x;
    if (sample.y < minY) minY = sample.y;
    if (sample.y > maxY) maxY = sample.y;
  }
  return Math.hypot(maxX - minX, maxY - minY);
}

/**
 * Least-squares intersection of heading rays. Returns null when the wearer
 * barely moved — heading clusters are the better model from the couch.
 */
export function fitPoint(samples: Sample[]): { x: number; y: number } | null {
  if (samples.length < 3 || boundingSpan(samples) < MIN_SPAN_M) return null;

  let a11 = 0;
  let a12 = 0;
  let a22 = 0;
  let b1 = 0;
  let b2 = 0;
  for (const sample of samples) {
    const theta = sample.headingDeg * DEG;
    const nx = Math.cos(theta);
    const ny = -Math.sin(theta);
    a11 += nx * nx;
    a12 += nx * ny;
    a22 += ny * ny;
    const rhs = sample.x * nx + sample.y * ny;
    b1 += nx * rhs;
    b2 += ny * rhs;
  }
  const det = a11 * a22 - a12 * a12;
  if (Math.abs(det) < 1e-6) return null;
  return {
    x: (a22 * b1 - a12 * b2) / det,
    y: (a11 * b2 - a12 * b1) / det,
  };
}

export function paintDevice(
  entityId: string,
  areaId: string,
  samples: Sample[],
): DeviceModel {
  const headings = samples.map((sample) => sample.headingDeg);
  const pitches = samples.map((sample) => sample.pitchDeg);
  const point = fitPoint(samples);
  return {
    entityId,
    areaId,
    headingMean: circularMeanDeg(headings),
    headingKappa: circularKappa(headings),
    pitchMean: mean(pitches),
    ...(point ? { x: point.x, y: point.y } : {}),
    sampleCount: samples.length,
    contested: false,
  };
}

export function scoreDevice(pose: Pose, device: DeviceModel): number {
  if (device.x !== undefined && device.y !== undefined) {
    const dx = device.x - pose.x;
    const dy = device.y - pose.y;
    const toHeading = wrapDeg(Math.atan2(dx, dy) / DEG);
    const headingErr = circularDistanceDeg(pose.headingDeg, toHeading);
    return headingErr + Math.abs(pose.pitchDeg - device.pitchMean) * PITCH_WEIGHT;
  }
  const headingErr = circularDistanceDeg(pose.headingDeg, device.headingMean);
  return headingErr + Math.abs(pose.pitchDeg - device.pitchMean) * PITCH_WEIGHT;
}

export function inferTarget(
  pose: Pose,
  devices: DeviceModel[],
  areaId: string,
): InferResult {
  const pool = devices.filter(
    (device) => device.areaId === areaId && device.sampleCount > 0,
  );
  if (pool.length === 0) {
    return { entityId: null, runnerUpId: null, contested: false, score: Infinity };
  }

  const ranked = pool
    .map((device) => ({ device, score: scoreDevice(pose, device) }))
    .sort((left, right) => left.score - right.score);
  const best = ranked[0];
  const second = ranked[1];
  const closeSecond =
    second !== undefined && second.score - best.score < HEADING_GAP_DEG;
  const contested = best.score > HEADING_OK_DEG || closeSecond;

  if (best.score > HEADING_OK_DEG * 1.5) {
    return {
      entityId: null,
      runnerUpId: second?.device.entityId ?? null,
      contested: true,
      score: best.score,
    };
  }

  return {
    entityId: best.device.entityId,
    runnerUpId:
      second && (contested || second.score < HEADING_OK_DEG)
        ? second.device.entityId
        : null,
    contested,
    score: best.score,
  };
}

/** Push the rejected heading away from the chosen one so the next snap prefers it less. */
export function applyCorrection(
  devices: DeviceModel[],
  chosenId: string,
  rejectedId: string,
): DeviceModel[] {
  const chosen = devices.find((device) => device.entityId === chosenId);
  return devices.map((device) => {
    if (device.entityId === chosenId) return { ...device, contested: false };
    if (device.entityId !== rejectedId) return device;
    if (!chosen) return { ...device, contested: true };
    const signed = shortestSignedDeg(chosen.headingMean, device.headingMean);
    const push = signed >= 0 ? 18 : -18;
    return {
      ...device,
      headingMean: wrapDeg(device.headingMean + push),
      contested: true,
    };
  });
}

export function markContested(devices: DeviceModel[]): DeviceModel[] {
  return devices.map((device) => {
    const rival = devices.some(
      (other) =>
        other.entityId !== device.entityId &&
        other.areaId === device.areaId &&
        other.sampleCount > 0 &&
        circularDistanceDeg(device.headingMean, other.headingMean) <
          HEADING_GAP_DEG,
    );
    return rival ? { ...device, contested: true } : device;
  });
}
