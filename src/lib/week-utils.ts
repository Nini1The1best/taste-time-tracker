// Pure date helpers — ISO weeks starting Monday (day_of_week 0 = Monday)
export const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const SLOT_LABELS: Record<"lunch" | "dinner", string> = { lunch: "Midi", dinner: "Soir" };

export type SlotKind = "lunch" | "dinner";

export function startOfIsoWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - day);
  return date;
}

export function addDays(d: Date | string, n: number): Date {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatWeekLabel(startDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = addDays(start, 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${fmt(start)} → ${fmt(end)}`;
}

export function nextMondayISO(): string {
  const today = new Date();
  const monday = startOfIsoWeek(today);
  if (today.getTime() > monday.getTime()) monday.setDate(monday.getDate() + 7);
  return toISODate(monday);
}

export function thisMondayISO(): string {
  return toISODate(startOfIsoWeek(new Date()));
}
