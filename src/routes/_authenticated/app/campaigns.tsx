import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCampaigns, createCampaign, updateCampaign, deleteCampaign, getCampaign, upsertAsset, deleteAsset } from "@/lib/cfa.functions";
import { generateContent } from "@/lib/ai.functions";
import { useT } from "@/i18n/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Megaphone, Trash2, Sparkles, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/campaigns")({
  component: CampaignsPage,
});

const ASSET_TYPES = ["landing", "headline", "sales", "sms", "whatsapp", "facebook", "email", "video_script", "carousel", "ad", "comment_reply", "objection", "follow_up"];

function CampaignsPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: () => listCampaigns() });
  const del = useMutation({
    mutationFn: (id: string) => deleteCampaign({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  if (openId) return <CampaignDetail id={openId} onBack={() => setOpenId(null)} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.campaigns.title}</h1>
        <CampaignDialog onSaved={() => qc.invalidateQueries({ queryKey: ["campaigns"] })} />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.isLoading && <div className="text-sm text-muted-foreground">{t.common.loading}</div>}
        {!campaigns.isLoading && (campaigns.data?.length ?? 0) === 0 && <div className="text-sm text-muted-foreground">{t.common.empty}</div>}
        {campaigns.data?.map((c) => (
          <Card key={c.id} className="cursor-pointer hover:border-primary/40" onClick={() => setOpenId(c.id)}>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="size-4 text-primary" />{c.name}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground line-clamp-2">{c.notes || c.brand_memory || "—"}</p>
              <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                <CampaignDialog initial={c} onSaved={() => qc.invalidateQueries({ queryKey: ["campaigns"] })} />
                <Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)}><Trash2 className="size-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CampaignDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useT();
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ["campaign", id], queryFn: () => getCampaign({ data: { id } }) });
  const [open, setOpen] = useState(false);

  const delAsset = useMutation({
    mutationFn: (aid: string) => deleteAsset({ data: { id: aid } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaign", id] }),
  });

  if (detail.isLoading) return <div className="text-sm text-muted-foreground">{t.common.loading}</div>;
  const campaign = detail.data?.campaign;
  const assets = detail.data?.assets ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="size-4" /> {t.common.back}</Button>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{campaign?.name}</h1>
          <p className="text-sm text-muted-foreground">{campaign?.notes}</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="size-4" /> {t.campaigns.newAsset}</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {assets.length === 0 && <div className="text-sm text-muted-foreground">{t.common.empty}</div>}
        {assets.map((a) => (
          <Card key={a.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">{a.title || a.asset_type}</CardTitle>
              <Button size="icon" variant="ghost" onClick={() => delAsset.mutate(a.id)}><Trash2 className="size-3.5" /></Button>
            </CardHeader>
            <CardContent>
              <pre className="text-xs whitespace-pre-wrap font-sans text-muted-foreground line-clamp-6">{a.body}</pre>
            </CardContent>
          </Card>
        ))}
      </div>

      <AssetDialog open={open} onClose={() => setOpen(false)} campaignId={id} onSaved={() => qc.invalidateQueries({ queryKey: ["campaign", id] })} />
    </div>
  );
}

function AssetDialog({ open, onClose, campaignId, onSaved }: { open: boolean; onClose: () => void; campaignId: string; onSaved: () => void }) {
  const { t } = useT();
  const [type, setType] = useState("landing");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [instruction, setInstruction] = useState("");

  const generate = useMutation({
    mutationFn: () => generateContent({ data: { type, instruction, campaign_id: campaignId } }),
    onSuccess: (r) => { setBody(r.text); toast.success("Generated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () => upsertAsset({ data: { campaign_id: campaignId, asset_type: type, title, body } }),
    onSuccess: () => { toast.success(t.common.saved); onSaved(); onClose(); setTitle(""); setBody(""); setInstruction(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{t.campaigns.newAsset}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ASSET_TYPES.map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder={t.common.title} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Input placeholder="AI instruction" value={instruction} onChange={(e) => setInstruction(e.target.value)} />
            <Button type="button" variant="outline" onClick={() => generate.mutate()} disabled={!instruction.trim() || generate.isPending}>
              <Sparkles className="size-4" /> {generate.isPending ? t.common.generating : t.common.generate}
            </Button>
          </div>
          <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          <Button onClick={() => save.mutate()} disabled={!body.trim() || save.isPending}>{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Campaign = { id: string; name: string; brand_memory: string | null; start_date: string | null; notes: string | null };

function CampaignDialog({ initial, onSaved }: { initial?: Campaign; onSaved: () => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name ?? "", brand_memory: initial?.brand_memory ?? "",
    start_date: initial?.start_date ?? "", notes: initial?.notes ?? "",
  });
  const save = useMutation<unknown, Error>({
    mutationFn: async () => {
      if (initial) await updateCampaign({ data: { id: initial.id, ...form, start_date: form.start_date || null } });
      else await createCampaign({ data: { ...form, start_date: form.start_date || null } });
    },
    onSuccess: () => { toast.success(t.common.saved); onSaved(); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? <Button size="sm" variant="outline">{t.common.edit}</Button> : <Button><Plus className="size-4" /> {t.campaigns.new}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial ? t.common.edit : t.campaigns.new}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label={t.common.name}><Input value={form.name} onChange={set("name")} /></Field>
          <Field label={t.campaigns.startDate}><Input type="date" value={form.start_date ?? ""} onChange={set("start_date")} /></Field>
          <Field label={t.campaigns.brandMemory}><Textarea rows={4} value={form.brand_memory} onChange={set("brand_memory")} /></Field>
          <Field label={t.campaigns.notes}><Textarea rows={3} value={form.notes} onChange={set("notes")} /></Field>
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
