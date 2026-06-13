import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Mijote" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: () => (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>
        <QueryClientProvider client={new QueryClient()}>
          <ThemeProvider>
            <Outlet />
            <Toaster />
          </ThemeProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  ),
});
