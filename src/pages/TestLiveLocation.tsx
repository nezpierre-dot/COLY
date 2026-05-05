import { useState, lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
const LiveLocationSharing = lazy(() => import("@/components/LiveLocationSharing"));
import MapSkeleton from "@/components/MapSkeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TestLiveLocation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewAs, setViewAs] = useState<"voyageur" | "demandeur">("voyageur");

  const demoItemId = "demo-shipment-001";
  const voyageurId = user?.id || "demo-voyageur";

  return (
    <div className="min-h-screen bg-gradient-soft p-4 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Test — Localisation en direct</h1>
      </div>

      {/* Mode toggle */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Vue actuelle</p>
        <div className="flex gap-2">
          <Button
            variant={viewAs === "voyageur" ? "default" : "outline"}
            size="sm"
            className="flex-1 gap-2"
            onClick={() => setViewAs("voyageur")}
          >
            <Navigation size={14} />
            Voyageur
          </Button>
          <Button
            variant={viewAs === "demandeur" ? "default" : "outline"}
            size="sm"
            className="flex-1 gap-2"
            onClick={() => setViewAs("demandeur")}
          >
            <Eye size={14} />
            Demandeur
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {viewAs === "voyageur"
            ? "En tant que voyageur, tu peux activer/désactiver le partage de position."
            : "En tant que membre, tu vois la position du voyageur en temps réel."}
        </p>
      </div>

      {/* Live Location Component */}
      <LiveLocationSharing
        itemId={demoItemId}
        voyageurId={voyageurId}
        isVoyageur={viewAs === "voyageur"}
        autoStart={false}
      />

      {/* Info */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-foreground">Infos de test</p>
        <p className="text-xs text-muted-foreground">Item ID : {demoItemId}</p>
        <p className="text-xs text-muted-foreground">Voyageur ID : {voyageurId}</p>
        <p className="text-xs text-muted-foreground">User connecté : {user?.email || "Non connecté"}</p>
      </div>
    </div>
  );
};

export default TestLiveLocation;
