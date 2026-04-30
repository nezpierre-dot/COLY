import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GamifiedBadges, { type BadgeStats } from "@/components/GamifiedBadges";
import UserLevelBadge from "@/components/UserLevelBadge";

/**
 * BadgesSection — vue dédiée aux badges et au niveau du membre.
 * Utilisée par ProgressionHub. Récupère les stats minimales nécessaires
 * pour calculer les badges débloqués.
 */
const BadgesSection = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["badges-stats", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<BadgeStats> => {
      const uid = user!.id;
      const [voyagesRes, shipsRes, missionsRes, ratingRes, profileRes, refsRes] = await Promise.all([
        supabase.from("voyages").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("shipments").select("id", { count: "exact", head: true }).eq("voyageur_id", uid).eq("status", "delivered"),
        supabase.from("needit_missions").select("id", { count: "exact", head: true }).eq("voyageur_id", uid).eq("status", "delivered"),
        supabase.rpc("get_user_rating", { _user_id: uid }),
        supabase.from("profiles").select("kyc_status").eq("id", uid).maybeSingle(),
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", uid),
      ]);

      const ratingRow = Array.isArray(ratingRes.data) && ratingRes.data.length > 0 ? ratingRes.data[0] : null;

      return {
        totalVoyages: voyagesRes.count || 0,
        deliveredCount: shipsRes.count || 0,
        totalRatings: ratingRow?.total_ratings || 0,
        averageScore: ratingRow?.average_score || 0,
        kycVerified: profileRes.data?.kyc_status === "verified",
        totalDistance: 0,
        totalMissions: missionsRes.count || 0,
        referrals: refsRes.count || 0,
      };
    },
  });

  return (
    <div className="space-y-4">
      <UserLevelBadge variant="card" />
      <div className="bg-card border border-border rounded-2xl p-4">
        {stats ? (
          <GamifiedBadges stats={stats} />
        ) : (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgesSection;
