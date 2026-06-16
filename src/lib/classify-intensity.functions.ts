import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({ activity: z.string().min(1).max(120) });
const ResponseSchema = z.object({
  intensity: z.enum(["low", "medium", "high"]),
  rationale: z.string().optional(),
});

export const classifyActivityIntensity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You classify physical activities by intensity using the World Health Organization (WHO) physical activity guidelines. " +
            "Low (light, <3 METs): slow/leisurely walking, slow dancing, stretching, casual bowling. " +
            "Medium (moderate, 3-6 METs): brisk walking, casual cycling (8-15 km/h), low-impact aerobics, casual swimming, doubles tennis. " +
            "High (vigorous, >6 METs): jogging, running, race-walking, swimming laps, singles tennis, jump rope, martial arts, competitive team sports (football, basketball, rugby). " +
            "Return strict JSON only.",
        },
        {
          role: "user",
          content: `Classify the WHO intensity level for this activity: "${data.activity}". Return JSON {"intensity":"low"|"medium"|"high","rationale":"one short sentence"}.`,
        },
      ],
      response_format: { type: "json_object" },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify(body),
    });

    if (res.status === 429) throw new Error("AI rate limit hit. Please wait a moment and try again.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error(`AI gateway error ${res.status}`);

    const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = payload.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new Error("AI returned non-JSON response."); }
    return ResponseSchema.parse(parsed);
  });