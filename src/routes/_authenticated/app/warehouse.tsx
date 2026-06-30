import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listContent, listFolders, createFolder, createContent, deleteContent, toggleFavorite, updateContent } from "@/lib/cfa.functions";
import { generateContent } from "@/lib/ai.functions";
import { useT } from "@/i18n/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Star, Trash2, Sparkles, FolderPlus, Folder } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/warehouse")({
  component: WarehousePage,
});

const TYPES = ["note", "facebook", "sms", "whatsapp", "email", "blog", "landing", "video_script", "carousel", "caption", "comment_reply", "offer", "sales", "headline", "cta"];

function WarehousePage() {
  const { t } = useT();
  const qc = useQueryClient();
  const [folderId, setFolderId] = useState<string | null>(null);

  const folders = useQuery({ queryKey: ["folders"], queryFn: () => listFolders() });
  const items = useQuery({
    queryKey: ["content", folderId],
    queryFn: () => listContent({ data: { folderId } }),
  });

  const newFolder = useMutation({
    mutationFn: (name: string) => createFolder({ data: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["folders"] }),
  });

  const [folderName, setFolderName] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t.warehouse.title}</h1>
        </div>
        <NewContentDialog folderId={folderId} onCreated={() => qc.invalidateQueries({ queryKey: ["content"] })} />
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              {t.warehouse.folders}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button onClick={() => setFolderId(null)} className={`w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent ${folderId === null ? "bg-accent" : ""}`}>{t.warehouse.allItems}</button>
            {(folders.data ?? []).map((f) => (
              <button key={f.id} onClick={() => setFolderId(f.id)} className={`w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent flex items-center gap-2 ${folderId === f.id ? "bg-accent" : ""}`}>
                <Folder className="size-3.5" />{f.name}
              </button>
            ))}
            <div className="pt-2 border-t flex gap-2">
              <Input placeholder={t.warehouse.newFolder} value={folderName} onChange={(e) => setFolderName(e.target.value)} className="h-8 text-sm" />
              <Button size="sm" variant="outline" disabled={!folderName.trim()} onClick={() => { newFolder.mutate(folderName); setFolderName(""); }}>
                <FolderPlus className="size-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {items.isLoading && <div className="text-sm text-muted-foreground">{t.common.loading}</div>}
          {!items.isLoading && (items.data?.length ?? 0) === 0 && <div className="text-sm text-muted-foreground">{t.common.empty}</div>}
          {items.data?.map((it) => (
            <ContentRow key={it.id} item={it} onChange={() => qc.invalidateQueries({ queryKey: ["content"] })} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentRow({ item, onChange }: { item: { id: string; title: string; body: string; content_type: string; is_favorite: boolean; tags: string[] }; onChange: () => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const [type, setType] = useState(item.content_type);
  const [tags, setTags] = useState((item.tags ?? []).join(", "));

  const save = useMutation({
    mutationFn: () => updateContent({ data: { id: item.id, title, body, content_type: type, tags: tags.split(",").map((s) => s.trim()).filter(Boolean) } }),
    onSuccess: () => { toast.success(t.common.saved); onChange(); setOpen(false); },
  });
  const del = useMutation({
    mutationFn: () => deleteContent({ data: { id: item.id } }),
    onSuccess: () => onChange(),
  });
  const fav = useMutation({
    mutationFn: () => toggleFavorite({ data: { id: item.id, value: !item.is_favorite } }),
    onSuccess: () => onChange(),
  });

  return (
    <Card>
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <button className="text-left flex-1 min-w-0" onClick={() => setOpen(true)}>
          <div className="font-medium truncate">{item.title}</div>
          <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.body}</div>
          <div className="flex gap-1 mt-2">
            <Badge variant="secondary" className="text-[10px]">{item.content_type}</Badge>
            {(item.tags ?? []).slice(0, 4).map((tag) => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
          </div>
        </button>
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" onClick={() => fav.mutate()}>
            <Star className={`size-4 ${item.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => del.mutate()}><Trash2 className="size-4" /></Button>
        </div>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t.common.edit}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder={t.warehouse.tags} value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function NewContentDialog({ folderId, onCreated }: { folderId: string | null; onCreated: () => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("note");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [instruction, setInstruction] = useState("");

  const create = useMutation({
    mutationFn: () => createContent({ data: { title, body, content_type: type, tags: tags.split(",").map((s) => s.trim()).filter(Boolean), folder_id: folderId } }),
    onSuccess: () => { toast.success(t.common.saved); onCreated(); setOpen(false); setTitle(""); setBody(""); setTags(""); setInstruction(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const generate = useMutation({
    mutationFn: () => generateContent({ data: { type, instruction } }),
    onSuccess: (r) => { setBody(r.text); toast.success("Generated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4" /> {t.warehouse.newItem}</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{t.warehouse.newItem}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder={t.common.title} value={title} onChange={(e) => setTitle(e.target.value)} />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input placeholder={t.warehouse.tags} value={tags} onChange={(e) => setTags(e.target.value)} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">AI instruction (optional)</Label>
            <div className="flex gap-2">
              <Input placeholder="e.g. write a launch SMS for tonight's webinar" value={instruction} onChange={(e) => setInstruction(e.target.value)} />
              <Button type="button" variant="outline" onClick={() => generate.mutate()} disabled={!instruction.trim() || generate.isPending}>
                <Sparkles className="size-4" /> {generate.isPending ? t.common.generating : t.common.generate}
              </Button>
            </div>
          </div>
          <Textarea rows={10} placeholder={t.common.body} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
          <Button onClick={() => create.mutate()} disabled={!title.trim() || create.isPending}>{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
