import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const chatStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    thread_id: z.string().uuid(),
    message: z.string().min(1),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { supabase, userId } = context;

    const [{ data: thread }, { data: brand }, { data: history }] = await Promise.all([
      supabase.from("chat_threads").select("*").eq("id", data.thread_id).single(),
      supabase.from("brand_profile").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("chat_messages").select("role,content").eq("thread_id", data.thread_id).order("created_at"),
    ]);
    if (!thread) throw new Error("Thread not found");

    let courseMemory: string | null = null;
    let campaignMemory: string | null = null;
    if (thread.scope_type === "course" && thread.scope_id) {
      const { data: c } = await supabase.from("courses").select("name,brand_memory,offer").eq("id", thread.scope_id).maybeSingle();
      if (c) courseMemory = `${c.name}\n${c.brand_memory ?? ""}\nOffer: ${c.offer ?? ""}`;
    }
    if (thread.scope_type === "campaign" && thread.scope_id) {
      const { data: c } = await supabase.from("campaigns").select("name,brand_memory").eq("id", thread.scope_id).maybeSingle();
      if (c) campaignMemory = `${c.name}\n${c.brand_memory ?? ""}`;
    }

    const lines: string[] = [];
    if (brand) {
      const map: Record<string, string> = { brand_name: "Brand name", tagline: "Tagline", story: "Brand story", mission: "Mission", vision: "Vision", positioning: "Positioning / USP", differentiators: "What makes us different", tone: "Tone", writing_style: "Writing style", formality: "Formality level", language_pref: "Language preference", emoji_policy: "Emoji policy", preferred_words: "Preferred words / keywords", banned_words: "NEVER say (banned words & claims)", audience: "Audience", pain_points: "Customer pain points", objections: "Common objections", competitors: "Competitors", brand_rules: "Brand rules", cta_style: "CTA style", products: "Products & services", offer: "Core offer", pricing: "Pricing", guarantee: "Guarantee", proof: "Proof, results & testimonials", content_pillars: "Content pillars", platforms: "Platforms", sample_copy: "Sample copy written in our voice (imitate this rhythm and vocabulary)", links: "Links" };
      for (const [k, label] of Object.entries(map)) {
        const v = (brand as Record<string, unknown>)[k];
        if (typeof v === "string" && v.trim()) lines.push(`${label}: ${v}`);
      }
      if (Array.isArray(brand.faqs) && brand.faqs.length) lines.push(`FAQs:\n- ${brand.faqs.join("\n- ")}`);
    }
    if (courseMemory) lines.push(`Course memory: ${courseMemory}`);
    if (campaignMemory) lines.push(`Campaign memory: ${campaignMemory}`);
    const brandContext = lines.length ? lines.join("\n") : "No brand memory has been set yet. Ask short, focused questions to learn the brand before writing final copy.";

    const system = `You are the in-house senior content strategist and copywriter for this brand — not a generic AI assistant.

## How you speak
- Warm, confident, professional. Write like an experienced human marketer, never like a chatbot.
- No robotic openers ("As an AI", "Certainly!", "I hope this helps"). No emoji unless the brand's tone calls for it.
- Be concrete and useful. Short paragraphs, clear structure, no filler.

## Language rule (very important)
- Reply in the SAME language the user wrote in.
- Bangla message -> reply in natural, fluent, everyday Bangla the way a Bangladeshi professional actually speaks. Never stiff, literal, textbook translation.
- English message -> reply in clean, natural English.
- Mixed Banglish -> mirror that same mix comfortably.
- Keep proper nouns, product names and standard marketing terms (funnel, CTA, landing page) in English even inside Bangla text — that is how people really write.

## Brand manual (treat as absolute law)
Everything below is the brand's official manual. Match its voice, tone, rules, audience, offer and CTA style in every single line you write. If a request conflicts with the brand rules, follow the brand rules and say why in one short line.

=== BRAND MANUAL ===
${brandContext}
=== END BRAND MANUAL ===

## Output
- When asked for copy, deliver ready-to-publish copy — not a description of copy.
- Give a hook, body and CTA where the format needs it; label variants when you give options.
- If key information is missing (offer, price, deadline, audience), write the best version anyway and flag the assumptions in one short line at the end.`;


    const msgs = [
      ...(history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: data.message },
    ];

    const gateway = createLovableAiGatewayProvider(key);
    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      messages: msgs,
    });
    const text = result.text;

    // persist
    await supabase.from("chat_messages").insert([
      { thread_id: data.thread_id, user_id: userId, role: "user", content: data.message },
      { thread_id: data.thread_id, user_id: userId, role: "assistant", content: text },
    ]);
    await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", data.thread_id);

    return { text };
  });
