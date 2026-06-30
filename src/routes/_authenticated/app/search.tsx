import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { searchContent } from "@/lib/cfa.functions";
import { useT } from "@/i18n/LanguageProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search as SearchIcon } from "lucide-react";
import { useState } from "react";

const TYPES = ["", "note", "facebook", "sms", "whatsapp", "email", "blog", "landing", "video_script", "carousel", "caption", "comment_reply", "offer", "sales", "headline", "cta"];

export const Route = createFileRoute("/_authenticated/app/search")({
  component: SearchPage,
});

function SearchPage() {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [favs, setFavs] = useState(false);
  const results = useQuery({
    queryKey: ["search", q, type, favs],
    queryFn: () => searchContent({ data: { q, type: type || undefined, favoritesOnly: favs } }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t.search.title}</h1>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <SearchIcon className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder={t.search.placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex gap-3 items-center">
            <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder={t.search.filterType} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.warehouse.allItems}</SelectItem>
                {TYPES.filter(Boolean).map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox id="favs" checked={favs} onCheckedChange={(v) => setFavs(!!v)} />
              <Label htmlFor="favs" className="text-sm">{t.search.filterFavorite}</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {results.isLoading && <div className="text-sm text-muted-foreground">{t.common.loading}</div>}
        {!results.isLoading && (results.data?.length ?? 0) === 0 && <div className="text-sm text-muted-foreground">{t.common.empty}</div>}
        {results.data?.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium truncate">{r.title}</div>
                <Badge variant="secondary" className="text-[10px]">{r.content_type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
