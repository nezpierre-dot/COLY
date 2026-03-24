import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, AlertTriangle, Send, CheckCircle, MessageSquare, Clock, ImagePlus, FileText, Handshake, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserShipment {
  id: string;
  ref: string;
  label: string;
  isVoyageur: boolean;
}

interface DisputeMessage {
  id: string;
  dispute_id?: string;
  sender_role: string;
  content: string;
  photo_url?: string | null;
  created_at: string;
}

const DEMANDEUR_REASONS = [
  { value: "damaged", label: "Colis endommagé" },
  { value: "missing", label: "Colis non reçu" },
  { value: "wrong_item", label: "Mauvais article" },
  { value: "partial", label: "Contenu incomplet" },
  { value: "other", label: "Autre" },
];

const VOYAGEUR_REASONS = [
  { value: "absent_recipient", label: "Destinataire absent au RDV" },
  { value: "wrong_package", label: "Colis non conforme à la description" },
  { value: "overweight", label: "Colis trop lourd / hors gabarit" },
  { value: "unreachable", label: "Demandeur injoignable" },
  { value: "other", label: "Autre" },
];

const DisputesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [shipments, setShipments] = useState<UserShipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [myDisputes, setMyDisputes] = useState<any[]>([]);
  const [disputeMessages, setDisputeMessages] = useState<Record<string, DisputeMessage[]>>({});
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyPhoto, setReplyPhoto] = useState<File | null>(null);
  const [replyPhotoPreview, setReplyPhotoPreview] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [closingDispute, setClosingDispute] = useState<string | null>(null);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [ratingComment, setRatingComment] = useState("");
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingDisputeId, setRatingDisputeId] = useState<string | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const replyPhotoRef = useRef<HTMLInputElement>(null);

  const prefillShipment = searchParams.get("shipment");
  const prefillMission = searchParams.get("mission");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: s } = await supabase
        .from("shipments")
        .select("id, arrival_city, departure_city, status, user_id, voyageur_id")
        .or(`user_id.eq.${user.id},voyageur_id.eq.${user.id}`)
        .in("status", ["delivered", "accepted", "picked_up", "in_transit"]);

      const { data: m } = await supabase
        .from("needit_missions")
        .select("id, product_name, country, city, status, user_id, voyageur_id")
        .or(`user_id.eq.${user.id},voyageur_id.eq.${user.id}`)
        .in("status", ["accepted", "picked_up", "in_transit", "completed"]);

      const items: UserShipment[] = [];
      if (s) {
        items.push(...s.map((x) => ({
          id: x.id,
          ref: "NIDIT-" + x.id.slice(0, 8).toUpperCase(),
          label: `📦 NIDIT-${x.id.slice(0, 8).toUpperCase()} — ${x.departure_city || "—"} → ${x.arrival_city}`,
          isVoyageur: x.voyageur_id === user.id,
        })));
      }
      if (m) {
        items.push(...m.map((x) => ({
          id: x.id,
          ref: "NEED-" + x.id.slice(0, 8).toUpperCase(),
          label: `🛒 NEED-${x.id.slice(0, 8).toUpperCase()} — ${x.product_name || "Mission"} (${x.city || x.country})`,
          isVoyageur: x.voyageur_id === user.id,
        })));
      }
      setShipments(items);

      const prefillId = prefillShipment || prefillMission;
      if (prefillId && items.some((i) => i.id === prefillId)) {
        setSelectedShipment(prefillId);
      }

      // Fetch disputes I opened + disputes on my shipments/missions as voyageur
      const { data: dOwned } = await supabase
        .from("disputes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch disputes where I'm the voyageur (via shipments or needit_missions)
      const myShipmentIds = (s || []).map(x => x.id);
      const myMissionIds = (m || []).map(x => x.id);
      const allItemIds = [...myShipmentIds, ...myMissionIds].filter(Boolean);
      
      let dAsVoyageur: any[] = [];
      if (allItemIds.length > 0) {
        const { data: dv } = await supabase
          .from("disputes")
          .select("*")
          .in("shipment_id", allItemIds)
          .neq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (dv) dAsVoyageur = dv;
      }

      // Merge and deduplicate
      const allDisputes = [...(dOwned || []), ...dAsVoyageur];
      const seen = new Set<string>();
      const deduped = allDisputes.filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });
      
      if (deduped.length > 0) {
        setMyDisputes(deduped);
        const disputeIds = deduped.map((x: any) => x.id);
        if (disputeIds.length > 0) {
          const [msgsRes, ratingsRes] = await Promise.all([
            supabase
              .from("dispute_messages" as any)
              .select("*")
              .in("dispute_id", disputeIds)
              .order("created_at", { ascending: true }),
            supabase
              .from("dispute_ratings" as any)
              .select("*")
              .eq("user_id", user.id),
          ]);
          if (msgsRes.data) {
            const grouped: Record<string, DisputeMessage[]> = {};
            (msgsRes.data as any[]).forEach((msg: any) => {
              if (!grouped[msg.dispute_id]) grouped[msg.dispute_id] = [];
              grouped[msg.dispute_id].push(msg);
            });
            setDisputeMessages(grouped);
          }
          if (ratingsRes.data) {
            const rMap: Record<string, number> = {};
            (ratingsRes.data as any[]).forEach((r: any) => { rMap[r.dispute_id] = r.score; });
            setMyRatings(rMap);
          }
        }
      }
    };
    load();

    // Realtime subscription for new dispute messages
    const channel = supabase
      .channel('dispute-messages-user')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dispute_messages' },
        (payload) => {
          const newMsg = payload.new as any;
          // Only add if it's for one of my disputes and not from me
          setDisputeMessages((prev) => {
            const existing = prev[newMsg.dispute_id] || [];
            if (existing.some((m) => m.id === newMsg.id)) return prev;
            return { ...prev, [newMsg.dispute_id]: [...existing, newMsg] };
          });
          if (newMsg.sender_role === "admin" && newMsg.sender_id !== user.id) {
            toast.info("📩 Nouvelle réponse du support sur votre litige");
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, prefillShipment, prefillMission]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    if (file.type === "application/pdf") {
      setPhotoPreview("pdf");
    } else {
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleReplyPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplyPhoto(file);
    if (file.type === "application/pdf") {
      setReplyPhotoPreview("pdf:" + file.name);
    } else {
      setReplyPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `disputes/${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("shipment-photos").upload(path, file);
    if (error) return null;
    const { data } = await supabase.storage.from("shipment-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl ?? null;
  };

  const handleSubmit = async () => {
    if (!user || !selectedShipment || !reason || !description.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      }

      const disputeId = crypto.randomUUID();
      const { error } = await supabase.from("disputes").insert({
        id: disputeId,
        shipment_id: selectedShipment,
        user_id: user.id,
        reason,
        description: description.trim(),
        photo_url: photoUrl,
      });
      if (error) throw error;

      await supabase.from("dispute_messages" as any).insert({
        dispute_id: disputeId,
        sender_id: user.id,
        sender_role: "user",
        content: description.trim(),
        photo_url: photoUrl,
      } as any);

      supabase.functions.invoke("notify-dispute", {
        body: { dispute_id: disputeId, shipment_id: selectedShipment, reason, description: description.trim() },
      }).catch((e: any) => console.warn("notify-dispute error:", e));

      setSubmitted(true);
      toast.success("Litige soumis avec succès");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  const getMyRole = (dispute: any) => {
    return dispute.user_id === user?.id ? "user" : "voyageur";
  };

  const handleUserReply = async (disputeId: string) => {
    if (!user || (!replyText.trim() && !replyPhoto)) return;
    setSendingReply(true);
    const dispute = myDisputes.find(d => d.id === disputeId);
    const role = dispute ? getMyRole(dispute) : "user";
    try {
      let photoUrl: string | null = null;
      if (replyPhoto) {
        photoUrl = await uploadPhoto(replyPhoto);
      }

      await supabase.from("dispute_messages" as any).insert({
        dispute_id: disputeId,
        sender_id: user.id,
        sender_role: role,
        content: replyText.trim() || (photoUrl ? "📷 Photo jointe" : ""),
        photo_url: photoUrl,
      } as any);

      setReplyText("");
      setReplyPhoto(null);
      setReplyPhotoPreview(null);
      toast.success("Message envoyé");
    } catch (err: any) {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSendingReply(false);
    }
  };

  const handleAmicableClosure = async (disputeId: string) => {
    if (!user) return;
    setClosingDispute(disputeId);
    try {
      const dispute = myDisputes.find(d => d.id === disputeId);
      if (!dispute) return;

      // Add closure message
      const role = getMyRole(dispute);
      await supabase.from("dispute_messages" as any).insert({
        dispute_id: disputeId,
        sender_id: user.id,
        sender_role: role,
        content: "🤝 Ce litige a été clôturé à l'amiable entre les deux parties.",
      } as any);

      // Update dispute status
      // Only the dispute opener can close it, but we allow both parties
      // We use a function call via edge or direct update
      const { error } = await supabase
        .from("disputes")
        .update({ status: "resolved", resolution: "Clôture amiable entre les parties" } as any)
        .eq("id", disputeId);

      if (error) {
        // If the user is not the owner, try via the other party acceptance pattern
        toast.error("Seul le demandeur du litige ou un admin peut clôturer le litige.");
        return;
      }

      setMyDisputes(prev => prev.map(d => d.id === disputeId ? { ...d, status: "resolved", resolution: "Clôture amiable entre les parties" } : d));
      toast.success("Litige clôturé à l'amiable ✅");
    } catch (err: any) {
      toast.error("Erreur lors de la clôture");
    } finally {
      setClosingDispute(null);
    }
  };

  const handleSubmitRating = async (disputeId: string, score: number) => {
    if (!user) return;
    setSubmittingRating(true);
    try {
      await supabase.from("dispute_ratings" as any).insert({
        dispute_id: disputeId,
        user_id: user.id,
        score,
        comment: ratingComment.trim() || null,
      } as any);
      setMyRatings(prev => ({ ...prev, [disputeId]: score }));
      setRatingDisputeId(null);
      setRatingComment("");
      toast.success("Merci pour votre évaluation !");
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSubmittingRating(false);
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      open: { label: "En attente", cls: "bg-warning/10 text-warning" },
      investigating: { label: "En cours", cls: "bg-primary/10 text-primary" },
      escalated: { label: "Escaladé", cls: "bg-destructive/10 text-destructive" },
      resolved: { label: "Résolu", cls: "bg-success/10 text-success" },
      refunded: { label: "Remboursé", cls: "bg-accent/10 text-accent" },
    };
    const c = map[s] || { label: s, cls: "bg-muted text-muted-foreground" };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.cls}`}>{c.label}</span>;
  };

  const formatTime = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return d; }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Litige soumis</h2>
          <p className="text-sm text-muted-foreground">Notre équipe examinera votre demande sous 48h.</p>
          <Button onClick={() => navigate("/dashboard")} className="rounded-xl">Retour au tableau de bord</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <AlertTriangle size={18} className="text-warning" /> Litiges
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {(prefillShipment || prefillMission) && selectedShipment && (
          <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-primary">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              L'élément <strong>{shipments.find(s => s.id === selectedShipment)?.ref}</strong> a été pré-sélectionné.
            </span>
          </div>
        )}

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-foreground">Ouvrir un litige</h2>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Colis ou mission concerné(e) *</label>
            <Select value={selectedShipment} onValueChange={(v) => { setSelectedShipment(v); setReason(""); }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner un élément" /></SelectTrigger>
              <SelectContent>
                {shipments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Motif *</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner un motif" /></SelectTrigger>
              <SelectContent>
                {(selectedShipment && shipments.find(s => s.id === selectedShipment)?.isVoyageur ? VOYAGEUR_REASONS : DEMANDEUR_REASONS).map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Description *</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème en détail..."
              className="min-h-[100px] rounded-xl"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Photo ou PDF (optionnel)</label>
            <label className="flex items-center justify-center gap-2 h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
              {photoPreview ? (
                photoFile?.type === "application/pdf" ? (
                  <div className="flex items-center gap-2 text-primary">
                    <FileText size={24} />
                    <span className="text-xs font-medium">{photoFile.name}</span>
                  </div>
                ) : (
                  <img src={photoPreview} alt="Preuve" className="h-full object-cover rounded-lg" />
                )
              ) : (
                <div className="text-center">
                  <Camera size={20} className="text-muted-foreground mx-auto mb-1" />
                  <span className="text-xs text-muted-foreground">Photo ou PDF</span>
                </div>
              )}
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handlePhoto} />
            </label>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedShipment || !reason || !description.trim()}
            className="w-full rounded-xl gap-2"
          >
            <Send size={16} /> {submitting ? "Envoi en cours..." : "Soumettre le litige"}
          </Button>
        </div>

        {/* My disputes with message history */}
        {myDisputes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-foreground">Mes litiges</h2>
            <p className="text-xs text-muted-foreground">Litiges ouverts par vous ou concernant vos missions en tant que voyageur.</p>
            {myDisputes.map((d) => {
              const messages = disputeMessages[d.id] || [];
              const isExpanded = expandedDispute === d.id;
              const isActive = d.status === "open" || d.status === "investigating";
              return (
                <div key={d.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-foreground">
                        LIT-{d.id.slice(0, 8).toUpperCase()}
                      </span>
                      {d.user_id !== user?.id && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent-foreground">Voyageur</span>
                      )}
                    </div>
                    {statusLabel(d.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">{[...DEMANDEUR_REASONS, ...VOYAGEUR_REASONS].find((r) => r.value === d.reason)?.label ?? d.reason}</p>
                  <p className="text-sm text-foreground">{d.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedDispute(isExpanded ? null : d.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <MessageSquare size={13} />
                      {messages.length > 0 ? `Échanges (${messages.length})` : "Voir les échanges"}
                    </button>

                    {isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-xl gap-1.5 text-xs border-success/30 text-success hover:bg-success/10"
                        disabled={closingDispute === d.id}
                        onClick={() => {
                          if (confirm("Êtes-vous sûr de vouloir clôturer ce litige à l'amiable ? Cette action est irréversible.")) {
                            handleAmicableClosure(d.id);
                          }
                        }}
                      >
                        <Handshake size={13} />
                        {closingDispute === d.id ? "Clôture..." : "Clôturer à l'amiable"}
                      </Button>
                    )}
                  </div>

                  {/* Post-resolution satisfaction rating */}
                  {(d.status === "resolved" || d.status === "refunded") && !myRatings[d.id] && (
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Star size={13} className="text-yellow-500" /> Comment évaluez-vous la résolution de ce litige ?
                      </p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button
                            key={s}
                            onClick={() => setRatingDisputeId(d.id)}
                            disabled={submittingRating}
                            className={`w-8 h-8 rounded-lg bg-muted hover:bg-yellow-500/20 flex items-center justify-center transition-colors ${ratingDisputeId === d.id && ratingScore >= s ? "bg-yellow-500/20" : ""}`}
                            onClickCapture={(e) => { e.stopPropagation(); setRatingDisputeId(d.id); setRatingScore(s); }}
                          >
                            <Star size={16} className="text-yellow-500" fill={ratingDisputeId === d.id && ratingScore >= s ? "currentColor" : "none"} />
                          </button>
                        ))}
                      </div>
                      {ratingDisputeId === d.id && ratingScore > 0 && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                            placeholder="Un commentaire ? (optionnel)"
                            className="w-full h-8 rounded-lg border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          <Button
                            size="sm"
                            className="h-7 rounded-lg text-xs gap-1"
                            disabled={submittingRating}
                            onClick={() => handleSubmitRating(d.id, ratingScore)}
                          >
                            <Send size={12} /> Envoyer
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {(d.status === "resolved" || d.status === "refunded") && myRatings[d.id] && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Star size={12} className="text-yellow-500" fill="currentColor" /> Votre note : {myRatings[d.id]}/5
                    </div>
                  )}

                  {isExpanded && (
                    <div className="space-y-2 pt-1">
                      {messages.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Aucun échange pour le moment.</p>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`rounded-xl p-3 text-xs ${
                                msg.sender_role === "admin"
                                  ? "bg-primary/5 border border-primary/20 ml-4"
                                  : "bg-muted/50 border border-border mr-4"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className={`font-semibold ${msg.sender_role === "admin" ? "text-primary" : msg.sender_role === "voyageur" ? "text-accent-foreground" : "text-foreground"}`}>
                                  {msg.sender_role === "admin" ? "🛡️ Support Nidit" : msg.sender_role === "voyageur" ? "🚀 Voyageur" : (d.user_id === user?.id ? "Vous" : "Demandeur")}
                                </span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Clock size={9} /> {formatTime(msg.created_at)}
                                </span>
                              </div>
                              {msg.photo_url && (
                                msg.photo_url.includes('.pdf') ? (
                                  <a href={msg.photo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary text-xs underline mb-1.5">
                                    <FileText size={14} /> Voir le PDF joint
                                  </a>
                                ) : (
                                  <img src={msg.photo_url} alt="Photo jointe" className="w-full max-w-[200px] rounded-lg mb-1.5 border border-border" />
                                )
                              )}
                              <p className="text-foreground whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {isActive && (
                        <div className="space-y-2 pt-1">
                          {replyPhotoPreview && (
                            <div className="relative inline-block">
                              {replyPhotoPreview.startsWith("pdf:") ? (
                                <div className="flex items-center gap-1.5 text-primary text-xs bg-primary/5 rounded-lg p-2 border border-primary/20">
                                  <FileText size={16} />
                                  <span>{replyPhotoPreview.replace("pdf:", "")}</span>
                                </div>
                              ) : (
                                <img src={replyPhotoPreview} alt="Photo à joindre" className="w-20 h-20 object-cover rounded-lg border border-border" />
                              )}
                              <button
                                onClick={() => { setReplyPhoto(null); setReplyPhotoPreview(null); }}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                              >×</button>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => replyPhotoRef.current?.click()}
                              className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
                            >
                              <ImagePlus size={16} className="text-muted-foreground" />
                            </button>
                            <input ref={replyPhotoRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleReplyPhoto} />
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Répondre..."
                              className="flex-1 h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleUserReply(d.id)}
                            />
                            <Button
                              size="sm"
                              className="h-9 rounded-xl gap-1"
                              disabled={sendingReply || (!replyText.trim() && !replyPhoto)}
                              onClick={() => handleUserReply(d.id)}
                            >
                              <Send size={12} />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DisputesPage;
