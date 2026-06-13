import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-fafafa p-6">
      <div className="text-6xl mb-6">🍲</div>
      <h1 className="text-3xl font-bold mb-4">Bienvenue sur Mijote</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md text-center">
        Planifie tes repas de la semaine en 2 minutes.
      </p>
      <Link to="/app">
        <Button size="lg">Commencer</Button>
      </Link>
    </div>
  );
}
