
-- Updated-at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- BRAND PROFILE
CREATE TABLE public.brand_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  story TEXT, mission TEXT, vision TEXT,
  tone TEXT, writing_style TEXT, audience TEXT,
  brand_rules TEXT, cta_style TEXT,
  offer TEXT, pricing TEXT,
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_profile TO authenticated;
GRANT ALL ON public.brand_profile TO service_role;
ALTER TABLE public.brand_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own brand" ON public.brand_profile FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER brand_updated BEFORE UPDATE ON public.brand_profile FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- FOLDERS
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT ALL ON public.folders TO service_role;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own folders" ON public.folders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX folders_user_idx ON public.folders(user_id);

-- COURSES
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  overview TEXT,
  brand_memory TEXT,
  offer TEXT, price TEXT, bonus TEXT,
  audience TEXT, pain_points TEXT, transformation TEXT,
  faq JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own courses" ON public.courses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- CAMPAIGNS
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand_memory TEXT,
  start_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own campaigns" ON public.campaigns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER campaigns_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- CONTENT ITEMS
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'note',
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own content" ON public.content_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX content_user_idx ON public.content_items(user_id);
CREATE INDEX content_folder_idx ON public.content_items(folder_id);
CREATE INDEX content_course_idx ON public.content_items(course_id);
CREATE INDEX content_campaign_idx ON public.content_items(campaign_id);
CREATE TRIGGER content_updated BEFORE UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- CONTENT VERSIONS
CREATE TABLE public.content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_versions TO authenticated;
GRANT ALL ON public.content_versions TO service_role;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own versions" ON public.content_versions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX versions_content_idx ON public.content_versions(content_id);

-- CAMPAIGN ASSETS
CREATE TABLE public.campaign_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_assets TO authenticated;
GRANT ALL ON public.campaign_assets TO service_role;
ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assets" ON public.campaign_assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX assets_campaign_idx ON public.campaign_assets(campaign_id);
CREATE TRIGGER assets_updated BEFORE UPDATE ON public.campaign_assets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- PROMPTS (seeded shared if user_id NULL; otherwise per-user)
CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompts TO authenticated;
GRANT ALL ON public.prompts TO service_role;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read prompts" ON public.prompts FOR SELECT TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "insert own prompts" ON public.prompts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own prompts" ON public.prompts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own prompts" ON public.prompts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- TEMPLATES
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT ALL ON public.templates TO service_role;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read templates" ON public.templates FOR SELECT TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "insert own templates" ON public.templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own templates" ON public.templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own templates" ON public.templates FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- CHAT THREADS
CREATE TABLE public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'global', -- global|course|campaign
  scope_id UUID,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own threads" ON public.chat_threads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX threads_user_idx ON public.chat_threads(user_id);
CREATE TRIGGER threads_updated BEFORE UPDATE ON public.chat_threads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- CHAT MESSAGES
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL, -- user|assistant|system
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.chat_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX messages_thread_idx ON public.chat_messages(thread_id, created_at);

-- SEED prompts/templates (shared)
INSERT INTO public.prompts (user_id, title, body, category) VALUES
(NULL, 'Write Facebook Post', 'Write an engaging Facebook post about: {topic}. Use the brand voice and end with a CTA.', 'social'),
(NULL, 'Write Blog', 'Write a 700-word blog post about: {topic}. Include intro, 3 sections, and conclusion.', 'long-form'),
(NULL, 'Write Sales Page', 'Write a high-converting sales page for: {offer}. Include headline, problem, solution, benefits, social proof, CTA.', 'sales'),
(NULL, 'Generate Offer', 'Create an irresistible offer for: {product}. Include price anchoring and bonus stack.', 'offer'),
(NULL, 'Generate CTA', 'Write 5 punchy CTAs for: {goal}.', 'cta'),
(NULL, 'Create Funnel', 'Outline a 4-step funnel for: {audience} buying {offer}.', 'funnel'),
(NULL, 'Write SMS', 'Write a 160-char SMS announcing: {announcement}.', 'sms'),
(NULL, 'Write Story', 'Tell a 200-word brand story about: {topic}.', 'story'),
(NULL, 'Write Ad Copy', 'Write 3 ad copy variations for: {offer}, targeting {audience}.', 'ads');

INSERT INTO public.templates (user_id, title, body, category) VALUES
(NULL, 'Daily Tip', '🔥 Quick tip: [insert tip]. Try it today and reply with your result!', 'daily'),
(NULL, 'Launch SMS', '🚀 [Course] is LIVE. Early bird ends [date]. Grab your seat: [link]', 'launch'),
(NULL, 'Welcome Message', 'Welcome to [Brand]! Here is what to do first: 1) [step] 2) [step] 3) [step]', 'onboarding'),
(NULL, 'Closing Message', 'Last call — [offer] closes in [time]. Lock it in: [link]', 'closing'),
(NULL, 'Follow-up', 'Hey [name], just checking in on [topic]. Any questions I can answer?', 'follow-up'),
(NULL, 'Sales Script', 'Hook → Problem → Agitate → Solution → Offer → Bonus → Scarcity → CTA', 'sales'),
(NULL, 'Live Class Script', 'Welcome → Hook → Promise → 3 Lessons → Demo → Pitch → Q&A', 'live'),
(NULL, 'Webinar Flow', 'Intro → Story → Method → Proof → Offer → FAQ → Close', 'webinar');
