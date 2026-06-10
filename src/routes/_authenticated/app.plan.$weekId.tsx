import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getWeekFull,
  getOrCreateWeek,
  updateSlot,
  toggleDay,
  updateWeekTitle,
  deleteWeek,
} from "@/lib/weeks.functions";
import { DAY_LABELS, DAY_SHORT, SLOT_LABELS, formatWeekLabel, thisMondayISO } from "@/lib/week-utils";
import { ArrowRight, Check, Printer, ShoppingBasket, Trash2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/plan/$weekId")({
  component: PlanEditor,
});

function PlanEditor() {
  const { weekId } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const getOrCreate = useServerFn(getOrCreateWeek);

  // Handle "new" route: create or get a week for next Monday
  useEffect(() => {
    if (weekId === "new") {
      getOrCreate({ data: { startDate: thisMondayISO() } }).then(({ id }) => {
        navigate({ to: "/app/plan/$weekId", params: { weekId: id }, replace: true });
      });
    }
  }, [weekId, getOrCreate, navigate]);

  if (weekId === "new") return <div className="p-8 text-center text-muted-foreground">Préparation…</div>;

  return <PlanEditorInner weekId={weekId} qc={qc} router={router} />;
}

function PlanEditorInner({ weekId, qc, router }: { weekId: string; qc: ReturnType<typeof useQueryClient>; router: ReturnType<typeof useRouter> }) {
  const navigate = useNavigate();
  const fetchWeek = useServerFn(getWeekFull);
  const upSlot = useServerFn(updateSlot);
  const upDay = useServerFn(toggleDay);
  const upTitle = useServerFn(updateWeekTitle);
  const delWeek = useServerFn(deleteWeek);

  const { data, isLoading } = useQuery({
    queryKey: ["week", weekId],
    queryFn: () => fetchWeek({ data: { weekId } }),
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const slotMut = useMutation({
    mutationFn: (v: { id: string; enabled?: boolean; meal_name?: string }) => upSlot({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["week", weekId] }),
  });
  const dayMut = useMutation({
    mutationFn: (v: { weekId: string; day: number; enabled: boolean; slot?: "lunch" | "dinner" }) => upDay({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["week", weekId] }),
  });
  const titleMut = useMutation({
    mutationFn: (title: string) => upTitle({ data: { weekId, title } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["week", weekId] }),
  });
  const delMut = useMutation({
    mutationFn: () => delWeek({ data: { weekId } }),
    onSuccess: () => { toast.success("Semaine supprimée"); qc.invalidateQueries({ queryKey: ["weeks"] }); navigate({ to: "/app" }); },
  });

  if (isLoading || !data) return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;

  const { week, slots } = data;
  const slotByKey = (d: number, s: "lunch" | "dinner") => slots.find((sl) => sl.day_of_week === d && sl.slot === s);
  const dayEnabled = (d: number) => slots.some((s) => s.day_of_week === d && s.enabled);
  const activeSlots = slots.filter((s) => s.enabled);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/app" className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition"><ChevronLeft className="h-5 w-5" /></Link>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">{formatWeekLabel(week.start_date)}</div>
          <TitleEditor value={week.title ?? ""} onSave={(t) => titleMut.mutate(t)} />
        </div>
        <button onClick={() => { if (confirm("Supprimer cette semaine ?")) delMut.mutate(); }} className="text-muted-foreground hover:text-destructive p-2 rounded-full hover:bg-destructive/10 transition"><Trash2 className="h-4 w-4" /></button>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 rounded-full bg-muted p-1 max-w-md">
        {[
          { n: 1, label: "Jours" },
          { n: 2, label: "Repas" },
          { n: 3, label: "Résumé" },
        ].map((s) => (
          <button key={s.n} onClick={() => setStep(s.n as 1 | 2 | 3)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${step === s.n ? "bg-card shadow-soft" : "text-muted-foreground"}`}>
            {s.n}. {s.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
            <p className="text-sm text-muted-foreground">Active les jours et créneaux que tu veux planifier.</p>
            <div className="space-y-2">
              {DAY_LABELS.map((label, d) => {
                const lunch = slotByKey(d, "lunch");
                const dinner = slotByKey(d, "dinner");
                const anyOn = lunch?.enabled || dinner?.enabled;
                return (
                  <div key={d} className={`rounded-2xl border p-4 transition ${anyOn ? "bg-card border-border" : "bg-muted/40 border-transparent"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium">{label}</div>
                      <button onClick={() => dayMut.mutate({ weekId, day: d, enabled: !anyOn })} className={`text-xs font-semibold rounded-full px-3 py-1 transition ${anyOn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {anyOn ? "Actif" : "Désactivé"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(["lunch", "dinner"] as const).map((kind) => {
                        const sl = slotByKey(d, kind);
                        if (!sl) return null;
                        return (
                          <button key={kind} onClick={() => dayMut.mutate({ weekId, day: d, slot: kind, enabled: !sl.enabled })}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${sl.enabled ? "bg-accent/60 text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                            <span>{SLOT_LABELS[kind]}</span>
                            {sl.enabled && <Check className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setStep(2)} className="w-full md:w-auto rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition">
              Suivant <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
            <p className="text-sm text-muted-foreground">Saisis tes repas. Tout s'enregistre tout seul.</p>
            {!activeSlots.length && <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">Aucun créneau activé. Reviens à l'étape 1.</div>}
            <div className="space-y-2">
              {activeSlots.map((sl) => (
                <MealRow key={sl.id} slot={sl} onSave={(name) => slotMut.mutate({ id: sl.id, meal_name: name })} />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="rounded-full border border-border px-5 py-3 text-sm font-medium hover:bg-muted transition">Retour</button>
              <button onClick={() => setStep(3)} className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition">
                Résumé <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
            <div className="rounded-3xl bg-card border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left p-3">Jour</th>
                    <th className="text-left p-3">Midi</th>
                    <th className="text-left p-3">Soir</th>
                  </tr>
                </thead>
                <tbody>
                  {DAY_LABELS.map((label, d) => {
                    const l = slotByKey(d, "lunch");
                    const dn = slotByKey(d, "dinner");
                    if (!l?.enabled && !dn?.enabled) return null;
                    return (
                      <tr key={d} className="border-t border-border/50">
                        <td className="p-3 font-medium"><span className="md:hidden">{DAY_SHORT[d]}</span><span className="hidden md:inline">{label}</span></td>
                        <td className="p-3 text-foreground/80">{l?.enabled ? (l.meal_name || <em className="text-muted-foreground">à définir</em>) : <span className="text-muted-foreground">—</span>}</td>
                        <td className="p-3 text-foreground/80">{dn?.enabled ? (dn.meal_name || <em className="text-muted-foreground">à définir</em>) : <span className="text-muted-foreground">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/app/plan/$weekId/courses" params={{ weekId }} className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition">
                <ShoppingBasket className="h-4 w-4" /> Liste de courses
              </Link>
              <Link to="/app/print/$weekId" params={{ weekId }} className="rounded-full border border-border px-5 py-3 text-sm font-medium inline-flex items-center gap-2 hover:bg-muted transition">
                <Printer className="h-4 w-4" /> Imprimer / PDF
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TitleEditor({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      placeholder="Donne un nom à ta semaine…"
      className="w-full bg-transparent font-display text-2xl md:text-3xl font-semibold focus:outline-none placeholder:text-muted-foreground/60"
    />
  );
}

function MealRow({ slot, onSave }: { slot: { id: string; day_of_week: number; slot: "lunch" | "dinner"; meal_name: string }; onSave: (n: string) => void }) {
  const [v, setV] = useState(slot.meal_name);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setV(slot.meal_name); }, [slot.meal_name]);

  const onChange = (next: string) => {
    setV(next);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => { if (next !== slot.meal_name) onSave(next); }, 500);
  };
  return (
    <motion.div layout className="rounded-2xl bg-card border border-border/60 p-3 flex items-center gap-3">
      <div className="w-20 shrink-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{DAY_SHORT[slot.day_of_week]}</div>
        <div className="text-xs font-medium">{SLOT_LABELS[slot.slot]}</div>
      </div>
      <input
        value={v} onChange={(e) => onChange(e.target.value)}
        placeholder={slot.slot === "lunch" ? "ex: Pâtes carbo" : "ex: Pizza"}
        className="flex-1 bg-transparent text-sm focus:outline-none"
      />
    </motion.div>
  );
}
