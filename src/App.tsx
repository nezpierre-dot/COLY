import { useState, lazy, Suspense, type ReactNode } from "react";
import { useAutoLogout } from "@/hooks/useAutoLogout";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { FavoritesProvider } from "@/hooks/useFavorites";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import SplashScreen from "@/components/SplashScreen";

// Lazy-loaded pages
const Welcome = lazy(() => import("./features/core/pages/Welcome"));
const Signup = lazy(() => import("./features/auth/pages/Signup"));
const Login = lazy(() => import("./features/auth/pages/Login"));
const ResetPassword = lazy(() => import("./features/auth/pages/ResetPassword"));
const Terms = lazy(() => import("./features/legal/pages/Terms"));
const Dashboard = lazy(() => import("./features/core/pages/Dashboard"));
const SendColy = lazy(() => import("./features/shipment/pages/SendColy"));
const Settings = lazy(() => import("./features/account/pages/Settings"));
const MyAccount = lazy(() => import("./features/account/pages/MyAccount"));
const NeeditMission = lazy(() => import("./features/needit/pages/NeeditMission"));
const MesNeeditMissions = lazy(() => import("./features/needit/pages/MesNeeditMissions"));
const KycFlow = lazy(() => import("./features/auth/pages/KycFlow"));
const MyInfo = lazy(() => import("./features/account/pages/MyInfo"));
const VoyageurSettings = lazy(() => import("./features/voyage/pages/VoyageurSettings"));
const HistoryPage = lazy(() => import("./features/core/pages/HistoryPage"));
const NotificationsPage = lazy(() => import("./features/core/pages/NotificationsPage"));
const Comptabilite = lazy(() => import("./features/finance/pages/Comptabilite"));
const SoldePage = lazy(() => import("./features/finance/pages/SoldePage"));
const FacturationPage = lazy(() => import("./features/finance/pages/FacturationPage"));
const ConfidentialitePage = lazy(() => import("./features/legal/pages/ConfidentialitePage"));
const PaymentMethods = lazy(() => import("./features/account/pages/PaymentMethods"));
const NewTrip = lazy(() => import("./features/voyage/pages/NewTrip"));
const ShipmentTracking = lazy(() => import("./features/shipment/pages/ShipmentTracking"));
const ColisLiveTracker = lazy(() => import("./features/tracking/pages/ColisLiveTracker"));
const ConversationsPage = lazy(() => import("./features/chat/pages/ConversationsPage"));
const ChatPage = lazy(() => import("./features/chat/pages/ChatPage"));
const AdminDashboard = lazy(() => import("./features/admin/pages/AdminDashboard"));
const VoyageurSearch = lazy(() => import("./features/voyage/pages/VoyageurSearch"));
const InstallPage = lazy(() => import("./features/core/pages/InstallPage"));
const FaqPage = lazy(() => import("./features/support/pages/FaqPage"));
const AidePage = lazy(() => import("./features/support/pages/AidePage"));
const SupportContactPage = lazy(() => import("./features/support/pages/SupportContactPage"));
const NotFound = lazy(() => import("./features/core/pages/NotFound"));
const VoyageDetail = lazy(() => import("./features/voyage/pages/VoyageDetail"));
const TransporterPage = lazy(() => import("./features/voyage/pages/TransporterPage"));
const ShipmentDetail = lazy(() => import("./features/shipment/pages/ShipmentDetail"));
const NeeditMissionDetail = lazy(() => import("./features/needit/pages/NeeditMissionDetail"));
const FavoritesPage = lazy(() => import("./features/core/pages/FavoritesPage"));
const DisputesPage = lazy(() => import("./features/disputes/pages/DisputesPage"));
const PublicProfile = lazy(() => import("./features/profile/PublicProfile"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const AutoLogoutWrapper = ({ children }: { children: ReactNode }) => {
  useAutoLogout();
  return <>{children}</>;
};

const App = () => {
  const [splashDone, setSplashDone] = useState(() => {
    if (sessionStorage.getItem("splash-shown")) return true;
    sessionStorage.setItem("splash-shown", "1");
    return false;
  });

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {!splashDone && <SplashScreen onFinished={() => setSplashDone(true)} />}
          <BrowserRouter>
            <AuthProvider>
              <AutoLogoutWrapper>
              <FavoritesProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Welcome />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/send-coly" element={<ProtectedRoute><SendColy /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/my-account" element={<ProtectedRoute><MyAccount /></ProtectedRoute>} />
                    <Route path="/needit-mission" element={<ProtectedRoute><NeeditMission /></ProtectedRoute>} />
                    <Route path="/needit-mission/:id" element={<ProtectedRoute><NeeditMission /></ProtectedRoute>} />
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
                    <Route path="/tracking/:id" element={<ProtectedRoute><ShipmentTracking /></ProtectedRoute>} />
                    <Route path="/live-tracking/:colisId" element={<ProtectedRoute><ColisLiveTracker /></ProtectedRoute>} />
                    <Route path="/voyage/:id" element={<ProtectedRoute><VoyageDetail /></ProtectedRoute>} />
                    <Route path="/transporter" element={<ProtectedRoute><TransporterPage /></ProtectedRoute>} />
                    <Route path="/shipment/:id" element={<ProtectedRoute><ShipmentDetail /></ProtectedRoute>} />
                    <Route path="/mission/:id" element={<ProtectedRoute><NeeditMissionDetail /></ProtectedRoute>} />
                    <Route path="/conversations" element={<ProtectedRoute><ConversationsPage /></ProtectedRoute>} />
                    <Route path="/chat/:id" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/voyageur-search" element={<ProtectedRoute><VoyageurSearch /></ProtectedRoute>} />
                    <Route path="/install" element={<ProtectedRoute><InstallPage /></ProtectedRoute>} />
                    <Route path="/faq" element={<ProtectedRoute><FaqPage /></ProtectedRoute>} />
                    <Route path="/aide" element={<ProtectedRoute><AidePage /></ProtectedRoute>} />
                    <Route path="/support-contact" element={<ProtectedRoute><SupportContactPage /></ProtectedRoute>} />
                    <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                    <Route path="/litiges" element={<ProtectedRoute><DisputesPage /></ProtectedRoute>} />
                    <Route path="/profile/:userId" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </FavoritesProvider>
              </AutoLogoutWrapper>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
