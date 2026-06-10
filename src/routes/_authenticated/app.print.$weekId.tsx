import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getWeekFull } from "@/lib/weeks.functions";
import { DAY_LABELS, formatWeekLabel, SLOT_LABELS } from "@/lib/week-utils";
import { Printer, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/print/$weekId")({
  component: PrintPage,
});

function PrintPage() {
  const { weekId } = Route.useParams();
  const fetch = useServerFn(getWeekFull);
  const { data } = useQuery({ queryKey: ["week", weekId], queryFn: () => fetch({ data: { weekId } }) });

  useEffect(() => { document.title = data?.week.title ? `${data.week.title} — Mijote` : "Planning — Mijote"; }, [data]);

  if (!data) return <div className="p-10 text-center text-muted-foreground">Chargement…</div>;

  const { week, slots } = data;
  const slotByKey = (d: number, s: "lunch" | "dinner") => slots.find((sl) => sl.day_of_week === d && sl.slot === s);

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print sticky top-0 z-10 glass border-b border-border/60 px-4 py-3 flex items-center gap-2">
        <Link to="/app/plan/$weekId" params={{ weekId }} className="p-2 rounded-full hover:bg-muted transition"><ChevronLeft className="h-5 w-5" /></Link>
        <div className="flex-1 text-sm font-medium">Aperçu impression</div>
        <button onClick={() => window.print()} className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold inline-flex items-center gap-2 hover:opacity-90 transition">
          <Printer className="h-3.5 w-3.5" /> Imprimer / PDF
        </button>
      </div>

      <article className="max-w-3xl mx-auto p-8 md:p-12">
        <header className="text-center mb-8 border-b border-foreground/10 pb-6">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Semaine du</div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold mt-1">{week.title || formatWeekLabel(week.start_date)}</h1>
          {week.title && <div className="text-sm text-muted-foreground mt-1">{formatWeekLabel(week.start_date)}</div>}
        </header>
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground">
              <th className="text-left py-2 w-32">Jour</th>
              <th className="text-left py-2">{SLOT_LABELS.lunch}</th>
              <th className="text-left py-2">{SLOT_LABELS.dinner}</th>
            </tr>
          </thead>
          <tbody>
            {DAY_LABELS.map((label, d) => {
              const l = slotByKey(d, "lunch");
              const dn = slotByKey(d, "dinner");
              if (!l?.enabled && !dn?.enabled) return null;
              return (
                <tr key={d} className="border-t border-foreground/10">
                  <td className="py-3 font-display font-semibold">{label}</td>
                  <td className="py-3">{l?.enabled ? (l.meal_name || "—") : <span className="text-muted-foreground">—</span>}</td>
                  <td className="py-3">{dn?.enabled ? (dn.meal_name || "—") : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <footer className="mt-12 text-center text-xs text-muted-foreground">🍲 Mijote</footer>
      </article>
    </div>
  );
}
