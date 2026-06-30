import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, FolderTree, MessageSquare, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/LanguageProvider";
import { LanguageToggle } from "@/components/language-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ContentFlow AI — Your AI-powered content warehouse" },
      { name: "description", content: "Store every piece of content, codify your brand, and let AI generate on-brand campaigns, courses, and copy in seconds." },
      { property: "og:title", content: "ContentFlow AI" },
      { property: "og:description", content: "AI-powered content warehouse and marketing operating system." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useT();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="size-4 text-primary" />
            </div>
            {t.appName}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button asChild variant="ghost"><Link to="/auth">{t.landing.signIn}</Link></Button>
            <Button asChild><Link to="/auth">{t.landing.getStarted}</Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-4xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
            <Sparkles className="size-3 text-primary" /> {t.tagline}
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-balance">
            {t.landing.heroTitle}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">{t.landing.heroSub}</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg"><Link to="/auth">{t.landing.getStarted}</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth">{t.landing.signIn}</Link></Button>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
          {[
            { icon: Sparkles, title: t.landing.f1Title, desc: t.landing.f1Desc },
            { icon: FolderTree, title: t.landing.f2Title, desc: t.landing.f2Desc },
            { icon: Wand2, title: t.landing.f3Title, desc: t.landing.f3Desc },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="size-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} {t.appName}</span>
          <span className="flex items-center gap-1"><MessageSquare className="size-3" /> AI-powered</span>
        </div>
      </footer>
    </div>
  );
}
