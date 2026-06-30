import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCourses, createCourse, updateCourse, deleteCourse } from "@/lib/cfa.functions";
import { useT } from "@/i18n/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, GraduationCap, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/courses")({
  component: CoursesPage,
});

type Course = {
  id: string; name: string; overview: string | null; brand_memory: string | null;
  offer: string | null; price: string | null; bonus: string | null; audience: string | null;
  pain_points: string | null; transformation: string | null;
};

function CoursesPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const courses = useQuery({ queryKey: ["courses"], queryFn: () => listCourses() });
  const del = useMutation({
    mutationFn: (id: string) => deleteCourse({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.courses.title}</h1>
        <CourseDialog onSaved={() => qc.invalidateQueries({ queryKey: ["courses"] })} />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.isLoading && <div className="text-sm text-muted-foreground">{t.common.loading}</div>}
        {!courses.isLoading && (courses.data?.length ?? 0) === 0 && <div className="text-sm text-muted-foreground">{t.common.empty}</div>}
        {courses.data?.map((c) => (
          <Card key={c.id}>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="size-4 text-primary" />{c.name}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground line-clamp-3">{c.overview || c.brand_memory || "—"}</p>
              <div className="flex gap-2 justify-end">
                <CourseDialog initial={c} onSaved={() => qc.invalidateQueries({ queryKey: ["courses"] })} />
                <Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)}><Trash2 className="size-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CourseDialog({ initial, onSaved }: { initial?: Course; onSaved: () => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name ?? "", overview: initial?.overview ?? "", brand_memory: initial?.brand_memory ?? "",
    offer: initial?.offer ?? "", price: initial?.price ?? "", bonus: initial?.bonus ?? "",
    audience: initial?.audience ?? "", pain_points: initial?.pain_points ?? "", transformation: initial?.transformation ?? "",
  });
  const save = useMutation<unknown, Error>({
    mutationFn: async () => {
      if (initial) await updateCourse({ data: { id: initial.id, ...form } });
      else await createCourse({ data: form });
    },
    onSuccess: () => { toast.success(t.common.saved); onSaved(); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? <Button size="sm" variant="outline">{t.common.edit}</Button> : <Button><Plus className="size-4" /> {t.courses.new}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? t.common.edit : t.courses.new}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label={t.common.name}><Input value={form.name} onChange={set("name")} /></Field>
          <Field label={t.courses.overview}><Textarea rows={3} value={form.overview} onChange={set("overview")} /></Field>
          <Field label={t.courses.brandMemory}><Textarea rows={4} value={form.brand_memory} onChange={set("brand_memory")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.courses.offer}><Textarea rows={2} value={form.offer} onChange={set("offer")} /></Field>
            <Field label={t.courses.price}><Input value={form.price} onChange={set("price")} /></Field>
          </div>
          <Field label={t.courses.bonus}><Textarea rows={2} value={form.bonus} onChange={set("bonus")} /></Field>
          <Field label={t.courses.audience}><Textarea rows={2} value={form.audience} onChange={set("audience")} /></Field>
          <Field label={t.courses.pain}><Textarea rows={2} value={form.pain_points} onChange={set("pain_points")} /></Field>
          <Field label={t.courses.transformation}><Textarea rows={2} value={form.transformation} onChange={set("transformation")} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
          <Button onClick={() => save.mutate()} disabled={!form.name.trim() || save.isPending}>{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}
