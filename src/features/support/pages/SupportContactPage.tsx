import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MessageSquarePlus, Clock, CheckCircle, AlertTriangle, ChevronDown, Headphones } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { hapticLight, hapticSuccess } from "@/lib/haptics";

const CATEGORIES = [
  { value: "general", label: "Question générale" },
  { value: "account", label: "Mon compte" },
  { value: "payment", label: "Paiement / Wallet" },
  { value: "bug", label: "Bug / Problème technique" },
  { value: "suggestion", label: "Suggestion" },
  { value: "other", label: "Autre" },
];

const SupportContactPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!subject.trim() || !message.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (subject.trim().length > 100) {
      toast.error("Le sujet ne doit pas dépasser 100 caractères");
      return;
    }
    if (message.trim().length > 2000) {
      toast.error("Le message ne doit pas dépasser 2000 caractères");
      return;
    }

    setSending(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
      category,
    });

    if (error) {
      toast.error("Erreur lors de l'envoi");
    } else {
      hapticSuccess();
      toast.success("Message envoyé au support !");
      setSubject("");
      setMessage("");
      setCategory("general");
      setShowForm(false);
      loadTickets();
    }
    setSending(false);
  };

  const statusConfig: Record<string, { icon: typeof Clock; label: string; color: string }> = {
    open: { icon: Clock, label: "En attente", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    replied: { icon: CheckCircle, label: "Répondu", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    closed: { icon: CheckCircle, label: "Résolu", color: "text-muted-foreground bg-muted/50 border-border" },
  };

  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "replied");
  const closedTickets = tickets.filter((t) => t.status === "closed");

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <button onClick={() => navigate(-1)} className="text-muted-foreground mb-4">
          <ArrowLeft size={24} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Headphones size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contacter le support</h1>
            <p className="text-sm text-muted-foreground">Une question ? Écrivez-nous !</p>
          </div>
        </div>

        {/* New ticket button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { hapticLight(); setShowForm(!showForm); }}
          className="w-full py-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-[0_4px_16px_hsl(var(--primary)/0.3)] mb-6"
        >
          <MessageSquarePlus size={20} />
          Nouveau message
        </motion.button>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <h3 className="text-base font-semibold text-foreground">Votre message</h3>

                {/* Category */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Catégorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Sujet</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={100}
                    placeholder="Ex: Problème de connexion"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Décrivez votre problème ou question en détail..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right mt-0.5">{message.length}/2000</p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={sending || !subject.trim() || !message.trim()}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={16} />
                  {sending ? "Envoi en cours..." : "Envoyer"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tickets list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : tickets.length === 0 && !showForm ? (
          <div className="text-center py-16">
            <Headphones size={48} className="text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Aucun message envoyé</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Cliquez sur "Nouveau message" pour nous contacter</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Open tickets */}
            {openTickets.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <AlertTriangle size={13} /> En cours ({openTickets.length})
                </h3>
                <div className="space-y-3">
                  {openTickets.map((ticket) => {
                    const cfg = statusConfig[ticket.status] || statusConfig.open;
                    const StatusIcon = cfg.icon;
                    const isExpanded = expandedTicket === ticket.id;
                    return (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card border border-border rounded-2xl overflow-hidden"
                      >
                        <button
                          onClick={() => { hapticLight(); setExpandedTicket(isExpanded ? null : ticket.id); }}
                          className="w-full px-4 py-3.5 flex items-start gap-3 text-left"
                        >
                          <div className={`mt-0.5 px-2 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 shrink-0 ${cfg.color}`}>
                            <StatusIcon size={12} />
                            {cfg.label}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category} ·{" "}
                              {new Date(ticket.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </p>
                          </div>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="shrink-0 mt-1">
                            <ChevronDown size={16} className="text-muted-foreground" />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Votre message</p>
                                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{ticket.message}</p>
                                </div>
                                {ticket.admin_reply && (
                                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
                                    <p className="text-xs font-semibold text-primary mb-1">Réponse du support</p>
                                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{ticket.admin_reply}</p>
                                    {ticket.replied_at && (
                                      <p className="text-xs text-muted-foreground mt-2">
                                        {new Date(ticket.replied_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Closed tickets */}
            {closedTickets.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <CheckCircle size={13} /> Résolus ({closedTickets.length})
                </h3>
                <div className="space-y-3">
                  {closedTickets.map((ticket) => {
                    const cfg = statusConfig.closed;
                    const StatusIcon = cfg.icon;
                    const isExpanded = expandedTicket === ticket.id;
                    return (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card border border-border rounded-2xl overflow-hidden opacity-70"
                      >
                        <button
                          onClick={() => { hapticLight(); setExpandedTicket(isExpanded ? null : ticket.id); }}
                          className="w-full px-4 py-3.5 flex items-start gap-3 text-left"
                        >
                          <div className={`mt-0.5 px-2 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 shrink-0 ${cfg.color}`}>
                            <StatusIcon size={12} />
                            {cfg.label}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(ticket.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </p>
                          </div>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="shrink-0 mt-1">
                            <ChevronDown size={16} className="text-muted-foreground" />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{ticket.message}</p>
                                {ticket.admin_reply && (
                                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
                                    <p className="text-xs font-semibold text-primary mb-1">Réponse du support</p>
                                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{ticket.admin_reply}</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default SupportContactPage;
