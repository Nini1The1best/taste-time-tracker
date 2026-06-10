import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Home, CalendarDays, History, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

const tabs = [
  { to: "/app", label: "Accueil", icon: Home, exact: true },
  { to: "/app/history", label: "Historique", icon: History, exact: false },
  { to: "/app/settings", label: "Réglages", icon: Settings, exact: false },
];

function AppShell() {
  const { pathname } = useLocation();
  const isPrint = pathname.includes("/print/");

  if (isPrint) return <Outlet />;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 md:pl-64">
      {/* desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-cream/40 px-4 py-6">
        <Link to="/app" className="flex items-center gap-2 px-2 mb-8">
          <span className="text-2xl">🍲</span>
          <span className="font-display text-xl font-semibold">Mijote</span>
        </Link>
        <nav className="space-y-1">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted"}`}>
                <t.icon className="h-4 w-4" /> {t.label}
              </Link>
            );
          })}
          <Link to="/app/plan/$weekId" params={{ weekId: "new" }} className="mt-4 flex items-center gap-3 rounded-xl bg-primary text-primary-foreground px-3 py-2.5 text-sm font-semibold hover:opacity-90 transition">
            <CalendarDays className="h-4 w-4" /> Nouvelle semaine
          </Link>
        </nav>
      </aside>

      <main className="px-4 py-4 md:px-10 md:py-8 max-w-5xl mx-auto md:mx-0">
        <Outlet />
      </main>

      {/* mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 max-w-md mx-auto">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${active ? "text-primary" : "text-foreground/60"}`}>
                <t.icon className="h-5 w-5" /> {t.label}
              </Link>
            );
          })}
          <Link to="/app/plan/$weekId" params={{ weekId: "new" }} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-primary">
            <span className="rounded-full bg-primary text-primary-foreground p-1.5"><CalendarDays className="h-4 w-4" /></span>
            Nouvelle
          </Link>
        </div>
      </nav>
    </div>
  );
}
