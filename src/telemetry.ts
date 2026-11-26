export const telemetryLimits = {
  rpm: { min: 1000, max: 9000 },
  oilC: { min: 80, max: 110 },
} as const;

export interface TelemetrySample {
  rpm: number;
  oilC: number;
}

export function sampleTelemetry(
  random: () => number = Math.random,
): TelemetrySample {
  const { rpm, oilC } = telemetryLimits;
  const sample = (min: number, max: number) =>
    min + Math.floor(random() * (max - min + 1));
  return { rpm: sample(rpm.min, rpm.max), oilC: sample(oilC.min, oilC.max) };
}

export function formatElapsed(totalSeconds: number): string {
  const part = (value: number) => value.toString().padStart(2, "0");
  return `${part(Math.floor(totalSeconds / 60))}:${part(totalSeconds % 60)}`;
}
