import type { ReactNode } from "react";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Sparkles, FolderTree, GraduationCap, Megaphone, MessageSquare, Library, FileText, Search, Building2, LogOut } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useT();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b flex items-center px-3 gap-2 sticky top-0 bg-background/80 backdrop-blur z-10">
            <SidebarTrigger />
            <div className="flex-1" />
            <LanguageToggle />
            <SignOutButton />
          </header>
          <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar() {
  const { t } = useT();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const items = [
    { url: "/app", icon: LayoutDashboard, label: t.nav.dashboard },
    { url: "/app/brand", icon: Building2, label: t.nav.brand },
    { url: "/app/warehouse", icon: FolderTree, label: t.nav.warehouse },
    { url: "/app/courses", icon: GraduationCap, label: t.nav.courses },
    { url: "/app/campaigns", icon: Megaphone, label: t.nav.campaigns },
    { url: "/app/chat", icon: MessageSquare, label: t.nav.chat },
    { url: "/app/prompts", icon: Library, label: t.nav.prompts },
    { url: "/app/templates", icon: FileText, label: t.nav.templates },
    { url: "/app/search", icon: Search, label: t.nav.search },
  ];
  const isActive = (url: string) => (url === "/app" ? pathname === "/app" : pathname.startsWith(url));
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/app" className="flex items-center gap-2 px-2 py-1.5 font-semibold">
          <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="size-4 text-primary" />
          </div>
          <span className="truncate">{t.appName}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t.nav.dashboard}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={isActive(it.url)}>
                    <Link to={it.url}>
                      <it.icon />
                      <span>{it.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="text-xs text-muted-foreground px-2 py-1">{t.tagline}</div>
      </SidebarFooter>
    </Sidebar>
  );
}

function SignOutButton() {
  const { t } = useT();
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await qc.cancelQueries();
        qc.clear();
        await supabase.auth.signOut();
        navigate({ to: "/auth", replace: true });
      }}
    >
      <LogOut className="size-4" />
      <span className="sr-only">{t.common.signOut}</span>
    </Button>
  );
}
