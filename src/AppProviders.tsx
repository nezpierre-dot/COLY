/**
 * AppProviders — toutes les couches de contexte (theme, helmet, react-query,
 * tooltip, toasts, router, auth, presence, favorites) agrégées en un seul
 * composant. Permet de garder App.tsx svelte et de réordonner les providers
 * sans changer le markup du routeur.
 */
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { FavoritesProvider } from "@/hooks/useFavorites";
import { useGlobalPresenceTracker } from "@/hooks/usePresence";

const queryClient = new QueryClient();

const PresenceTracker = () => {
  useGlobalPresenceTracker();
  return null;
};

const AutoLogoutWrapper = ({ children }: { children: ReactNode }) => {
  // Placeholder pour le hook d'auto-logout (réservé pour wiring futur).
  return <>{children}</>;
};

/**
 * Garde <html lang="..."> et dir en phase avec la langue i18n active.
 * WCAG 2.1 SC 3.1.1 + i18n RTL automatique pour l'arabe.
 */
const LangSync = () => {
  const { language } = useTranslation();
  useEffect(() => {
    if (typeof document !== "undefined" && language) {
      document.documentElement.lang = language;
      document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    }
  }, [language]);
  return null;
};

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <ThemeProvider>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <PresenceTracker />
                <AutoLogoutWrapper>
                  <FavoritesProvider>
                    <LangSync />
                    {children}
                  </FavoritesProvider>
                </AutoLogoutWrapper>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ThemeProvider>
  );
};

export default AppProviders;
