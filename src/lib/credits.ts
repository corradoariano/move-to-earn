export const INTENSITY_MULTIPLIER = { low: 1, medium: 2, high: 3 } as const;
export type Intensity = keyof typeof INTENSITY_MULTIPLIER;

export function calcCredits(intensity: Intensity, minutes: number): number {
  // intensity x (minutes / 15), rounded to nearest credit, min 1
  const credits = INTENSITY_MULTIPLIER[intensity] * (minutes / 15);
  return Math.max(1, Math.round(credits));
}

export const ACTIVITY_TYPES = [
  "Walk", "Run", "Cycling", "Gym", "Climbing",
  "Kickboxing", "Yoga", "Swimming", "Hiking", "Other",
] as const;