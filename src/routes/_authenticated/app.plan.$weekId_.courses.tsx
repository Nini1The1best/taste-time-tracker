import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getWeekFull, replaceIngredients } from "@/lib/weeks.functions";
import { generateShoppingList, saveCheckedItems } from "@/lib/shopping.functions";
import { formatShoppingText, groupByCategory } from "@/lib/shopping-merge";
import { DAY_SHORT, SLOT_LABELS } from "@/lib/week-utils";
import { ChevronLeft, Plus, Share2, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/plan/$weekId_/courses")({
  component: CoursesPage,
});

function CoursesPage() {
  const { weekId } = Route.useParams();
  const qc = useQueryClient();
  const fetchWeek = useServerFn(getWeekFull);
  const fetchList = useServerFn(generateShoppingList);
  const saveIng = useServerFn(replaceIngredients);
  const saveChecked = useServerFn(saveCheckedItems);

  const { data: week } = useQuery({ queryKey: ["week", weekId], queryFn: () => fetchWeek({ data: { weekId } }) });
  const { data: list } = useQuery({ queryKey: ["shopping", weekId], queryFn: () => fetchList({ data: { weekId } }) });

  const ingMut = useMutation({
    mutationFn: (v: { mealSlotId: string; items: { name: string; quantity?: string }[] }) => saveIng({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["week", weekId] }); qc.invalidateQueries({ queryKey: ["shopping", weekId] }); },
  });

  const checkMut = useMutation({
    mutationFn: (checked: string[]) => saveChecked({ data: { weekId, checked } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping", weekId] }),
  });

  if (!week) return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;

  const enabledSlots = week.slots.filter((s) => s.enabled && s.meal_name.trim());
  const ingsBySlot: Record<string, { name: string; quantity: string | null }[]> = {};
  for (const i of week.ingredients) (ingsBySlot[i.meal_slot_id] ||= []).push({ name: i.name, quantity: i.quantity });

  const grouped = list ? groupByCategory(list.items) : {};
  const checkedSet = new Set(list?.checked ?? []);
  const toggleCheck = (key: string) => {
    const next = new Set(checkedSet);
    if (next.has(key)) next.delete(key); else next.add(key);
    checkMut.mutate(Array.from(next));
  };

  const share = async () => {
    if (!list) return;
    const text = `🛒 Liste de courses\n\n${formatShoppingText(list.items)}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Liste de courses", text }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    toast.success("Copiée dans le presse-papier");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/app/plan/$weekId" params={{ weekId }} className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition"><ChevronLeft className="h-5 w-5" /></Link>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest">Étape 4</div>
          <h1 className="font-display text-3xl font-semibold">Tes ingrédients</h1>
        </div>
      </div>

      {!enabledSlots.length ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">Aucun repas saisi. Retourne au planning d'abord.</div>
      ) : (
        <div className="space-y-3">
          {enabledSlots.map((sl) => (
            <IngredientBlock
              key={sl.id}
              slot={sl}
              initial={ingsBySlot[sl.id] ?? []}
              onSave={(items) => ingMut.mutate({ mealSlotId: sl.id, items })}
            />
          ))}
        </div>
      )}

      {list && list.items.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-card border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">🛒 Ta liste</h2>
            <div className="flex gap-1">
              <button onClick={share} className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition">
                <Share2 className="h-3.5 w-3.5" /> Partager
              </button>
              <button onClick={async () => { await navigator.clipboard.writeText(formatShoppingText(list.items)); toast.success("Copiée"); }} className="rounded-full border border-border p-2 hover:bg-muted transition" title="Copier"><Copy className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">{cat}</div>
              <div className="space-y-1">
                {items.map((it) => {
                  const checked = checkedSet.has(it.key);
                  return (
                    <button key={it.key} onClick={() => toggleCheck(it.key)} className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/60 transition text-left">
                      <span className={`h-5 w-5 rounded-md border flex items-center justify-center transition ${checked ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                        {checked && <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                      </span>
                      <span className={`flex-1 text-sm ${checked ? "line-through text-muted-foreground" : ""}`}>
                        {it.name}
                        {it.quantities.length > 0 && <span className="text-muted-foreground ml-1.5">({it.quantities.join(" + ")})</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.section>
      )}
    </div>
  );
}

function IngredientBlock({
  slot, initial, onSave,
}: {
  slot: { id: string; day_of_week: number; slot: "lunch" | "dinner"; meal_name: string };
  initial: { name: string; quantity: string | null }[];
  onSave: (items: { name: string; quantity?: string }[]) => void;
}) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");

  useEffect(() => { setItems(initial); }, [initial]);

  const commit = (next: typeof items) => {
    setItems(next);
    onSave(next.map((i) => ({ name: i.name, quantity: i.quantity ?? undefined })));
  };

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    commit([...items, { name: trimmed, quantity: null }]);
    setDraft("");
  };

  const remove = (idx: number) => commit(items.filter((_, i) => i !== idx));

  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4">
      <div className="flex items-baseline gap-2 mb-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{DAY_SHORT[slot.day_of_week]} · {SLOT_LABELS[slot.slot]}</div>
        <div className="font-medium">{slot.meal_name}</div>
      </div>
      <div className="space-y-1 mb-2">
        {items.map((it, idx) => (
          <motion.div layout key={idx} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="flex-1">{it.name}{it.quantity ? <span className="text-muted-foreground"> · {it.quantity}</span> : null}</span>
            <button onClick={() => remove(idx)} className="text-muted-foreground hover:text-destructive p-1 rounded transition"><Trash2 className="h-3.5 w-3.5" /></button>
          </motion.div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Ajouter un ingrédient + Entrée"
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button onClick={add} className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:opacity-90 transition"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
