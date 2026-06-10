import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notification_prefs").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { user_id: context.userId, weekly_reminder: true, reminder_dow: 5, reminder_hour: 19, tz: "Europe/Paris" };
  });

export const updatePrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      weekly_reminder: z.boolean().optional(),
      reminder_dow: z.number().int().min(0).max(6).optional(),
      reminder_hour: z.number().int().min(0).max(23).optional(),
      tz: z.string().max(60).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notification_prefs")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
