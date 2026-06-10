import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mergeIngredients } from "./shopping-merge";

export const generateShoppingList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ weekId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: slots, error: sErr } = await context.supabase
      .from("meal_slots")
      .select("id, meal_name, enabled")
      .eq("week_id", data.weekId);
    if (sErr) throw new Error(sErr.message);
    const slotMap = new Map((slots ?? []).filter((s) => s.enabled).map((s) => [s.id, s.meal_name || ""]));
    const slotIds = Array.from(slotMap.keys());
    if (!slotIds.length) return { items: [], checked: [] as string[] };

    const { data: ings, error: iErr } = await context.supabase
      .from("ingredients")
      .select("meal_slot_id, name, quantity")
      .in("meal_slot_id", slotIds);
    if (iErr) throw new Error(iErr.message);

    const items = mergeIngredients(
      (ings ?? []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        mealName: slotMap.get(i.meal_slot_id) ?? undefined,
      })),
    );

    const { data: list } = await context.supabase
      .from("shopping_lists")
      .select("checked_items")
      .eq("week_id", data.weekId)
      .maybeSingle();
    const checked = (list?.checked_items as string[] | null) ?? [];
    return { items, checked };
  });

export const saveCheckedItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ weekId: z.string().uuid(), checked: z.array(z.string()).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shopping_lists")
      .upsert({ week_id: data.weekId, checked_items: data.checked, generated_at: new Date().toISOString() }, { onConflict: "week_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
