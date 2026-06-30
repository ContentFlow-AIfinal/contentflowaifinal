# ContentFlow AI — MVP v1 Plan

## Note on backend choice
You picked "Clerk + custom Supabase". This project runs on TanStack Start with the Lovable Cloud integration (Supabase under the hood, plus a managed auth gate at `_authenticated/`). Clerk is not a supported auth provider in this stack — wiring it in would mean removing the managed auth layer and rebuilding session handling from scratch. I'll use **Lovable Cloud auth (email/password + Google)** which gives you the same Supabase Postgres + Storage + RLS you wanted, with zero setup. If you truly need Clerk, say so and we'll scope that as a separate larger task.

AI uses the **Lovable AI Gateway** (Gemini by default) via server functions — no OpenAI key needed.

## Scope (MVP v1)
1. Auth (email/password + Google) and per-user data isolation via RLS
2. Bilingual UI (English / Bangla) with a top-bar language toggle (i18n dictionary, persisted in localStorage)
3. Main Dashboard (counts, recent activity, favorite templates, quick actions)
4. Brand Workspace (single editable brand profile per user: story, mission, vision, tone, audience, rules, CTA style, offer, pricing, FAQs)
5. Content Warehouse (folders + content items, type tags like Facebook/SMS/Email/Blog/etc.)
6. Course Management (course cards with overview + per-course brand memory + offer/price/bonus/audience/pain/transformation/FAQ)
7. Campaign Management (campaign cards with all sub-asset types listed in PRD)
8. AI Chat (per-context: global, course-scoped, or campaign-scoped — pulls relevant brand memory automatically)
9. AI Content Generator (one-click generators for the PRD's content types, writes output into the Warehouse)
10. Prompt Library (seeded + user-added prompts)
11. Templates (seeded ready templates)
12. Search (keyword + filters: type, course, campaign, tag, date, favorite)
13. Tags + Favorites
14. Version history for content items (snapshot on edit)

Out of scope for v1 (deferred to v2 as PRD specifies): WhatsApp/FB/IG integrations, Drive sync, calendar, analytics, team workspace, approvals, voice→content, image/video/presentation generators, AI agent automation.

## App structure
```text
/                       Landing (public)
/auth                   Sign in / sign up (public)
/app                    Dashboard (protected)
/app/brand              Brand Workspace
/app/warehouse          Content Warehouse (folder tree + items)
/app/warehouse/$itemId  Item detail + version history + AI regenerate
/app/courses            Course list
/app/courses/$courseId  Course detail (overview, brand memory, offer, AI chat)
/app/campaigns          Campaign list
/app/campaigns/$id      Campaign detail (all asset types, AI generators)
/app/chat               Global AI chat
/app/prompts            Prompt library
/app/templates          Template library
/app/search             Search results
```

All `/app/*` routes live under `src/routes/_authenticated/` (managed gate).

## Data model (Postgres + RLS scoped to `auth.uid()`)
- `profiles` (id, display_name, locale, created_at)
- `brand_profile` (user_id PK, story, mission, vision, tone, writing_style, audience, rules, cta_style, offer, pricing, faqs jsonb)
- `folders` (id, user_id, parent_id null, name, created_at)
- `content_items` (id, user_id, folder_id, course_id null, campaign_id null, title, body, content_type, tags text[], is_favorite, created_at, updated_at)
- `content_versions` (id, content_id, body, created_at)
- `courses` (id, user_id, name, overview, brand_memory, offer, price, bonus, audience, pain_points, transformation, faq jsonb)
- `campaigns` (id, user_id, name, brand_memory, start_date, notes)
- `campaign_assets` (id, campaign_id, asset_type, body) — covers landing copy, headline, sales, sms, whatsapp, fb post, email, video script, presentation, ad copy, comment reply, messenger reply, objection, closing, follow-up
- `prompts` (id, user_id null for seeded, title, body, category)
- `templates` (id, user_id null for seeded, title, body, category)
- `chat_threads` (id, user_id, scope_type [global|course|campaign], scope_id null, title, created_at)
- `chat_messages` (id, thread_id, role, content, created_at)

RLS: every user-owned table policies `user_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE. Seeded prompts/templates (`user_id IS NULL`) readable by all authenticated users. Grants per the public-schema rules.

## AI layer
- Server fn `generateContent({ type, contextRefs })` — loads brand_profile + (optional) course/campaign brand_memory, composes system prompt, calls Gemini via Lovable AI Gateway with `streamText`, returns the generated text, optionally saves as a `content_item`.
- Server fn `chat({ threadId, message })` — loads thread history + scoped brand memory, streams response via AI SDK `toUIMessageStreamResponse`. Client uses `useChat` with the AI SDK.
- Chat threads persist messages in DB (you chose Clerk+Supabase, implying persistence). Threaded conversations per scope.

## Design direction
Clean modern SaaS, Notion/Linear-inspired:
- Light theme (with dark mode toggle), neutral surfaces, single accent (indigo `#4F46E5`)
- Sidebar nav (collapsible) using shadcn `Sidebar`
- Inter for body + UI; tabular numerals for counts
- Generous spacing, soft borders, subtle shadows
- Card-based dashboards; data-dense tables for warehouse list
- All colors via semantic tokens in `src/styles.css` (no hardcoded hex in components)

## i18n
Lightweight: `src/i18n/{en,bn}.ts` dictionaries + a `useT()` hook + `LanguageProvider` reading/writing `localStorage`. Bangla uses Noto Sans Bengali (loaded via `<link>` in `__root.tsx` head).

## Build order
1. Enable Lovable Cloud; configure email + Google auth
2. Migrations for all tables + RLS + seed prompts/templates
3. i18n scaffold + language toggle + sidebar shell + dashboard
4. Brand Workspace CRUD
5. Folders + Content Warehouse (list, create, edit, favorite, tag, version on edit)
6. Courses CRUD + detail
7. Campaigns CRUD + detail with asset sub-types
8. AI server fns (generate + chat) + Lovable AI Gateway provider
9. AI Chat UI (threaded, scope-aware) using AI Elements
10. AI Content Generator buttons wired into Warehouse / Campaign / Course pages
11. Prompt Library + Templates browsing
12. Search page (Postgres ILIKE across title/body + filters)
13. Public landing + SEO heads per route
14. Verify build, run protected/public route smoke tests in Playwright

## Confirm before I build
- OK with **Lovable Cloud auth (email + Google)** instead of Clerk? (Strong recommendation — Clerk requires ripping out the managed auth layer.)
- OK to use **Lovable AI Gateway / Gemini** for AI? (Otherwise you'd need to supply an OpenAI key.)
- Default landing page language: **English** (toggle to Bangla in-app)?
