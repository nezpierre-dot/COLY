import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Send as SendIcon, Package, ShoppingBag, MapPin,
  Calendar, Ruler, Weight, DollarSign, Image as ImageIcon, X, CheckCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ShipmentDetail {
  type: "shipment";
  departure_city: string | null;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  size: string;
  tarif: string;
  insured: boolean;
  departure_method: string;
}

interface MissionDetail {
  type: "mission";
  product_name: string | null;
  category_path: string[];
  country: string;
  city: string | null;
  prix_max: string | null;
  poids: string | null;
  dimension: string | null;
  timing: string;
  is_unlisted: boolean;
  unlisted_description: string | null;
}

type ItemDetail = ShipmentDetail | MissionDetail;

const getCurrencySymbol = () => {
  try {
    const stored = localStorage.getItem("preferred-currency");
    const currencies: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CAD: "CA$", CHF: "CHF", XOF: "CFA", XAF: "CFA", MAD: "MAD", TND: "TND", DZD: "DZD" };
    if (stored && currencies[stored]) return currencies[stored];
  } catch {}
  return "€";
};

// Detect image message
const isImageUrl = (content: string) => content.startsWith("__IMG__:");
const getImageUrl = (content: string) => content.replace("__IMG__:", "");

const ChatPage = () => {
  const navigate = useNavigate();
  const { id: conversationId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [otherUserId, setOtherUserId] = useState("");
  const [shipmentRoute, setShipmentRoute] = useState("");
  const [itemDetail, setItemDetail] = useState<ItemDetail | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId || !user) return;

    const load = async () => {
      const { data: convo } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle();

      if (convo) {
        const otherId = convo.demandeur_id === user.id ? convo.voyageur_id : convo.demandeur_id;
        setOtherUserId(otherId);
        const isOtherVoyageur = convo.voyageur_id === otherId;
        const otherRef = (isOtherVoyageur ? "VOY-" : "EXP-") + otherId.substring(0, 8).toUpperCase();
        setOtherName(otherRef);

        const { data: shipData } = await supabase
          .from("shipments")
          .select("departure_city, arrival_city, arrival_country, departure_date, size, tarif, insured, departure_method")
          .eq("id", convo.shipment_id)
          .maybeSingle();

        if (shipData) {
          setShipmentRoute(`${shipData.departure_city || "—"} → ${shipData.arrival_city}`);
          setItemDetail({
            type: "shipment",
            departure_city: shipData.departure_city,
            arrival_city: shipData.arrival_city,
            arrival_country: shipData.arrival_country,
            departure_date: shipData.departure_date,
            size: shipData.size,
            tarif: shipData.tarif,
            insured: shipData.insured,
            departure_method: shipData.departure_method,
          });
        } else {
          const { data: missionData } = await supabase
            .from("needit_missions")
            .select("product_name, category_path, country, city, prix_max, poids, dimension, timing, is_unlisted, unlisted_description")
            .eq("id", convo.shipment_id)
            .maybeSingle();

          if (missionData) {
            setShipmentRoute(`NeedIt → ${missionData.city || missionData.country}`);
            setItemDetail({ type: "mission", ...missionData });
          }
        }
      }

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (msgs) setMessages(msgs);

      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .eq("is_read", false)
        .neq("sender_id", user.id);
    };
    load();

    // Realtime messages
    const msgChannel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => {
          // Avoid duplicate
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.sender_id !== user.id) {
          supabase.from("messages").update({ is_read: true }).eq("id", msg.id).then();
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();

    // Typing indicator via Presence
    const typingChannel = supabase.channel(`typing-${conversationId}`, {
      config: { presence: { key: user.id } },
    });
    typingChannelRef.current = typingChannel;

    typingChannel
      .on("presence", { event: "sync" }, () => {
        const state = typingChannel.presenceState();
        const others = Object.entries(state)
          .filter(([key]) => key !== user.id)
          .map(([, v]) => v as { typing?: boolean }[]);
        setIsOtherTyping(others.some((arr) => arr?.[0]?.typing === true));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [conversationId, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isOtherTyping]);

  const broadcastTyping = (typing: boolean) => {
    typingChannelRef.current?.track({ typing });
  };

  const handleInputChange = (v: string) => {
    setNewMessage(v);
    broadcastTyping(v.length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (v.length > 0) {
      typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 3000);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !conversationId || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");
    broadcastTyping(false);

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    });

    setSending(false);
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user || !conversationId) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${conversationId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("chat-photos")
        .upload(path, file, { upsert: false });

      if (upErr) throw upErr;

      const { data: signedData } = await supabase.storage
        .from("chat-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 90); // 90 days expiry
      const photoUrl = signedData?.signedUrl ?? "";

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: `__IMG__:${photoUrl}`,
      });
    } catch {
      toast.error("Erreur lors de l'envoi de la photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach((msg) => {
    const date = new Date(msg.created_at).toDateString();
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg] });
    }
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card/95 backdrop-blur-lg border-b border-border/60 px-4 pt-12 pb-3 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/conversations")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={24} />
          </button>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{otherName.charAt(0)?.toUpperCase() || "?"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{otherName}</p>
            {shipmentRoute && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Package size={10} /> {shipmentRoute}
              </p>
            )}
          </div>
          {isOtherTyping && (
            <span className="text-[10px] text-primary animate-pulse shrink-0">en train d'écrire…</span>
          )}
        </div>
      </div>

      {/* Recap Card */}
      {itemDetail && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-3 bg-card border border-border rounded-xl p-3.5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {itemDetail.type === "shipment" ? (
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package size={14} className="text-primary" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
                  <ShoppingBag size={14} className="text-accent" />
                </div>
              )}
              <span className="text-xs font-bold text-foreground">
                {itemDetail.type === "shipment" ? "📦 Récap Colis" : "🛒 Récap Mission NeedIt"}
              </span>
            </div>
          </div>

          {itemDetail.type === "shipment" ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin size={11} />
                <span>{itemDetail.departure_city || "—"} → {itemDetail.arrival_city}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar size={11} />
                <span>{new Date(itemDetail.departure_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Ruler size={11} />
                <span>Taille : {itemDetail.size === "S" ? "Petit" : itemDetail.size === "M" ? "Moyen" : itemDetail.size === "L" ? "Grand" : itemDetail.size === "XL" ? "Très grand" : itemDetail.size}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <DollarSign size={11} />
                <span>{isNaN(Number(itemDetail.tarif)) ? "Standard" : `${itemDetail.tarif} ${getCurrencySymbol()}`}</span>
              </div>
              <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                <Package size={11} />
                <span>{itemDetail.departure_method === "main" ? "En main propre" : itemDetail.departure_method === "relay" ? "Point relais" : itemDetail.departure_method === "address" ? "À domicile" : itemDetail.departure_method}{itemDetail.insured ? " • Assuré ✅" : ""}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="col-span-2 flex items-center gap-1.5 text-foreground font-medium">
                <ShoppingBag size={11} />
                <span>{itemDetail.is_unlisted ? (itemDetail.unlisted_description || "Produit non référencé") : (itemDetail.product_name || itemDetail.category_path?.join(" > "))}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin size={11} />
                <span>{itemDetail.city ? `${itemDetail.city}, ` : ""}{itemDetail.country}</span>
              </div>
              {itemDetail.prix_max && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign size={11} />
                  <span>Max {itemDetail.prix_max} {getCurrencySymbol()}</span>
                </div>
              )}
              {itemDetail.poids && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Weight size={11} />
                  <span>{itemDetail.poids}</span>
                </div>
              )}
              {itemDetail.dimension && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Ruler size={11} />
                  <span>{itemDetail.dimension}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar size={11} />
                <span>{itemDetail.timing === "asap" ? "Dès que possible" : itemDetail.timing}</span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Commencez la conversation 👋</p>
          </div>
        )}

        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] font-medium text-muted-foreground">
                {formatDateSeparator(group.msgs[0].created_at)}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Messages in group */}
            {group.msgs.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              const isImg = isImageUrl(msg.content);
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex mb-1.5 ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl ${isImg ? "p-1" : "px-3.5 py-2.5"} ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {isImg ? (
                      <div className="relative">
                        <img
                          src={getImageUrl(msg.content)}
                          alt="Photo"
                          className="max-w-[220px] max-h-[280px] rounded-xl object-cover cursor-pointer"
                          onClick={() => setPreviewPhoto(getImageUrl(msg.content))}
                        />
                        <div className={`absolute bottom-1 right-2 flex items-center gap-0.5`}>
                          <span className="text-[9px] text-white/80 drop-shadow">{formatTime(msg.created_at)}</span>
                          {isMine && (
                            <CheckCheck
                              size={12}
                              className={msg.is_read ? "text-blue-300 drop-shadow" : "text-white/60 drop-shadow"}
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1`}>
                          <p className={`text-[9px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatTime(msg.created_at)}
                          </p>
                          {isMine && (
                            <CheckCheck
                              size={12}
                              className={msg.is_read ? "text-blue-300" : "text-primary-foreground/40"}
                            />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {isOtherTyping && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex justify-start"
            >
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Quick Suggestions */}
      {messages.length > 0 && messages.length <= 6 && (
        <div className="px-4 pb-1 shrink-0">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              "📍 Coordonnées de remise ?",
              "📸 Photo du colis ?",
              "📅 Dispo pour récupérer ?",
            ].map((s) => (
              <button
                key={s}
                onClick={() => { setNewMessage(s.replace(/^..\s/, "")); }}
                className="shrink-0 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-card/95 backdrop-blur-lg border-t border-border/60 px-4 py-3 pb-safe shrink-0">
        <div className="flex items-end gap-2 max-w-lg mx-auto">
          {/* Photo button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => fileRef.current?.click()}
            disabled={uploadingPhoto}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            {uploadingPhoto ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <ImageIcon size={18} />
            )}
          </motion.button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoUpload(file);
              e.target.value = "";
            }}
          />

          {/* Text area */}
          <div className="flex-1 bg-muted rounded-2xl px-4 py-2.5">
            <textarea
              value={newMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Écrire un message..."
              rows={1}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-24"
            />
          </div>

          {/* Send button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"
          >
            <SendIcon size={18} className="text-primary-foreground" />
          </motion.button>
        </div>
      </div>

      {/* Photo preview lightbox */}
      <AnimatePresence>
        {previewPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreviewPhoto(null)}
          >
            <button
              className="absolute top-4 right-4 text-white/80 hover:text-white"
              onClick={() => setPreviewPhoto(null)}
            >
              <X size={28} />
            </button>
            <img
              src={previewPhoto}
              alt="Aperçu"
              className="max-w-full max-h-full rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;
