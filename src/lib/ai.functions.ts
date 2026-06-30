import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

function buildBrandContext(brand: Record<string, unknown> | null, extras: { courseMemory?: string | null; campaignMemory?: string | null } = {}) {
  if (!brand && !extras.courseMemory && !extras.campaignMemory) return "No brand memory has been set yet. Use a clear, professional, helpful voice.";
  const lines: string[] = [];
  if (brand) {
    const map: Record<string, string> = {
      story: "Brand story", mission: "Mission", vision: "Vision", tone: "Tone",
      writing_style: "Writing style", audience: "Audience", brand_rules: "Brand rules",
      cta_style: "CTA style", offer: "Core offer", pricing: "Pricing",
    };
    for (const [k, label] of Object.entries(map)) {
      const v = brand[k];
      if (typeof v === "string" && v.trim()) lines.push(`${label}: ${v}`);
    }
    const faqs = brand.faqs;
    if (Array.isArray(faqs) && faqs.length) lines.push(`FAQs:\n- ${faqs.join("\n- ")}`);
  }
  if (extras.courseMemory) lines.push(`Course memory: ${extras.courseMemory}`);
  if (extras.campaignMemory) lines.push(`Campaign memory: ${extras.campaignMemory}`);
  return lines.join("\n");
}

const typeInstructions: Record<string, string> = {
  facebook: "Write an engaging Facebook post (2-4 short paragraphs, emojis ok, ends with a CTA).",
  sms: "Write a 160-character SMS message with a clear CTA.",
  whatsapp: "Write a friendly WhatsApp message under 400 characters, with a CTA.",
  email: "Write a marketing email with subject line, greeting, body, and CTA.",
  blog: "Write a 600-800 word blog post with intro, 3 sections, conclusion.",
  landing: "Write landing page copy: headline, sub-headline, 3 benefits, social proof, CTA.",
  video_script: "Write a 60-90 second video script with hook, body, CTA.",
  carousel: "Write 5-7 carousel slides (title + 1-line body each).",
  caption: "Write a punchy social media caption with hashtags.",
  comment_reply: "Write a warm, helpful comment reply.",
  offer: "Craft an irresistible offer with bonus stack and price anchor.",
  sales: "Write a high-conviction sales copy section.",
  headline: "Write 5 strong headline options.",
  cta: "Write 5 punchy CTAs.",
  note: "Write the requested content clearly and concisely.",
};

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    type: z.string(),
    instruction: z.string().min(1),
    course_id: z.string().uuid().nullable().optional(),
    campaign_id: z.string().uuid().nullable().optional(),
    save_as_title: z.string().optional(),
    folder_id: z.string().uuid().nullable().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { supabase, userId } = context;
    const [{ data: brand }, courseRes, campRes] = await Promise.all([
      supabase.from("brand_profile").select("*").eq("user_id", userId).maybeSingle(),
      data.course_id ? supabase.from("courses").select("brand_memory,name,offer").eq("id", data.course_id).maybeSingle() : Promise.resolve({ data: null }),
      data.campaign_id ? supabase.from("campaigns").select("brand_memory,name").eq("id", data.campaign_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const courseMemory = courseRes.data ? `${courseRes.data.name ?? ""}\n${courseRes.data.brand_memory ?? ""}\nOffer: ${courseRes.data.offer ?? ""}` : null;
    const campaignMemory = campRes.data ? `${campRes.data.name ?? ""}\n${campRes.data.brand_memory ?? ""}` : null;
    const brandContext = buildBrandContext(brand, { courseMemory, campaignMemory });

    const typeHint = typeInstructions[data.type] ?? typeInstructions.note;
    const system = `You are an expert content writer for a single brand. Always match the brand's voice, rules, and audience exactly.\n\n=== BRAND CONTEXT ===\n${brandContext}\n\n=== TASK ===\n${typeHint}\n\nReturn only the final content, no explanations or preamble.`;

    const gateway = createLovableAiGatewayProvider(key);
    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt: data.instruction,
    });

    const text = result.text;

    if (data.save_as_title) {
      const { data: row, error } = await supabase.from("content_items").insert({
        user_id: userId,
        title: data.save_as_title,
        body: text,
        content_type: data.type,
        folder_id: data.folder_id ?? null,
        course_id: data.course_id ?? null,
        campaign_id: data.campaign_id ?? null,
      }).select().single();
      if (error) throw error;
      return { text, content: row };
    }
    return { text, content: null };
  });
