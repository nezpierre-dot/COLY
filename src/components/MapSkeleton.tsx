import { MapPin } from "lucide-react";

interface MapSkeletonProps {
  height?: string;
  label?: string;
}

const MapSkeleton = ({ height = "h-64", label = "Chargement de la carte…" }: MapSkeletonProps) => (
  <div
    className={`relative w-full ${height} rounded-xl overflow-hidden bg-muted/40 border border-border animate-pulse flex items-center justify-center`}
    role="status"
    aria-label={label}
  >
    <div className="flex flex-col items-center gap-2 text-muted-foreground">
      <MapPin size={28} className="opacity-60" />
      <span className="text-xs">{label}</span>
    </div>
  </div>
);

export default MapSkeleton;
