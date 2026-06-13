import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-fafafa">
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

      <main className="px-6 pt-16 pb-24 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
          Arrête de te demander
          <br />
          <span className="text-green-500">« On mange quoi ce soir ? »</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto">
          Planifie tes repas en 2 minutes.
        </p>
        <div className="mt-8">
          <Link to="/auth">
            <Button size="lg" className="bg-green-500 hover:bg-green-600">
              Commencer gratuitement
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
