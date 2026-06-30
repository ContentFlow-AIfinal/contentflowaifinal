import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useT } from "@/i18n/LanguageProvider";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ContentFlow AI" },
      { name: "description", content: "Sign in to your ContentFlow AI workspace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useT();
  const router = useRouter();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app" });
    });
  }, [navigate]);

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/app" },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to confirm if required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await router.invalidate();
      navigate({ to: "/app" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/app" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="size-4 text-primary" />
            </div>
            <span className="font-semibold">{t.appName}</span>
          </div>
          <CardTitle>{mode === "in" ? t.auth.welcome : t.auth.create}</CardTitle>
          <CardDescription>{t.tagline}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={busy}>
            {t.auth.continueGoogle}
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={onEmailSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">{t.auth.password}</Label>
              <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "in" ? t.auth.signIn : t.auth.signUp}
            </Button>
          </form>
          <div className="text-sm text-center text-muted-foreground">
            {mode === "in" ? t.auth.noAccount : t.auth.haveAccount}{" "}
            <button className="text-primary hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? t.auth.signUp : t.auth.signIn}
            </button>
          </div>
          <div className="text-center text-sm">
            <Link to="/" className="text-muted-foreground hover:underline">← {t.common.back}</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
