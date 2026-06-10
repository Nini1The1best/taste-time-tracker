import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listWeeks, duplicateWeek, searchMeals, mealStats } from "@/lib/weeks.functions";
import { formatWeekLabel, nextMondayISO } from "@/lib/week-utils";
import { Copy, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchWeeks = useServerFn(listWeeks);
  const fetchStats = useServerFn(mealStats);
  const dup = useServerFn(duplicateWeek);
  const search = useServerFn(searchMeals);

  const [q, setQ] = useState("");

  const { data: weeks } = useQuery({ queryKey: ["weeks"], queryFn: () => fetchWeeks() });
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats() });
  const { data: results } = useQuery({
    queryKey: ["search", q],
    queryFn: () => search({ data: { q } }),
    enabled: q.trim().length > 1,
  });

  const dupMut = useMutation({
    mutationFn: (sourceWeekId: string) => dup({ data: { sourceWeekId, targetStartDate: nextMondayISO() } }),
    onSuccess: ({ id }) => { toast.success("Semaine dupliquée"); qc.invalidateQueries({ queryKey: ["weeks"] }); navigate({ to: "/app/plan/$weekId", params: { weekId: id } }); },
  });

  const filtered = useMemo(() => weeks ?? [], [weeks]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl md:text-4xl font-semibold">Historique</h1>
        <p className="text-muted-foreground text-sm mt-1">Retrouve tes anciennes semaines, duplique, statistiques.</p>
      </header>

      {stats && stats.totalMeals > 0 && (
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="text-2xl font-display font-semibold">{stats.totalMeals}</div>
            <div className="text-xs text-muted-foreground">Repas planifiés</div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="text-2xl font-display font-semibold">{stats.distinctMeals}</div>
            <div className="text-xs text-muted-foreground">Plats différents</div>
          </div>
          {stats.top.length > 0 && (
            <div className="col-span-2 rounded-2xl bg-card border border-border p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Tes incontournables</div>
              <div className="flex flex-wrap gap-1.5">
                {stats.top.slice(0, 8).map((t) => (
                  <span key={t.name} className="rounded-full bg-accent/60 text-accent-foreground px-3 py-1 text-xs">{t.name} <span className="text-accent-foreground/70">·{t.count}</span></span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="space-y-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un repas passé…"
            className="w-full rounded-2xl border border-input bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {q.trim().length > 1 && results && (
          <div className="rounded-2xl bg-card border border-border divide-y divide-border/50">
            {results.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Aucun résultat</div>
            ) : results.map((r) => (
              <Link key={r.id} to="/app/plan/$weekId" params={{ weekId: r.week.id }} className="flex items-center justify-between p-3 hover:bg-muted/40 transition">
                <div>
                  <div className="text-sm font-medium">{r.meal_name}</div>
                  <div className="text-xs text-muted-foreground">{formatWeekLabel(r.week.start_date)}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">Toutes tes semaines</h2>
        {!filtered.length ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Rien ici pour l'instant.</div>
        ) : filtered.map((w) => (
          <div key={w.id} className="flex items-center justify-between rounded-2xl bg-card border border-border/60 p-4 hover:border-primary/40 transition">
            <Link to="/app/plan/$weekId" params={{ weekId: w.id }} className="flex-1 min-w-0">
              <div className="font-medium truncate">{w.title || formatWeekLabel(w.start_date)}</div>
              <div className="text-xs text-muted-foreground">{formatWeekLabel(w.start_date)}</div>
            </Link>
            <button onClick={() => dupMut.mutate(w.id)} className="text-muted-foreground hover:text-primary p-2 rounded-full hover:bg-primary/10 transition" title="Dupliquer pour la semaine prochaine">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
