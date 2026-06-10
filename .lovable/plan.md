# Plan — App Repas (MVP + Cloud)

App PWA installable de planification de repas hebdo, avec compte Google, sync cloud, liste de courses fusionnée, historique, impression/PDF, partage natif, et notifications push web.

## Stack

- TanStack Start (React 19, Vite, SSR Cloudflare Worker) — déjà en place
- Tailwind v4 + shadcn/ui + Framer Motion
- Lovable Cloud (Supabase) — DB, auth Google, server functions
- vite-plugin-pwa (generateSW, NetworkFirst) — installabilité + offline shell
- Web Push API + service worker dédié pour les notifications
- TanStack Query pour le data layer

## Direction visuelle (je décide, pas de directions à comparer)

Chaleureux, doux, moderne — inspiration Notion/Todoist :

- Fonds crème/ivoire en light, anthracite en dark, accents terracotta + sauge
- Display: Fraunces (serif chaleureux) ; Body: Inter
- Cartes arrondies (rounded-2xl), ombres très douces, glass léger sur la nav mobile
- Transitions Framer Motion subtiles (fade+slide), drag handle visible sur les repas
- Emojis discrets en décor (🍝 🥗 🍕) sur l'empty state et l'en-tête semaine
- Mobile-first : bottom-nav avec 4 icônes, FAB pour "Nouvelle semaine"

## Modèle de données (Supabase, RLS scoped à auth.uid())

```
profiles(id pk → auth.users, display_name, created_at)
weeks(id, user_id, start_date, title, created_at, updated_at)
  unique(user_id, start_date)
meal_slots(id, week_id, day_of_week 0..6, slot 'lunch'|'dinner',
           enabled bool, meal_name text, position int)
ingredients(id, meal_slot_id, name text, quantity text nullable, position int)
shopping_lists(id, week_id, generated_at, checked_items jsonb)
push_subscriptions(id, user_id, endpoint unique, p256dh, auth, ua, created_at)
notification_prefs(user_id pk, weekly_reminder bool default true,
                   reminder_dow int default 5, reminder_hour int default 19, tz text)
```

Toutes les tables : GRANT à `authenticated` + `service_role`, RLS activée, policies `user_id = auth.uid()` (via join pour les tables enfants).

## Routes (TanStack file-based)

Publiques :

- `/` — landing courte + CTA "Commencer"
- `/auth` — sign in Google (broker Lovable) + email/password fallback

Protégées (`_authenticated/`) :

- `/app` — dashboard (semaine en cours + raccourcis)
- `/app/plan/$weekId` — éditeur semaine (étapes jours → repas → résumé en tabs)
- `/app/plan/$weekId/courses` — saisie ingrédients par repas + liste fusionnée
- `/app/history` — semaines précédentes (search, stats simples, dupliquer)
- `/app/print/$weekId` — vue print/PDF (route imprimable propre)
- `/app/settings` — profil, notifications, export JSON, désinscription push

Server routes :

- `/api/public/push/send-reminder` — endpoint cron (signature HMAC) qui boucle sur `notification_prefs` et envoie le push via `web-push`

## Server functions (`src/lib/*.functions.ts`)

- `weeks.list/get/create/update/duplicate/delete`
- `slots.upsertBatch` — autosave debounced
- `ingredients.upsertBatch`
- `shopping.generate(weekId)` — fusion intelligente (normalisation lower+trim+singularisation simple FR, regroupement par catégorie via dico embarqué)
- `push.subscribe/unsubscribe`
- `prefs.get/update`
- `history.search(query)` — repas passés
- `stats.summary` — top repas, variété

Toutes utilisent `requireSupabaseAuth`. L'attacher est déjà câblé.

## PWA & Notifications

- `vite-plugin-pwa` avec manifest (nom, icônes 192/512/maskable, theme color terracotta, display standalone), `registerType: autoUpdate`, `NetworkFirst` pour les navigations, exclusion `/~oauth` et `/api/*`
- Registration wrapper avec garde stricte (jamais en preview Lovable, iframe, dev, `?sw=off`)
- SW dédié `public/push-sw.js` pour `push` + `notificationclick` (pas le SW Workbox)
- Côté UI : prompt d'activation dans Settings, stocke la subscription en DB
- Cron (pg_cron ou tâche externe) tape l'endpoint public chaque heure → envoie aux users dont c'est vendredi 19h locale

## Liste de courses — fusion

1. Normalisation : lower, trim, retrait pluriels FR basiques (`s`, `x`)
2. Regroupement par catégorie (dico statique : féculents, légumes, viandes, frais, épicerie, autres)
3. Quantités : concat des quantités texte si présentes (`"2 + 200g"`), sinon juste fusion
4. Affichage : liste cochable (état dans `shopping_lists.checked_items`), bouton "Partager" (Web Share API → fallback copier)

## Impression / PDF

Route `/app/print/$weekId` avec CSS `@media print` propre, tableau Jour × (Midi/Soir). Bouton "Télécharger PDF" = `window.print()` (le navigateur produit le PDF natif, zéro dépendance lourde compatible Worker).

## Découpage des livrables

1. **Bootstrap** : enable Lovable Cloud, configurer Google OAuth, migrations DB + RLS + grants
2. **Design system** : tokens dans `src/styles.css` (couleurs, fonts), shell + bottom-nav + thème dark
3. **Auth** : `/auth` (Google + email), layout `_authenticated`
4. **Éditeur semaine** : wizard 3 étapes, autosave, drag & drop des repas
5. **Liste de courses** : saisie ingrédients + fusion + partage
6. **Historique + stats + duplication + search**
7. **Print/PDF**
8. **PWA** : manifest, icônes, SW Workbox guardé, install prompt
9. **Push** : SW push, subscribe UI, table prefs, endpoint cron public
10. **Polish** : animations Framer, empty states, export JSON, QA mobile

## Hors scope V1 (explicitement)

- Google Keep (API Workspace-only — remplacé par Web Share/copier)
- Collab familial / partage multi-user
- Widget mobile natif
- Import JSON (export oui, import plus tard)

## Points techniques notables

- Google OAuth via `lovable.auth.signInWithOAuth("google", ...)` + `supabase--configure_social_auth`
- `web-push` est pure JS, OK sur Worker (sinon fallback : tâche externe)
- VAPID keys stockées en secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
- Cron : `pg_cron` Supabase qui hit `/api/public/push/send-reminder` avec un secret HMAC
- Toutes les server fns appelées depuis composants/`_authenticated` loaders uniquement (jamais loader public)

Une fois validé je passe en build et j'attaque le bootstrap (étape 1).