export const INTENSITY_MULTIPLIER = { low: 1, medium: 2, high: 3 } as const;
export type Intensity = keyof typeof INTENSITY_MULTIPLIER;

export function calcCredits(intensity: Intensity, minutes: number): number {
  // intensity x (minutes / 15), rounded to nearest credit, min 1
  const credits = INTENSITY_MULTIPLIER[intensity] * (minutes / 15);
  return Math.max(1, Math.round(credits));
}

// WHO-based intensity mapping by activity type.
// Low (light): < ~3 METs — slow/leisurely movement.
// Medium (moderate): ~3–6 METs — noticeable effort, can still talk.
// High (vigorous): > 6 METs — hard effort, breathing heavily.
export const ACTIVITY_INTENSITY: Record<string, Intensity> = {
  // Low
  "Slow walk": "low",
  "Slow dancing": "low",
  "Stretching": "low",
  "Casual bowling": "low",
  // Medium
  "Brisk walk": "medium",
  "Casual cycling": "medium",
  "Low-impact aerobics": "medium",
  "Casual swimming": "medium",
  "Doubles tennis": "medium",
  // High
  "Jogging": "high",
  "Running": "high",
  "Race-walking": "high",
  "Swimming laps": "high",
  "Singles tennis": "high",
  "Jump rope": "high",
  "Martial arts": "high",
  "Football": "high",
  "Basketball": "high",
  "Rugby": "high",
};

export const ACTIVITY_TYPES = Object.keys(ACTIVITY_INTENSITY);

export const OTHER_ACTIVITY = "Other" as const;

export function intensityForActivity(activityType: string): Intensity {
  return ACTIVITY_INTENSITY[activityType] ?? "medium";
}