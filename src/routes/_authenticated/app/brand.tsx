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

type BrandForm = {
  story: string; mission: string; vision: string; tone: string; writing_style: string;
  audience: string; brand_rules: string; cta_style: string; offer: string; pricing: string; faqs: string;
};

const empty: BrandForm = { story: "", mission: "", vision: "", tone: "", writing_style: "", audience: "", brand_rules: "", cta_style: "", offer: "", pricing: "", faqs: "" };

function BrandPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["brand"], queryFn: () => getBrand() });
  const [form, setForm] = useState<BrandForm>(empty);

  useEffect(() => {
    if (!data) return;
    setForm({
      story: data.story ?? "", mission: data.mission ?? "", vision: data.vision ?? "",
      tone: data.tone ?? "", writing_style: data.writing_style ?? "", audience: data.audience ?? "",
      brand_rules: data.brand_rules ?? "", cta_style: data.cta_style ?? "", offer: data.offer ?? "",
      pricing: data.pricing ?? "", faqs: Array.isArray(data.faqs) ? (data.faqs as string[]).join("\n") : "",
    });
  }, [data]);

  const save = useMutation({
    mutationFn: () => saveBrand({
      data: {
        ...form,
        faqs: form.faqs.split("\n").map((s) => s.trim()).filter(Boolean),
      },
    }),
    onSuccess: () => { toast.success(t.common.saved); qc.invalidateQueries({ queryKey: ["brand"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof BrandForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (isLoading) return <div className="text-sm text-muted-foreground">{t.common.loading}</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.brand.title}</h1>
        <p className="text-sm text-muted-foreground">{t.brand.desc}</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{t.brand.title}</CardTitle><CardDescription>{t.brand.desc}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Field label={t.brand.story}><Textarea rows={4} value={form.story} onChange={set("story")} /></Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label={t.brand.mission}><Textarea rows={3} value={form.mission} onChange={set("mission")} /></Field>
            <Field label={t.brand.vision}><Textarea rows={3} value={form.vision} onChange={set("vision")} /></Field>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label={t.brand.tone}><Input value={form.tone} onChange={set("tone")} /></Field>
            <Field label={t.brand.writingStyle}><Input value={form.writing_style} onChange={set("writing_style")} /></Field>
          </div>
          <Field label={t.brand.audience}><Textarea rows={3} value={form.audience} onChange={set("audience")} /></Field>
          <Field label={t.brand.rules}><Textarea rows={3} value={form.brand_rules} onChange={set("brand_rules")} /></Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label={t.brand.cta}><Input value={form.cta_style} onChange={set("cta_style")} /></Field>
            <Field label={t.brand.pricing}><Input value={form.pricing} onChange={set("pricing")} /></Field>
          </div>
          <Field label={t.brand.offer}><Textarea rows={3} value={form.offer} onChange={set("offer")} /></Field>
          <Field label={t.brand.faqs}><Textarea rows={4} value={form.faqs} onChange={set("faqs")} /></Field>
          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? t.common.loading : t.common.save}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}
