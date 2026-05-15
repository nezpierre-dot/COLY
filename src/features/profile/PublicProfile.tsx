import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star, MapPin, ArrowLeft, User, MessageSquare, Plane, Package, Shield, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TrustBadgesDisplay from "@/components/TrustBadgesDisplay";
import VerifiedBadges from "@/components/VerifiedBadges";
import VoyageurProfileBadges from "@/components/VoyageurProfileBadges";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import UserLevelBadge from "@/components/UserLevelBadge";
import PresenceBadge from "@/components/PresenceBadge";

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [rating, setRating] = useState<{ average_score: number; total_ratings: number } | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [trustBadges, setTrustBadges] = useState<string[]>([]);
  const [stats, setStats] = useState({ voyages: 0, delivered: 0 });
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);

      const [profileRes, ratingRes, badgesRes, reviewsRes, repliesRes, voyagesRes, deliveredRes] = await Promise.all([
        supabase.from("profiles_public" as any).select("full_name, avatar_url, bio, trust_badges, kyc_status, created_at").eq("user_id", userId).single(),
        supabase.rpc("get_user_rating", { _user_id: userId }),
        supabase.rpc("compute_trust_badges", { _user_id: userId }),
        supabase.from("ratings").select("id, score, comment, rater_role, created_at, photo_urls").eq("rated_id", userId).order("created_at", { ascending: false }),
        supabase.from("rating_replies").select("rating_id, content").eq("user_id", userId),
        supabase.from("voyages").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("shipments").select("id", { count: "exact", head: true }).eq("voyageur_id", userId).eq("status", "delivered"),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (ratingRes.data && ratingRes.data.length > 0 && ratingRes.data[0].total_ratings > 0) setRating(ratingRes.data[0]);
      if (badgesRes.data) setTrustBadges(badgesRes.data);
      if (reviewsRes.data) setReviews(reviewsRes.data);
      if (repliesRes.data) {
        const map: Record<string, string> = {};
        repliesRes.data.forEach((r: any) => { map[r.rating_id] = r.content; });
        setReplies(map);
      }
      setStats({ voyages: voyagesRes.count || 0, delivered: deliveredRes.count || 0 });

      // Check if current user has a conversation with this profile user
      if (user && userId && user.id !== userId) {
        const { data: convo } = await supabase
          .from("conversations")
          .select("id")
          .or(`and(demandeur_id.eq.${user.id},voyageur_id.eq.${userId}),and(demandeur_id.eq.${userId},voyageur_id.eq.${user.id})`)
          .limit(1)
          .maybeSingle();
        if (convo) setConversationId(convo.id);
      }

      setLoading(false);
    };

    load();
  }, [userId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-soft flex flex-col items-center justify-center gap-4">
        <User size={48} className="text-muted-foreground" />
        <p className="text-muted-foreground">Profil introuvable</p>
        <button onClick={() => navigate(-1)} className="text-primary text-sm hover:underline">Retour</button>
      </div>
    );
  }

  const userRef = `VOY-${userId?.slice(0, 8).toUpperCase()}`;
  const kycVerified = profile.kyc_status === "verified" || profile.kyc_status === "approved";

  return (
    <div className="min-h-screen bg-gradient-soft" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px) + 16px)" }}>
      {/* Header */}
      <div
        className="relative overflow-hidden px-6 pt-12 pb-8"
        style={{ background: "linear-gradient(to bottom, #005BB5, #007AFF, rgba(52, 199, 89, 0.12))" }}
      >
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-20 w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-sm">
          <ArrowLeft size={20} />
        </button>

        <div className="relative z-10 flex items-start gap-4 mt-2">
          <div className="relative">
            <Avatar className="h-20 w-20 rounded-2xl">
              <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-white/20 text-white text-2xl font-bold rounded-2xl">
                {profile.full_name?.[0]?.toUpperCase() || "V"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1">
              <PresenceBadge userId={userId} variant="dot" />
            </div>
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-xl font-bold text-white truncate">{profile.full_name || userRef}</h1>
            <p className="text-white/70 text-xs mt-0.5">{userRef}</p>
            <div className="mt-1.5">
              <PresenceBadge userId={userId} variant="label" />
            </div>
            <UserLevelBadge userId={userId} variant="compact" className="mt-1" />

            {profile.bio && (
              <p className="text-white/70 text-xs mt-1.5 line-clamp-2 italic">"{profile.bio}"</p>
            )}

            {rating ? (
              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} className={s <= Math.round(rating.average_score) ? "text-amber-400" : "text-white/20"} fill={s <= Math.round(rating.average_score) ? "currentColor" : "none"} />
                  ))}
                </div>
                <span className="text-white/80 text-xs font-semibold">{rating.average_score}</span>
                <span className="text-white/40 text-xs">({rating.total_ratings} avis)</span>
              </div>
            ) : (
              <p className="text-white/40 text-xs mt-2">Pas encore noté</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 -mt-4 relative z-10">
        {/* Low rating warning */}
        {rating && rating.average_score < 3 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-destructive" />
              </div>
              <div className="flex-1">
                {user?.id === userId ? (
                  <>
                    <p className="text-sm font-semibold text-destructive">Ta note est basse ({rating.average_score}★)</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Ta moyenne est en dessous de 3★. Soigne la communication, respecte les délais et livre avec soin pour remonter ton score et débloquer plus d'opportunités ! 💪
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-destructive">Note moyenne basse ({rating.average_score}★)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ce profil a une note moyenne inférieure à 3★. Vérifie les avis avant de t'engager.
                    </p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
        {/* Contact button */}
        {conversationId && (
          <button
            onClick={() => navigate(`/chat/${conversationId}`)}
            className="w-full mb-4 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-md"
          >
            <MessageSquare size={16} /> Contacter
          </button>
        )}
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-border rounded-2xl p-4 text-center shadow-sm">
            <Plane size={18} className="text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.voyages}</p>
            <p className="text-xs text-muted-foreground">Voyages</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center shadow-sm">
            <Package size={18} className="text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.delivered}</p>
            <p className="text-xs text-muted-foreground">Livraisons</p>
          </div>
        </div>

        {/* Voyageur trust badges & signals (E - V13/V15) */}
        <div className="mb-6">
          <VoyageurProfileBadges
            verifiedKyc={kycVerified}
            verifiedSince={profile.created_at || undefined}
            totalDeliveries={stats.delivered}
            averageRating={rating?.average_score}
          />
        </div>

        {/* Verified signals — KYC, email */}
        <div className="mb-6">
          <VerifiedBadges
            variant="hero"
            signals={{
              kyc: kycVerified,
              email: !!profile, // active account requires verified email
            }}
          />
        </div>

        {/* Trust Badges */}
        {trustBadges.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield size={14} className="text-primary" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Badges de confiance</h3>
            </div>
            <TrustBadgesDisplay badges={trustBadges} />
          </div>
        )}

        {/* Reviews */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-3">
            <Star size={14} className="text-amber-400" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Avis reçus ({reviews.length})
            </h3>
          </div>

          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun avis pour le moment</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={12} className={s <= review.score ? "text-amber-400" : "text-muted-foreground/20"} fill={s <= review.score ? "currentColor" : "none"} />
                      ))}
                      <span className="text-xs font-semibold text-foreground ml-1">{review.score}/5</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-foreground/80 italic">"{review.comment}"</p>
                  )}
                  {Array.isArray(review.photo_urls) && review.photo_urls.length > 0 && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {review.photo_urls.map((url: string, i: number) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="block w-16 h-16 rounded-lg overflow-hidden border border-border hover:opacity-80 transition"
                        >
                          <img
                            src={url}
                            alt={`Photo de l'avis ${i + 1}`}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-2">
                    <User size={12} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{review.rater_role === "demandeur" ? "Membre" : "Voyageur Nidit"}</span>
                  </div>

                  {/* Reply */}
                  {replies[review.id] && (
                    <div className="mt-3 pl-3 border-l-2 border-primary/30">
                      <div className="flex items-center gap-1 mb-1">
                        <MessageSquare size={11} className="text-primary" />
                        <span className="text-xs font-semibold text-primary">Réponse</span>
                      </div>
                      <p className="text-sm text-foreground/80">"{replies[review.id]}"</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default PublicProfile;
