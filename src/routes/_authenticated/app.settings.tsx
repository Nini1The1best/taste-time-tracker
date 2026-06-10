import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getPrefs, updatePrefs, getProfile } from "@/lib/prefs.functions";
import { listWeeks } from "@/lib/weeks.functions";
import { getVapidPublicKey, subscribePush, unsubscribePush } from "@/lib/push.functions";
import { useEffect, useState } from "react";
import { Bell, BellOff, Download, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { theme, toggle } = useTheme();
  const fetchPrefs = useServerFn(getPrefs);
  const fetchProfile = useServerFn(getProfile);
  const upPrefs = useServerFn(updatePrefs);
  const fetchVapid = useServerFn(getVapidPublicKey);
  const subPush = useServerFn(subscribePush);
  const unsubPush = useServerFn(unsubscribePush);
  const fetchWeeks = useServerFn(listWeeks);

  const { data: prefs } = useQuery({ queryKey: ["prefs"], queryFn: () => fetchPrefs() });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: vapid } = useQuery({ queryKey: ["vapid"], queryFn: () => fetchVapid() });

  const prefsMut = useMutation({
    mutationFn: (v: Parameters<typeof upPrefs>[0]["data"]) => upPrefs({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prefs"] }),
  });

  const [pushStatus, setPushStatus] = useState<"unknown" | "denied" | "off" | "on">("unknown");
  const [endpoint, setEndpoint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) { setPushStatus("denied"); return; }
    if (Notification.permission === "denied") { setPushStatus("denied"); return; }
    navigator.serviceWorker.getRegistration("/push-sw.js").then(async (reg) => {
      if (!reg) { setPushStatus("off"); return; }
      const sub = await reg.pushManager.getSubscription();
      if (sub) { setEndpoint(sub.endpoint); setPushStatus("on"); } else setPushStatus("off");
    });
  }, []);

  const enablePush = async () => {
    if (!vapid?.key) { toast.error("Notifications pas encore configurées côté serveur"); return; }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast.error("Permission refusée"); return; }
      const reg = await navigator.serviceWorker.register("/push-sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.key),
      });
      const json = sub.toJSON();
      await subPush({ data: {
        endpoint: sub.endpoint, p256dh: json.keys!.p256dh!, auth: json.keys!.auth!, ua: navigator.userAgent,
      } });
      setEndpoint(sub.endpoint); setPushStatus("on");
      toast.success("Notifications activées 🔔");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'activation");
    }
  };

  const disablePush = async () => {
    const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await sub.unsubscribe(); if (endpoint) await unsubPush({ data: { endpoint } }); }
    setPushStatus("off"); setEndpoint(null);
    toast.success("Notifications désactivées");
  };

  const exportData = async () => {
    const weeks = await fetchWeeks();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), weeks }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mijote-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-display text-3xl md:text-4xl font-semibold">Réglages</h1>
        {profile?.display_name && <p className="text-muted-foreground text-sm mt-1">Salut {profile.display_name} 👋</p>}
      </header>

      <Section title="Apparence">
        <Row label={theme === "dark" ? "Mode sombre" : "Mode clair"} subtitle="Bascule en un clic">
          <button onClick={toggle} className="rounded-full bg-muted hover:bg-secondary px-4 py-2 text-xs font-medium inline-flex items-center gap-2 transition">
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            Basculer
          </button>
        </Row>
      </Section>

      <Section title="Rappels">
        <Row label="Rappel hebdo" subtitle="Notification le vendredi soir pour planifier la semaine">
          <button
            disabled={!prefs}
            onClick={() => prefs && prefsMut.mutate({ weekly_reminder: !prefs.weekly_reminder })}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${prefs?.weekly_reminder ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {prefs?.weekly_reminder ? "Activé" : "Désactivé"}
          </button>
        </Row>
        <Row label="Notifications push" subtitle={pushStatus === "denied" ? "Bloquées par le navigateur" : pushStatus === "on" ? "Tu reçois les notifications" : "Active pour recevoir le rappel sur ce téléphone"}>
          {pushStatus === "on" ? (
            <button onClick={disablePush} className="rounded-full border border-border px-4 py-2 text-xs font-medium inline-flex items-center gap-2 hover:bg-muted transition">
              <BellOff className="h-3.5 w-3.5" /> Désactiver
            </button>
          ) : (
            <button onClick={enablePush} disabled={pushStatus === "denied"} className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold inline-flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50">
              <Bell className="h-3.5 w-3.5" /> Activer
            </button>
          )}
        </Row>
      </Section>

      <Section title="Données">
        <Row label="Export JSON" subtitle="Télécharge toutes tes semaines">
          <button onClick={exportData} className="rounded-full border border-border px-4 py-2 text-xs font-medium inline-flex items-center gap-2 hover:bg-muted transition">
            <Download className="h-3.5 w-3.5" /> Exporter
          </button>
        </Row>
      </Section>

      <Section title="Compte">
        <Row label="Déconnexion" subtitle="À bientôt !">
          <button onClick={signOut} className="rounded-full border border-destructive/30 text-destructive px-4 py-2 text-xs font-semibold inline-flex items-center gap-2 hover:bg-destructive/10 transition">
            <LogOut className="h-3.5 w-3.5" /> Se déconnecter
          </button>
        </Row>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-card border border-border/60 overflow-hidden">
      <div className="px-5 py-3 text-xs uppercase tracking-widest text-muted-foreground bg-muted/30 border-b border-border/50">{title}</div>
      <div className="divide-y divide-border/50">{children}</div>
    </section>
  );
}

function Row({ label, subtitle, children }: { label: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
