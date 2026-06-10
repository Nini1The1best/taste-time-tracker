// Cron-callable endpoint that sends "Prépare tes repas de la semaine prochaine"
// to users whose local time matches their reminder_dow + reminder_hour.
// Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT secrets.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/push/send-reminder")({
  server: {
    handlers: {
      POST: async () => {
        const vapidPublic = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
        const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:hello@mijote.app";
        if (!vapidPublic || !vapidPrivate) {
          return Response.json({ ok: false, reason: "vapid_not_configured" }, { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const webpush = (await import("web-push")).default;
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

        // Find users whose local time matches their preference (now)
        const { data: prefs } = await supabaseAdmin
          .from("notification_prefs")
          .select("user_id, reminder_dow, reminder_hour, tz, weekly_reminder")
          .eq("weekly_reminder", true);

        const now = new Date();
        const matching: string[] = [];
        for (const p of prefs ?? []) {
          try {
            const fmt = new Intl.DateTimeFormat("en-US", { timeZone: p.tz, weekday: "short", hour: "numeric", hour12: false });
            const parts = fmt.formatToParts(now);
            const wkMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
            const dow = wkMap[parts.find((x) => x.type === "weekday")?.value ?? ""];
            const hour = Number(parts.find((x) => x.type === "hour")?.value ?? "-1");
            if (dow === p.reminder_dow && hour === p.reminder_hour) matching.push(p.user_id);
          } catch {}
        }
        if (!matching.length) return Response.json({ ok: true, sent: 0 });

        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth, user_id")
          .in("user_id", matching);

        let sent = 0;
        const payload = JSON.stringify({ title: "Mijote 🍲", body: "Prépare tes repas de la semaine prochaine ✨", url: "/app" });
        for (const s of subs ?? []) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload,
            );
            sent++;
          } catch (err: unknown) {
            const e = err as { statusCode?: number };
            if (e.statusCode === 410 || e.statusCode === 404) {
              await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
            }
          }
        }
        return Response.json({ ok: true, sent, matched: matching.length });
      },
    },
  },
});
