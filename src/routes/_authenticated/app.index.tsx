import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { listWeeks, getOrCreateWeek } from "@/lib/weeks.functions";
import { thisMondayISO, nextMondayISO, formatWeekLabel } from "@/lib/week-utils";
import { CalendarPlus, ChevronRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const fetchWeeks = useServerFn(listWeeks);
  const createWeek = useServerFn(getOrCreateWeek);

  const { data: weeks } = useQuery({ queryKey: ["weeks"], queryFn: () => fetchWeeks() });

  const startWeek = useMutation({
    mutationFn: (startDate: string) => createWeek({ data: { startDate } }),
    onSuccess: ({ id }) => navigate({ to: "/app/plan/$weekId", params: { weekId: id } }),
  });

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-8">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{today}</div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold mt-1">Bonjour 👋</h1>
        <p className="text-muted-foreground mt-2">Qu'est-ce qu'on mijote cette semaine ?</p>
      </motion.header>

      <div className="grid md:grid-cols-2 gap-3">
        <button onClick={() => startWeek.mutate(thisMondayISO())} className="group rounded-3xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-6 text-left shadow-soft hover:shadow-pop transition">
          <CalendarPlus className="h-6 w-6 mb-3" />
          <div className="font-display text-xl font-semibold">Cette semaine</div>
          <div className="text-sm opacity-90 mt-1">{formatWeekLabel(thisMondayISO())}</div>
          <div className="mt-4 text-xs font-medium flex items-center gap-1 opacity-90 group-hover:opacity-100">Démarrer <ChevronRight className="h-3 w-3" /></div>
        </button>
        <button onClick={() => startWeek.mutate(nextMondayISO())} className="group rounded-3xl bg-card border border-border p-6 text-left shadow-soft hover:shadow-pop transition">
          <Sparkles className="h-6 w-6 mb-3 text-sage" />
          <div className="font-display text-xl font-semibold">Semaine prochaine</div>
          <div className="text-sm text-muted-foreground mt-1">{formatWeekLabel(nextMondayISO())}</div>
          <div className="mt-4 text-xs font-medium flex items-center gap-1 text-foreground/70 group-hover:text-foreground">Planifier <ChevronRight className="h-3 w-3" /></div>
        </button>
      </div>

      <section>
        <h2 className="font-display text-2xl font-semibold mb-3">Tes semaines</h2>
        {!weeks?.length ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
            <div className="text-3xl mb-2">🍳</div>
            Aucune semaine pour l'instant. Commence en haut !
          </div>
        ) : (
          <div className="space-y-2">
            {weeks.slice(0, 6).map((w) => (
              <Link key={w.id} to="/app/plan/$weekId" params={{ weekId: w.id }} className="flex items-center justify-between rounded-2xl bg-card border border-border/60 p-4 hover:border-primary/40 hover:shadow-soft transition">
                <div>
                  <div className="font-medium">{w.title || formatWeekLabel(w.start_date)}</div>
                  <div className="text-xs text-muted-foreground">{formatWeekLabel(w.start_date)}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
