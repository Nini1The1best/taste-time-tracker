import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-4">🍽️</div>
        <h1 className="text-3xl font-display font-semibold">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cette page n'existe pas.</p>
        <a href="/" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-display font-semibold">Aïe, ça a planté</h1>
        <p className="mt-2 text-sm text-muted-foreground">Réessaie ou retourne à l'accueil.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { location.reload(); }} className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
            Réessayer
          </button>
          <a href="/" className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted transition">
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#f8e8d8" },
      { title: "Mijote — planifie tes repas" },
      { name: "description", content: "Planifie tes repas de la semaine." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  component: () => (
    <html lang="fr" suppressHydrationWarning>
      <head><HeadContent /></head>
      <body>
        <QueryClientProvider client={new QueryClient()}>
          <ThemeProvider>
            <Outlet />
            <Toaster position="top-center" richColors />
          </ThemeProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  ),
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
