import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarHeart, ListChecks, BellRing, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mijote — planifie tes repas de la semaine" },
      { name: "description", content: "Une app chaleureuse pour planifier tes repas, générer ta liste de courses et oublier la corvée du « on mange quoi ce soir ? »." },
      { property: "og:title", content: "Mijote — planifie tes repas" },
      { property: "og:description", content: "Planning hebdo, liste de courses fusionnée, installable et hors-ligne." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍲</span>
          <span className="font-display text-xl font-semibold">Mijote</span>
        </div>
        <Link to="/auth" className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition">Se connecter</Link>
      </header>

      <main className="px-6 pt-8 pb-24 max-w-6xl mx-auto">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto pt-10 md:pt-20"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/60 text-accent-foreground px-3 py-1 text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" /> Installable. Hors-ligne. Chaleureux.
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight">
            « On mange <span className="text-primary italic">quoi</span> ce soir ? »<br />
            <span className="text-muted-foreground">Plus jamais cette question.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Planifie ta semaine en 2 minutes. Ta liste de courses se génère toute seule. Le vendredi soir, un petit rappel te dit "Hop, à toi de jouer."
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth" className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 transition shadow-soft">
              Commencer — c'est gratuit
            </Link>
            <a href="#features" className="rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-muted transition">
              Voir les fonctionnalités
            </a>
          </div>
        </motion.section>

        <section id="features" className="grid md:grid-cols-3 gap-4 mt-24">
          {[
            { icon: CalendarHeart, title: "Planning fluide", text: "Active les jours et créneaux qui te servent. Saisis tes repas, ça s'enregistre tout seul." },
            { icon: ListChecks, title: "Liste fusionnée", text: "Tes ingrédients sont regroupés par rayon, les doublons disparaissent. Partage en 1 tap." },
            { icon: BellRing, title: "Rappel intelligent", text: "Notification le vendredi soir pour préparer la semaine suivante. (Activable, désactivable.)" },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="rounded-3xl bg-card p-6 shadow-soft border border-border/50"
            >
              <f.icon className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </section>

        <section className="mt-24 text-center">
          <div className="inline-block rounded-3xl bg-gradient-to-br from-primary/10 via-accent/40 to-sage/20 p-10 md:p-16 max-w-2xl">
            <p className="font-display text-2xl md:text-3xl leading-snug">
              « Cuisiner devient simple quand on sait ce qu'on va cuisiner. »
            </p>
            <Link to="/auth" className="mt-6 inline-flex rounded-full bg-foreground text-background px-6 py-3 text-sm font-semibold hover:opacity-90 transition">
              Démarrer ma première semaine
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-xs text-muted-foreground">
        Fait avec 🌿 et beaucoup de pâtes.
      </footer>
    </div>
  );
}
