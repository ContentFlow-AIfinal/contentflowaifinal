import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const noInput = (i: unknown) => i;

/* ============ BRAND ============ */
export const getBrand = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("brand_profile").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data;
  });

const brandSchema = z.object({
  story: z.string().nullable().optional(),
  mission: z.string().nullable().optional(),
  vision: z.string().nullable().optional(),
  tone: z.string().nullable().optional(),
  writing_style: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  brand_rules: z.string().nullable().optional(),
  cta_style: z.string().nullable().optional(),
  offer: z.string().nullable().optional(),
  pricing: z.string().nullable().optional(),
  faqs: z.array(z.string()).optional(),
});

export const saveBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => brandSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { user_id: userId, ...data, faqs: data.faqs ?? [] };
    const { error } = await supabase.from("brand_profile").upsert(payload, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });

/* ============ DASHBOARD ============ */
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [c, cm, ci, p, recent, favs] = await Promise.all([
      supabase.from("courses").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("content_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("prompts").select("id", { count: "exact", head: true }),
      supabase.from("content_items").select("id,title,content_type,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(5),
      supabase.from("content_items").select("id,title,content_type").eq("user_id", userId).eq("is_favorite", true).limit(5),
    ]);
    return {
      courses: c.count ?? 0,
      campaigns: cm.count ?? 0,
      content: ci.count ?? 0,
      prompts: p.count ?? 0,
      recent: recent.data ?? [],
      favorites: favs.data ?? [],
    };
  });

/* ============ FOLDERS ============ */
export const listFolders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("folders").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  });

export const createFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ name: z.string().min(1), parent_id: z.string().uuid().nullable().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase.from("folders").insert({ ...data, user_id: context.userId }).select().single();
    if (error) throw error;
    return row;
  });

export const deleteFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("folders").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ============ CONTENT ============ */
export const listContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    folderId: z.string().uuid().nullable().optional(),
    courseId: z.string().uuid().nullable().optional(),
    campaignId: z.string().uuid().nullable().optional(),
    favoritesOnly: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("content_items").select("*").order("updated_at", { ascending: false });
    if (data.folderId) q = q.eq("folder_id", data.folderId);
    if (data.courseId) q = q.eq("course_id", data.courseId);
    if (data.campaignId) q = q.eq("campaign_id", data.campaignId);
    if (data.favoritesOnly) q = q.eq("is_favorite", true);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: item, error } = await context.supabase.from("content_items").select("*").eq("id", data.id).single();
    if (error) throw error;
    const { data: versions } = await context.supabase.from("content_versions").select("*").eq("content_id", data.id).order("created_at", { ascending: false });
    return { item, versions: versions ?? [] };
  });

export const createContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    title: z.string().min(1),
    body: z.string().default(""),
    content_type: z.string().default("note"),
    tags: z.array(z.string()).default([]),
    folder_id: z.string().uuid().nullable().optional(),
    course_id: z.string().uuid().nullable().optional(),
    campaign_id: z.string().uuid().nullable().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("content_items").insert({ ...data, user_id: context.userId }).select().single();
    if (error) throw error;
    return row;
  });

export const updateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    body: z.string(),
    content_type: z.string(),
    tags: z.array(z.string()),
    is_favorite: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    // snapshot previous body
    const { data: prev } = await context.supabase.from("content_items").select("body").eq("id", data.id).single();
    if (prev?.body && prev.body !== data.body) {
      await context.supabase.from("content_versions").insert({ content_id: data.id, user_id: context.userId, body: prev.body });
    }
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("content_items").update(rest).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("content_items").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), value: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("content_items").update({ is_favorite: data.value }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ============ COURSES ============ */
const courseSchema = z.object({
  name: z.string().min(1),
  overview: z.string().nullable().optional(),
  brand_memory: z.string().nullable().optional(),
  offer: z.string().nullable().optional(),
  price: z.string().nullable().optional(),
  bonus: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  pain_points: z.string().nullable().optional(),
  transformation: z.string().nullable().optional(),
});

export const listCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("courses").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("courses").select("*").eq("id", data.id).single();
    if (error) throw error;
    return row;
  });

export const createCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => courseSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("courses").insert({ ...data, user_id: context.userId }).select().single();
    if (error) throw error;
    return row;
  });

export const updateCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => courseSchema.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("courses").update(rest).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("courses").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ============ CAMPAIGNS ============ */
const campaignSchema = z.object({
  name: z.string().min(1),
  brand_memory: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("campaigns").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("campaigns").select("*").eq("id", data.id).single();
    if (error) throw error;
    const { data: assets } = await context.supabase.from("campaign_assets").select("*").eq("campaign_id", data.id).order("created_at");
    return { campaign: row, assets: assets ?? [] };
  });

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => campaignSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("campaigns").insert({ ...data, user_id: context.userId }).select().single();
    if (error) throw error;
    return row;
  });

export const updateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => campaignSchema.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("campaigns").update(rest).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("campaigns").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const upsertAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid().optional(),
    campaign_id: z.string().uuid(),
    asset_type: z.string(),
    title: z.string().nullable().optional(),
    body: z.string().default(""),
  }).parse(i))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await context.supabase.from("campaign_assets").update(rest).eq("id", id);
      if (error) throw error;
      return { id };
    }
    const { data: row, error } = await context.supabase.from("campaign_assets").insert({ ...data, user_id: context.userId }).select().single();
    if (error) throw error;
    return row;
  });

export const deleteAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("campaign_assets").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ============ PROMPTS / TEMPLATES ============ */
export const listPrompts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("prompts").select("*").order("category");
    if (error) throw error;
    return data ?? [];
  });

export const createPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ title: z.string().min(1), body: z.string().min(1), category: z.string().nullable().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase.from("prompts").insert({ ...data, user_id: context.userId }).select().single();
    if (error) throw error;
    return row;
  });

export const deletePrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("prompts").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("templates").select("*").order("category");
    if (error) throw error;
    return data ?? [];
  });

export const createTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ title: z.string().min(1), body: z.string().min(1), category: z.string().nullable().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase.from("templates").insert({ ...data, user_id: context.userId }).select().single();
    if (error) throw error;
    return row;
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("templates").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

/* ============ SEARCH ============ */
export const searchContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    q: z.string(),
    type: z.string().optional(),
    favoritesOnly: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("content_items").select("*").order("updated_at", { ascending: false }).limit(100);
    if (data.q.trim()) q = q.or(`title.ilike.%${data.q}%,body.ilike.%${data.q}%`);
    if (data.type) q = q.eq("content_type", data.type);
    if (data.favoritesOnly) q = q.eq("is_favorite", true);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

/* ============ CHAT THREADS ============ */
export const listThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    scope_type: z.enum(["global", "course", "campaign"]).optional(),
    scope_id: z.string().uuid().nullable().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("chat_threads").select("*").order("updated_at", { ascending: false });
    if (data.scope_type) q = q.eq("scope_type", data.scope_type);
    if (data.scope_id) q = q.eq("scope_id", data.scope_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    scope_type: z.enum(["global", "course", "campaign"]).default("global"),
    scope_id: z.string().uuid().nullable().optional(),
    title: z.string().default("New chat"),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("chat_threads").insert({ ...data, user_id: context.userId }).select().single();
    if (error) throw error;
    return row;
  });

export const getThreadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ thread_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: thread, error: tErr } = await context.supabase.from("chat_threads").select("*").eq("id", data.thread_id).single();
    if (tErr) throw tErr;
    const { data: messages, error } = await context.supabase.from("chat_messages").select("*").eq("thread_id", data.thread_id).order("created_at");
    if (error) throw error;
    return { thread, messages: messages ?? [] };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("chat_threads").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
