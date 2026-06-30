import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/cfa.functions";
import { useT } from "@/i18n/LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, GraduationCap, Megaphone, MessageSquare, FileText, FolderTree, Sparkles, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: DashboardPage,
});

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="size-5 text-primary" />
        </div>
        <div>
          <div className="text-2xl font-semibold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { t } = useT();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardStats() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.nav.dashboard}</h1>
        <p className="text-sm text-muted-foreground">{t.tagline}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t.dashboard.totalCourses} value={data?.courses ?? 0} icon={GraduationCap} />
        <StatCard label={t.dashboard.totalCampaigns} value={data?.campaigns ?? 0} icon={Megaphone} />
        <StatCard label={t.dashboard.totalContent} value={data?.content ?? 0} icon={FolderTree} />
        <StatCard label={t.dashboard.totalPrompts} value={data?.prompts ?? 0} icon={FileText} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.dashboard.quickActions}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/app/brand"><Building2 /> {t.dashboard.createBrand}</Link></Button>
          <Button asChild variant="outline"><Link to="/app/courses"><GraduationCap /> {t.dashboard.newCourse}</Link></Button>
          <Button asChild variant="outline"><Link to="/app/campaigns"><Megaphone /> {t.dashboard.newCampaign}</Link></Button>
          <Button asChild><Link to="/app/chat"><MessageSquare /> {t.dashboard.openChat}</Link></Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="size-4" /> {t.dashboard.recent}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <div className="text-sm text-muted-foreground">{t.common.loading}</div>}
            {!isLoading && (data?.recent.length ?? 0) === 0 && <div className="text-sm text-muted-foreground">{t.common.empty}</div>}
            {data?.recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                <span className="truncate">{r.title}</span>
                <span className="text-xs text-muted-foreground">{r.content_type}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="size-4" /> {t.dashboard.favorites}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!isLoading && (data?.favorites.length ?? 0) === 0 && <div className="text-sm text-muted-foreground">{t.common.empty}</div>}
            {data?.favorites.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                <span className="truncate">{r.title}</span>
                <span className="text-xs text-muted-foreground">{r.content_type}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
