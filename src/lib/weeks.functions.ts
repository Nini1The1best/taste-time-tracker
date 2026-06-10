import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slotKindSchema = z.enum(["lunch", "dinner"]);

export const listWeeks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("weeks")
      .select("id, start_date, title, updated_at")
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getWeekFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ weekId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: week, error: wErr } = await context.supabase
      .from("weeks")
      .select("id, start_date, title")
      .eq("id", data.weekId)
      .single();
    if (wErr) throw new Error(wErr.message);

    const { data: slots, error: sErr } = await context.supabase
      .from("meal_slots")
      .select("id, day_of_week, slot, enabled, meal_name")
      .eq("week_id", data.weekId)
      .order("day_of_week")
      .order("slot");
    if (sErr) throw new Error(sErr.message);

    const slotIds = (slots ?? []).map((s) => s.id);
    let ingredients: Array<{ id: string; meal_slot_id: string; name: string; quantity: string | null; position: number }> = [];
    if (slotIds.length) {
      const { data: ing, error: iErr } = await context.supabase
        .from("ingredients")
        .select("id, meal_slot_id, name, quantity, position")
        .in("meal_slot_id", slotIds)
        .order("position");
      if (iErr) throw new Error(iErr.message);
      ingredients = ing ?? [];
    }
    return { week, slots: slots ?? [], ingredients };
  });

export const getOrCreateWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("weeks")
      .select("id")
      .eq("user_id", context.userId)
      .eq("start_date", data.startDate)
      .maybeSingle();
    if (existing) return { id: existing.id };

    const { data: created, error } = await context.supabase
      .from("weeks")
      .insert({ user_id: context.userId, start_date: data.startDate })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Seed 14 slots (7 days × 2 slots), all enabled empty
    const seed = [];
    for (let d = 0; d < 7; d++) {
      for (const slot of ["lunch", "dinner"] as const) {
        seed.push({ week_id: created.id, day_of_week: d, slot, enabled: true, meal_name: "" });
      }
    }
    const { error: sErr } = await context.supabase.from("meal_slots").insert(seed);
    if (sErr) throw new Error(sErr.message);
    return { id: created.id };
  });

export const updateWeekTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ weekId: z.string().uuid(), title: z.string().max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("weeks").update({ title: data.title }).eq("id", data.weekId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      enabled: z.boolean().optional(),
      meal_name: z.string().max(200).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.meal_name !== undefined) patch.meal_name = data.meal_name;
    const { error } = await context.supabase.from("meal_slots").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      weekId: z.string().uuid(),
      day: z.number().int().min(0).max(6),
      slot: slotKindSchema.optional(),
      enabled: z.boolean(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("meal_slots").update({ enabled: data.enabled }).eq("week_id", data.weekId).eq("day_of_week", data.day);
    if (data.slot) q = q.eq("slot", data.slot);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const replaceIngredients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      mealSlotId: z.string().uuid(),
      items: z.array(z.object({ name: z.string().min(1).max(100), quantity: z.string().max(60).optional() })).max(50),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // delete + reinsert (simple, RLS-safe via parent join)
    const { error: dErr } = await context.supabase.from("ingredients").delete().eq("meal_slot_id", data.mealSlotId);
    if (dErr) throw new Error(dErr.message);
    if (data.items.length) {
      const rows = data.items.map((it, idx) => ({
        meal_slot_id: data.mealSlotId,
        name: it.name,
        quantity: it.quantity ?? null,
        position: idx,
      }));
      const { error: iErr } = await context.supabase.from("ingredients").insert(rows);
      if (iErr) throw new Error(iErr.message);
    }
    return { ok: true };
  });

export const duplicateWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sourceWeekId: z.string().uuid(), targetStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: src, error: sErr } = await context.supabase
      .from("weeks").select("title").eq("id", data.sourceWeekId).single();
    if (sErr) throw new Error(sErr.message);

    // delete target if exists to allow overwrite via upsert flow
    const { data: existing } = await context.supabase
      .from("weeks").select("id").eq("user_id", context.userId).eq("start_date", data.targetStartDate).maybeSingle();
    if (existing) {
      await context.supabase.from("weeks").delete().eq("id", existing.id);
    }

    const { data: created, error: cErr } = await context.supabase
      .from("weeks").insert({ user_id: context.userId, start_date: data.targetStartDate, title: src.title })
      .select("id").single();
    if (cErr) throw new Error(cErr.message);

    const { data: slots } = await context.supabase
      .from("meal_slots").select("day_of_week, slot, enabled, meal_name").eq("week_id", data.sourceWeekId);

    if (slots?.length) {
      const rows = slots.map((s) => ({ ...s, week_id: created.id }));
      const { data: newSlots, error: nErr } = await context.supabase.from("meal_slots").insert(rows).select("id, day_of_week, slot");
      if (nErr) throw new Error(nErr.message);

      // copy ingredients too
      const { data: oldSlots } = await context.supabase
        .from("meal_slots").select("id, day_of_week, slot").eq("week_id", data.sourceWeekId);
      const oldIds = (oldSlots ?? []).map((s) => s.id);
      if (oldIds.length) {
        const { data: ings } = await context.supabase
          .from("ingredients").select("meal_slot_id, name, quantity, position").in("meal_slot_id", oldIds);
        const oldById = new Map((oldSlots ?? []).map((s) => [s.id, `${s.day_of_week}-${s.slot}`]));
        const newByKey = new Map((newSlots ?? []).map((s) => [`${s.day_of_week}-${s.slot}`, s.id]));
        const rows2 = (ings ?? []).map((i) => ({
          meal_slot_id: newByKey.get(oldById.get(i.meal_slot_id)!)!,
          name: i.name, quantity: i.quantity, position: i.position,
        })).filter((r) => r.meal_slot_id);
        if (rows2.length) await context.supabase.from("ingredients").insert(rows2);
      }
    }
    return { id: created.id };
  });

export const deleteWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ weekId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("weeks").delete().eq("id", data.weekId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const searchMeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ q: z.string().max(80) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!data.q.trim()) return [];
    const { data: rows, error } = await context.supabase
      .from("meal_slots")
      .select("id, meal_name, day_of_week, slot, week:weeks!inner(id, start_date)")
      .ilike("meal_name", `%${data.q}%`)
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const mealStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("meal_slots")
      .select("meal_name, week:weeks!inner(user_id)")
      .eq("enabled", true)
      .neq("meal_name", "");
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    for (const r of data ?? []) {
      const name = (r.meal_name || "").trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const top = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    return { totalMeals: data?.length ?? 0, distinctMeals: counts.size, top };
  });
