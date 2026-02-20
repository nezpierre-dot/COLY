import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { FavoritesProvider } from "@/hooks/useFavorites";
import ProtectedRoute from "@/components/ProtectedRoute";
import Welcome from "./pages/Welcome";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Terms from "./pages/Terms";
import Dashboard from "./pages/Dashboard";
import SendColy from "./pages/SendColy";
import Settings from "./pages/Settings";
import MyAccount from "./pages/MyAccount";
import NeeditMission from "./pages/NeeditMission";
import MesNeeditMissions from "./pages/MesNeeditMissions";
import KycFlow from "./pages/KycFlow";
import MyInfo from "./pages/MyInfo";
import VoyageurSettings from "./pages/VoyageurSettings";
import HistoryPage from "./pages/HistoryPage";
import NotificationsPage from "./pages/NotificationsPage";
import Comptabilite from "./pages/Comptabilite";
import SoldePage from "./pages/SoldePage";
import FacturationPage from "./pages/FacturationPage";
import ConfidentialitePage from "./pages/ConfidentialitePage";
import PaymentMethods from "./pages/PaymentMethods";
import NewTrip from "./pages/NewTrip";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <FavoritesProvider>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/send-coly" element={<ProtectedRoute><SendColy /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/my-account" element={<ProtectedRoute><MyAccount /></ProtectedRoute>} />
            <Route path="/needit-mission" element={<ProtectedRoute><NeeditMission /></ProtectedRoute>} />
            <Route path="/mes-missions-needit" element={<ProtectedRoute><MesNeeditMissions /></ProtectedRoute>} />
            <Route path="/kyc" element={<ProtectedRoute><KycFlow /></ProtectedRoute>} />
            <Route path="/my-info" element={<ProtectedRoute><MyInfo /></ProtectedRoute>} />
            <Route path="/voyageur-settings" element={<ProtectedRoute><VoyageurSettings /></ProtectedRoute>} />
            <Route path="/history/:type" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/comptabilite" element={<ProtectedRoute><Comptabilite /></ProtectedRoute>} />
            <Route path="/solde" element={<ProtectedRoute><SoldePage /></ProtectedRoute>} />
            <Route path="/facturation" element={<ProtectedRoute><FacturationPage /></ProtectedRoute>} />
            <Route path="/confidentialite" element={<ProtectedRoute><ConfidentialitePage /></ProtectedRoute>} />
            <Route path="/payment-methods" element={<ProtectedRoute><PaymentMethods /></ProtectedRoute>} />
            <Route path="/new-trip" element={<ProtectedRoute><NewTrip /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
            </FavoritesProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
