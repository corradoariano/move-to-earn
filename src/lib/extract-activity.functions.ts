import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  imageBase64: z.string().min(20),
  mimeType: z.string().default("image/jpeg"),
});

const ResponseSchema = z.object({
  activity_type: z.string(),
  intensity: z.enum(["low", "medium", "high"]),
  duration_minutes: z.number().int().min(1).max(600),
  performed_at: z.string(),
  source_app: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  notes: z.string().nullable().optional(),
});

export const extractActivityFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const dataUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:${data.mimeType};base64,${data.imageBase64}`;

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You analyze fitness-tracker screenshots (Strava, Nike Run Club, Apple Fitness, Garmin, etc.). Extract activity details and return strict JSON only. Intensity heuristic: low = walking/easy yoga/leisure; medium = jog, moderate cycling, gym session; high = run, HIIT, sparring, climbing, fast cycling. If you cannot find a value, make a reasonable guess and lower the confidence.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Extract this activity. Return JSON with keys: activity_type (string like "Run", "Cycling", "Gym"), intensity ("low"|"medium"|"high"), duration_minutes (integer), performed_at (ISO 8601 datetime), source_app (string or null), confidence (0-1), notes (string or null).',
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) throw new Error("AI rate limit hit. Please wait a moment and try again.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    if (!res.ok) throw new Error(`AI gateway error ${res.status}: ${await res.text()}`);

    const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = payload.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new Error("AI returned non-JSON response."); }
    return ResponseSchema.parse(parsed);
  });