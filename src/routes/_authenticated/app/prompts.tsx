import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPrompts, createPrompt, deletePrompt } from "@/lib/cfa.functions";
import { useT } from "@/i18n/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/prompts")({
  component: PromptsPage,
});

function PromptsPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const prompts = useQuery({ queryKey: ["prompts"], queryFn: () => listPrompts() });
  const del = useMutation({
    mutationFn: (id: string) => deletePrompt({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prompts"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.prompts.title}</h1>
        <NewPrompt onSaved={() => qc.invalidateQueries({ queryKey: ["prompts"] })} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {prompts.isLoading && <div className="text-sm text-muted-foreground">{t.common.loading}</div>}
        {!prompts.isLoading && (prompts.data?.length ?? 0) === 0 && <div className="text-sm text-muted-foreground">{t.common.empty}</div>}
        {prompts.data?.map((p) => (
          <Card key={p.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">{p.title}</CardTitle>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(p.body); toast.success(t.common.copied); }}><Copy className="size-3.5" /></Button>
                {p.user_id && <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}><Trash2 className="size-3.5" /></Button>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{p.category}</div>
              <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground line-clamp-6">{p.body}</pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NewPrompt({ onSaved }: { onSaved: () => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const save = useMutation({
    mutationFn: () => createPrompt({ data: { title, body, category: category || null } }),
    onSuccess: () => { onSaved(); setOpen(false); setTitle(""); setBody(""); setCategory(""); toast.success(t.common.saved); },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4" /> {t.prompts.new}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t.prompts.new}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder={t.common.title} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder={t.prompts.category} value={category} onChange={(e) => setCategory(e.target.value)} />
          <Textarea rows={8} placeholder={t.common.body} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
          <Button onClick={() => save.mutate()} disabled={!title.trim() || !body.trim()}>{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
