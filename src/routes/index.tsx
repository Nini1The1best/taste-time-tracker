import { Link } from '@tanstack/react-router';
import { Calendar, List, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-fafafa">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍲</span>
          <span className="font-bold text-xl">Mijote</span>
        </div>
        <div className="flex gap-4">
          <Link to="/auth" className="text-sm font-medium text-gray-600 hover:underline">
            Se connecter
          </Link>
          <Link to="/auth">
            <Button>Essayer gratuitement</Button>
          </Link>
        </div>
      </header>

      {/* Section principale */}
      <section className="px-6 pt-16 pb-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-medium mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          Plus de 10 000 repas planifiés ce mois-ci
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
          Arrête de te demander
          <br />
          <span className="text-green-500">« On mange quoi ce soir ? »</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto">
          Planifie tes repas en 2 minutes, génère ta liste de courses automatiquement,
          et économise jusqu’à <strong>50€ par mois</strong>.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/auth">
            <Button size="lg" className="bg-green-500 hover:bg-green-600">
              Commencer gratuitement
            </Button>
          </Link>
          <a href="#features" className="text-sm font-medium text-gray-600 hover:underline">
            Voir comment ça marche
          </a>
        </div>
      </section>

      {/* Section "Pourquoi Mijote ?" */}
      <section id="features" className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Pourquoi Mijote ?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Calendar,
              title: "Planning ultra-rapide",
              description: "Active les jours et créneaux qui te servent. Ajoute tes repas en 2 clics.",
            },
            {
              icon: List,
              title: "Liste de courses magique",
              description: "Tes ingrédients sont regroupés par rayon, les doublons disparaissent.",
            },
            {
              icon: Users,
              title: "Partage familial",
              description: "Collaborez à plusieurs sur les mêmes listes et plannings.",
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-xl p-6 text-center shadow-sm border border-gray-200 bg-white">
              <feature.icon className="h-10 w-10 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section finale */}
      <section className="px-6 py-24 text-center bg-green-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900">Prêt à simplifier tes repas ?</h2>
          <p className="text-gray-600 mt-4">
            Rejoins des milliers d’utilisateurs qui ont déjà adopté Mijote.
          </p>
          <Link to="/auth" className="mt-6 inline-block">
            <Button size="lg" className="bg-green-500 hover:bg-green-600">
              Commencer gratuitement
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
