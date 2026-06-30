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
      const map: Record<string, string> = { story: "Brand story", mission: "Mission", vision: "Vision", tone: "Tone", writing_style: "Writing style", audience: "Audience", brand_rules: "Brand rules", cta_style: "CTA style", offer: "Core offer", pricing: "Pricing" };
      for (const [k, label] of Object.entries(map)) {
        const v = (brand as Record<string, unknown>)[k];
        if (typeof v === "string" && v.trim()) lines.push(`${label}: ${v}`);
      }
      if (Array.isArray(brand.faqs) && brand.faqs.length) lines.push(`FAQs:\n- ${brand.faqs.join("\n- ")}`);
    }
    if (courseMemory) lines.push(`Course memory: ${courseMemory}`);
    if (campaignMemory) lines.push(`Campaign memory: ${campaignMemory}`);
    const brandContext = lines.length ? lines.join("\n") : "No brand memory set yet.";

    const system = `You are ContentFlow AI — an on-brand content assistant. Always match the brand's voice exactly. Be concise, practical, and produce ready-to-use copy when asked.\n\n=== BRAND CONTEXT ===\n${brandContext}`;

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
