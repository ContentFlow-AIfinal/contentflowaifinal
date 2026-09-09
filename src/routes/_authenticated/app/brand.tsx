import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBrand, saveBrand } from "@/lib/cfa.functions";
import { useT } from "@/i18n/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/brand")({
  component: BrandPage,
});

const KEYS = [
  "brand_name", "tagline", "story", "mission", "vision", "positioning", "differentiators",
  "tone", "writing_style", "formality", "language_pref", "emoji_policy", "preferred_words", "banned_words",
  "audience", "pain_points", "objections", "competitors", "brand_rules", "cta_style",
  "products", "offer", "pricing", "guarantee", "proof", "content_pillars", "platforms", "sample_copy", "links",
  "faqs",
] as const;

type Key = (typeof KEYS)[number];
type BrandForm = Record<Key, string>;

const empty = Object.fromEntries(KEYS.map((k) => [k, ""])) as BrandForm;

function BrandPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["brand"], queryFn: () => getBrand() });
  const [form, setForm] = useState<BrandForm>(empty);

  useEffect(() => {
    if (!data) return;
    const row = data as Record<string, unknown>;
    const next = { ...empty };
    for (const k of KEYS) {
      if (k === "faqs") {
        next.faqs = Array.isArray(row.faqs) ? (row.faqs as string[]).join("\n") : "";
      } else {
        next[k] = typeof row[k] === "string" ? (row[k] as string) : "";
      }
    }
    setForm(next);
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const { faqs, ...rest } = form;
      return saveBrand({
        data: { ...rest, faqs: faqs.split("\n").map((s) => s.trim()).filter(Boolean) },
      });
    },
    onSuccess: () => { toast.success(t.common.saved); qc.invalidateQueries({ queryKey: ["brand"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: Key) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const filled = KEYS.filter((k) => form[k].trim()).length;
  const pct = Math.round((filled / KEYS.length) * 100);

  if (isLoading) return <div className="text-sm text-muted-foreground">{t.common.loading}</div>;

  const line = (k: Key, label: string, ph?: string) => (
    <Field label={label}><Input value={form[k]} onChange={set(k)} placeholder={ph} /></Field>
  );
  const area = (k: Key, label: string, rows = 3, ph?: string) => (
    <Field label={label}><Textarea rows={rows} value={form[k]} onChange={set(k)} placeholder={ph} /></Field>
  );

  return (
    <div className="max-w-3xl space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-semibold">{t.brand.title}</h1>
        <p className="text-sm text-muted-foreground">{t.brand.desc}</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t.brand.completeness}</span>
            <span className="text-muted-foreground">{filled}/{KEYS.length} · {pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{t.brand.optional}</p>
        </CardContent>
      </Card>

      <Section title={t.brand.secIdentity}>
        <div className="grid md:grid-cols-2 gap-4">
          {line("brand_name", t.brand.brandName)}
          {line("tagline", t.brand.tagline)}
        </div>
        {area("story", t.brand.story, 4)}
        <div className="grid md:grid-cols-2 gap-4">
          {area("mission", t.brand.mission)}
          {area("vision", t.brand.vision)}
        </div>
        {area("positioning", t.brand.positioning, 2, "For X who Y, we are the Z that…")}
        {area("differentiators", t.brand.differentiators, 3)}
      </Section>

      <Section title={t.brand.secVoice}>
        <div className="grid md:grid-cols-2 gap-4">
          {line("tone", t.brand.tone, "warm, direct, no hype")}
          {line("writing_style", t.brand.writingStyle, "short sentences, storytelling")}
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {line("formality", t.brand.formality, "casual / semi-formal / formal")}
          {line("language_pref", t.brand.languagePref, "Bangla / English / Banglish")}
          {line("emoji_policy", t.brand.emojiPolicy, "none / minimal / freely")}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {area("preferred_words", t.brand.preferredWords, 3)}
          {area("banned_words", t.brand.bannedWords, 3, "guaranteed income, 100% sure…")}
        </div>
        {area("sample_copy", t.brand.sampleCopy, 5, "Paste 1–3 posts you love, written in your real voice.")}
      </Section>

      <Section title={t.brand.secAudience}>
        {area("audience", t.brand.audience, 3)}
        <div className="grid md:grid-cols-2 gap-4">
          {area("pain_points", t.brand.painPoints)}
          {area("objections", t.brand.objections)}
        </div>
        {area("competitors", t.brand.competitors, 2)}
        {area("brand_rules", t.brand.rules, 3)}
        {line("cta_style", t.brand.cta)}
      </Section>

      <Section title={t.brand.secOffer}>
        {area("products", t.brand.products, 3)}
        {area("offer", t.brand.offer, 3)}
        <div className="grid md:grid-cols-2 gap-4">
          {line("pricing", t.brand.pricing)}
          {line("guarantee", t.brand.guarantee)}
        </div>
        {area("proof", t.brand.proof, 3)}
        <div className="grid md:grid-cols-2 gap-4">
          {area("content_pillars", t.brand.contentPillars, 2)}
          {area("platforms", t.brand.platforms, 2, "Facebook page, YouTube, WhatsApp")}
        </div>
        {area("links", t.brand.links, 2)}
        {area("faqs", t.brand.faqs, 4)}
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={() => save.mutate()} disabled={save.isPending} className="shadow-lg">
          {save.isPending ? t.common.loading : t.common.save}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}
