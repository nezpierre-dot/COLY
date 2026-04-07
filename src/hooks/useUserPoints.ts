import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserPoints {
  total_points: number;
  level: string;
}

const LEVEL_THRESHOLDS = [
  { level: "green", min: 0, max: 99, label: "Green", next: "Gold", nextMin: 100 },
  { level: "green", min: 100, max: 499, label: "Green", next: "Gold", nextMin: 500 },
  { level: "gold", min: 500, max: 1499, label: "Gold", next: "Platine", nextMin: 1500 },
  { level: "platine", min: 1500, max: 4999, label: "Platine", next: "Diamant", nextMin: 5000 },
  { level: "diamant", min: 5000, max: Infinity, label: "Diamant", next: null, nextMin: null },
];

export const getLevelInfo = (points: number) => {
  if (points >= 5000) return LEVEL_THRESHOLDS[4];
  if (points >= 1500) return LEVEL_THRESHOLDS[3];
  if (points >= 500) return LEVEL_THRESHOLDS[2];
  if (points >= 100) return LEVEL_THRESHOLDS[1];
  return LEVEL_THRESHOLDS[0];
};

export const getLevelProgress = (points: number) => {
  const info = getLevelInfo(points);
  if (!info.nextMin) return 100; // max level
  const rangeStart = info.min;
  const rangeEnd = info.nextMin;
  return Math.min(Math.round(((points - rangeStart) / (rangeEnd - rangeStart)) * 100), 100);
};

export const LEVEL_STYLES: Record<string, { gradient: string; text: string; icon: string; bg: string; border: string }> = {
  green: {
    gradient: "from-emerald-400 to-emerald-600",
    text: "text-emerald-600",
    icon: "🌱",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  gold: {
    gradient: "from-amber-400 to-amber-600",
    text: "text-amber-600",
    icon: "⭐",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  platine: {
    gradient: "from-slate-300 to-slate-500",
    text: "text-slate-500",
    icon: "💎",
    bg: "bg-slate-400/10",
    border: "border-slate-400/30",
  },
  diamant: {
    gradient: "from-cyan-300 via-blue-400 to-purple-500",
    text: "text-blue-500",
    icon: "💠",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
};

export const useUserPoints = (userId?: string) => {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery({
    queryKey: ["user-points", targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_points")
        .select("total_points, level")
        .eq("user_id", targetId!)
        .maybeSingle();

      if (error) throw error;
      return (data || { total_points: 0, level: "green" }) as UserPoints;
    },
    enabled: !!targetId,
    staleTime: 30_000,
  });
};

export const usePointsHistory = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["points-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_history")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
};
