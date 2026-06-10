// Intelligent ingredient merging — pure, no DB
export type RawIngredient = { name: string; quantity?: string | null; mealName?: string };
export type MergedItem = {
  key: string;
  name: string;
  quantities: string[];
  meals: string[];
  category: string;
};

const CATEGORIES: { name: string; match: RegExp }[] = [
  { name: "Fruits & légumes", match: /\b(tomate|salade|carotte|oignon|ail|courgette|aubergine|poivron|champignon|pomme de terre|patate|brocoli|chou|épinard|epinard|concombre|citron|pomme|banane|fraise|avocat|basilic|persil|coriandre|menthe|gingembre|échalote|echalote|poireau|navet|radis)/i },
  { name: "Viandes & poissons", match: /\b(poulet|boeuf|bœuf|porc|veau|agneau|jambon|bacon|lardon|saucisse|merguez|steak|escalope|saumon|thon|cabillaud|crevette|poisson|dinde)/i },
  { name: "Produits frais", match: /\b(lait|beurre|crème|creme|yaourt|fromage|mozzarella|parmesan|feta|chèvre|chevre|gruyère|gruyere|emmental|oeuf|œuf|ricotta)/i },
  { name: "Féculents & pains", match: /\b(pain|pâte|pates|pates|riz|quinoa|semoule|couscous|boulgour|lentille|haricot|pois chiche|tortilla|wrap|pizza|gnocchi|polenta|farine)/i },
  { name: "Épicerie", match: /\b(huile|vinaigre|sel|poivre|sucre|miel|moutarde|ketchup|mayonnaise|sauce|curry|paprika|cumin|origan|thym|laurier|bouillon|conserve|lait de coco|tomate concassée|concassee|olive|câpre|capre)/i },
  { name: "Boissons", match: /\b(eau|vin|bière|biere|jus|soda|café|cafe|thé|the|limonade)/i },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/(s|x)$/, ""); // basic FR singularization
}

function categorize(name: string): string {
  for (const c of CATEGORIES) if (c.match.test(name)) return c.name;
  return "Autres";
}

export function mergeIngredients(items: RawIngredient[]): MergedItem[] {
  const map = new Map<string, MergedItem>();
  for (const it of items) {
    const trimmed = it.name?.trim();
    if (!trimmed) continue;
    const key = normalize(trimmed);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      if (it.quantity?.trim()) existing.quantities.push(it.quantity.trim());
      if (it.mealName && !existing.meals.includes(it.mealName)) existing.meals.push(it.mealName);
    } else {
      map.set(key, {
        key,
        name: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
        quantities: it.quantity?.trim() ? [it.quantity.trim()] : [],
        meals: it.mealName ? [it.mealName] : [],
        category: categorize(trimmed),
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });
}

export function groupByCategory(items: MergedItem[]): Record<string, MergedItem[]> {
  const out: Record<string, MergedItem[]> = {};
  for (const it of items) {
    (out[it.category] ||= []).push(it);
  }
  return out;
}

export function formatShoppingText(items: MergedItem[]): string {
  const grouped = groupByCategory(items);
  return Object.entries(grouped)
    .map(([cat, list]) => `${cat}\n${list.map((i) => `• ${i.name}${i.quantities.length ? " (" + i.quantities.join(" + ") + ")" : ""}`).join("\n")}`)
    .join("\n\n");
}
