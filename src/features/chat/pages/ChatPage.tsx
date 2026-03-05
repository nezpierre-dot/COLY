import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send as SendIcon, Package, ShoppingBag, MapPin, Calendar, Ruler, Weight, DollarSign, Image as ImageIcon, X, CheckCheck, Clock, Truck, PackageCheck, HandshakeIcon, CircleDot, ShieldCheck, Navigation, Camera, Phone, ThumbsUp, CalendarDays, MapPinned, Receipt, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { localizeCity, localizeCountry } from "@/lib/geoLocalization";
import { useTranslation } from "@/hooks/useTranslation";

interface Message { id: string; sender_id: string; content: string; created_at: string; is_read: boolean; }
interface ShipmentDetail { type: "shipment"; departure_city: string | null; arrival_city: string; arrival_country: string; departure_date: string; size: string; tarif: string; insured: boolean; departure_method: string; }
interface MissionDetail { type: "mission"; product_name: string | null; category_path: string[]; country: string; city: string | null; prix_max: string | null; poids: string | null; dimension: string | null; timing: string; is_unlisted: boolean; unlisted_description: string | null; }
type ItemDetail = ShipmentDetail | MissionDetail;

const getCurrencySymbol = () => {
  try {
    const stored = localStorage.getItem("preferred-currency");
    const currencies: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CAD: "CA$", CHF: "CHF", XOF: "CFA", XAF: "CFA", MAD: "MAD", TND: "TND", DZD: "DZD" };
    if (stored && currencies[stored]) return currencies[stored];
  } catch {}
  return "€";
};

const isImageUrl = (content: string) => content.startsWith("__IMG__:") || content.startsWith("__PROOF__:");
const isProofImage = (content: string) => content.startsWith("__PROOF__:");
const getImageUrl = (content: string) => content.replace("__IMG__:", "").replace("__PROOF__:", "");
const LINK_PATTERN = /→ __LINK__:needit-detail:([a-f0-9-]+)/;
const hasInlineLink = (content: string) => LINK_PATTERN.test(content);
const parseMessageWithLink = (content: string) => {
  const match = content.match(LINK_PATTERN);
  if (!match) return { text: content, linkId: null };
  const text = content.replace(LINK_PATTERN, "").trimEnd();
  return { text, linkId: match[1] };
};

const ChatPage = () => {
  const navigate = useNavigate();
  const { id: conversationId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [otherUserId, setOtherUserId] = useState("");
  const [shipmentRoute, setShipmentRoute] = useState("");
  const [itemDetail, setItemDetail] = useState<ItemDetail | null>(null);
  const [shipmentStatus, setShipmentStatus] = useState<string>("pending");
  const [shipmentId, setShipmentId] = useState<string>("");
  const [isVoyageur, setIsVoyageur] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const proofCameraRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    if (!conversationId || !user) return;
    const load = async () => {
      const { data: convo } = await supabase.from("conversations").select("*").eq("id", conversationId).maybeSingle();
      if (convo) {
        const otherId = convo.demandeur_id === user.id ? convo.voyageur_id : convo.demandeur_id;
        setOtherUserId(otherId);
        setIsVoyageur(convo.voyageur_id === user.id);
        setShipmentId(convo.shipment_id);
        const isOtherVoyageur = convo.voyageur_id === otherId;
        setOtherName((isOtherVoyageur ? "VOY-" : "EXP-") + otherId.substring(0, 8).toUpperCase());

        const { data: shipData } = await supabase.from("shipments").select("departure_city, arrival_city, arrival_country, departure_date, size, tarif, insured, departure_method, status").eq("id", convo.shipment_id).maybeSingle();
        if (shipData) {
          setShipmentRoute(`${shipData.departure_city ? localizeCity(shipData.departure_city) : "—"} → ${localizeCity(shipData.arrival_city)}`);
          setShipmentStatus(shipData.status || "pending");
          setItemDetail({ type: "shipment", ...shipData });
        } else {
          const { data: missionData } = await supabase.from("needit_missions").select("product_name, category_path, country, city, prix_max, poids, dimension, timing, is_unlisted, unlisted_description, status").eq("id", convo.shipment_id).maybeSingle();
          if (missionData) {
            setShipmentRoute(`NeedIt → ${missionData.city ? localizeCity(missionData.city) : localizeCountry(missionData.country)}`);
            setShipmentStatus(missionData.status || "pending");
            setItemDetail({ type: "mission", ...missionData });
          }
        }
      }
      const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
      if (msgs) setMessages(msgs);
      await supabase.from("messages").update({ is_read: true }).eq("conversation_id", conversationId).eq("is_read", false).neq("sender_id", user.id);
    };
    load();

    const msgChannel = supabase.channel(`chat-${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      const msg = payload.new as Message;
      setMessages((prev) => { if (prev.find(m => m.id === msg.id)) return prev; return [...prev, msg]; });
      if (msg.sender_id !== user.id) supabase.from("messages").update({ is_read: true }).eq("id", msg.id).then();
    }).subscribe();

    const typingChannel = supabase.channel(`typing-${conversationId}`, { config: { presence: { key: user.id } } });
    typingChannelRef.current = typingChannel;
    typingChannel.on("presence", { event: "sync" }, () => {
      const state = typingChannel.presenceState();
      const others = Object.entries(state).filter(([key]) => key !== user.id).map(([, v]) => v as { typing?: boolean }[]);
      setIsOtherTyping(others.some((arr) => arr?.[0]?.typing === true));
    }).subscribe();

    return () => { supabase.removeChannel(msgChannel); supabase.removeChannel(typingChannel); };
  }, [conversationId, user]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, isOtherTyping]);

  const broadcastTyping = (typing: boolean) => { typingChannelRef.current?.track({ typing }); };
  const handleInputChange = (v: string) => {
    setNewMessage(v); broadcastTyping(v.length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (v.length > 0) typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 3000);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !conversationId || sending) return;
    setSending(true); const content = newMessage.trim(); setNewMessage(""); broadcastTyping(false);
    await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, content });
    setSending(false);
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user || !conversationId) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${conversationId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-photos").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: signedData } = await supabase.storage.from("chat-photos").createSignedUrl(path, 60 * 60 * 24 * 90);
      const photoUrl = signedData?.signedUrl ?? "";
      await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, content: `__IMG__:${photoUrl}` });
    } catch { toast.error(t("chat.photoError")); } finally { setUploadingPhoto(false); }
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr); const now = new Date(); const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t("chat.today"); if (diffDays === 1) return t("chat.yesterday");
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
  };

  // Check if proof photos have been sent (for NeedIt missions)
  const isMissionChat = itemDetail?.type === "mission";
  const proofSent = useMemo(() => messages.some(m => isProofImage(m.content)), [messages]);

  const handleProofCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleProofConfirm = async () => {
    if (!proofFile || !user || !conversationId) return;
    setUploadingProof(true);
    try {
      const ext = proofFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${conversationId}/proof-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-photos").upload(path, proofFile, { upsert: false });
      if (upErr) throw upErr;
      const { data: signedData } = await supabase.storage.from("chat-photos").createSignedUrl(path, 60 * 60 * 24 * 90);
      const photoUrl = signedData?.signedUrl ?? "";
      await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, content: `__PROOF__:${photoUrl}` });
      setProofPreview(null);
      setProofFile(null);
    } catch { toast.error("Erreur lors de l'envoi de la preuve"); } finally { setUploadingProof(false); }
  };

  const handleProofRetake = () => {
    setProofPreview(null);
    setProofFile(null);
    setTimeout(() => proofCameraRef.current?.click(), 100);
  };

  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach((msg) => {
    const date = new Date(msg.created_at).toDateString();
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) last.msgs.push(msg); else groupedMessages.push({ date, msgs: [msg] });
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card/95 backdrop-blur-lg border-b border-border/60 px-4 pt-12 pb-3 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/conversations")} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={24} /></button>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><span className="text-sm font-bold text-primary">{otherName.charAt(0)?.toUpperCase() || "?"}</span></div>
          <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground truncate">{otherName}</p>{shipmentRoute && <p className="text-xs text-muted-foreground flex items-center gap-1"><Package size={10} /> {shipmentRoute}</p>}</div>
          {isOtherTyping && <span className="text-xs text-primary animate-pulse shrink-0">{t("chat.typing")}</span>}
        </div>
      </div>

      {shipmentId && (
        <div className={`px-4 py-2.5 flex items-center gap-2.5 text-xs font-medium shrink-0 border-b border-border/40 ${shipmentStatus === "delivered" ? "bg-green-500/10 text-green-700" : shipmentStatus === "in_transit" ? "bg-blue-500/10 text-blue-700" : shipmentStatus === "picked_up" ? "bg-amber-500/10 text-amber-700" : shipmentStatus === "accepted" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {shipmentStatus === "delivered" ? <PackageCheck size={14} /> : shipmentStatus === "in_transit" ? <Truck size={14} /> : shipmentStatus === "picked_up" ? <HandshakeIcon size={14} /> : shipmentStatus === "accepted" ? <CheckCheck size={14} /> : <CircleDot size={14} />}
          <span>{shipmentStatus === "delivered" ? t("chat.delivered") : shipmentStatus === "in_transit" ? t("chat.inTransit") : shipmentStatus === "picked_up" ? t("chat.pickedUp") : shipmentStatus === "accepted" ? t("chat.accepted") : t("chat.waitingTraveler")}</span>
        </div>
      )}

      {itemDetail && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mt-3 bg-card border border-border rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${itemDetail.type === "shipment" ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent"}`}>{itemDetail.type === "shipment" ? <Package size={14} /> : <ShoppingBag size={14} />}</div>
              <span className="text-xs font-bold text-foreground">{itemDetail.type === "shipment" ? t("chat.recapColis") : t("chat.recapMission")}</span>
            </div>
          </div>
          {itemDetail.type === "shipment" ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin size={11} /><span>{itemDetail.departure_city ? localizeCity(itemDetail.departure_city) : "—"} → {localizeCity(itemDetail.arrival_city)}</span></div>
              <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar size={11} /><span>{new Date(itemDetail.departure_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span></div>
              <div className="flex items-center gap-1.5 text-muted-foreground"><Ruler size={11} /><span>{t("chat.size")} : {itemDetail.size === "S" ? t("chat.small") : itemDetail.size === "M" ? t("chat.medium") : itemDetail.size === "L" ? t("chat.large") : itemDetail.size === "XL" ? t("chat.extraLarge") : itemDetail.size}</span></div>
              <div className="flex items-center gap-1.5 text-muted-foreground"><DollarSign size={11} /><span>{isNaN(Number(itemDetail.tarif)) ? "Standard" : `${itemDetail.tarif} ${getCurrencySymbol()}`}</span></div>
              <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground"><Package size={11} /><span>{itemDetail.departure_method === "main" ? t("chat.handDelivery") : itemDetail.departure_method === "relay" ? t("chat.relayPoint") : itemDetail.departure_method === "address" ? t("chat.atHome") : itemDetail.departure_method}{itemDetail.insured ? ` • ${t("chat.insured")}` : ""}{itemDetail.insured && <ShieldCheck size={10} className="inline ml-0.5 text-emerald-400" />}</span></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="col-span-2 flex items-center gap-1.5 text-foreground font-medium"><ShoppingBag size={11} /><span>{itemDetail.is_unlisted ? (itemDetail.unlisted_description || t("chat.unlistedProduct")) : (itemDetail.product_name || itemDetail.category_path?.join(" > "))}</span></div>
              <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin size={11} /><span>{itemDetail.city ? `${localizeCity(itemDetail.city)}, ` : ""}{localizeCountry(itemDetail.country)}</span></div>
              {itemDetail.prix_max && <div className="flex items-center gap-1.5 text-muted-foreground"><DollarSign size={11} /><span>Max {itemDetail.prix_max} {getCurrencySymbol()}</span></div>}
              <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar size={11} /><span>{itemDetail.timing === "asap" ? t("chat.asap") : itemDetail.timing}</span></div>
            </div>
          )}
        </motion.div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && <div className="text-center py-12"><p className="text-sm text-muted-foreground">{t("chat.startConversation")}</p></div>}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-3"><div className="flex-1 h-px bg-border" /><span className="text-xs font-medium text-muted-foreground">{formatDateSeparator(group.msgs[0].created_at)}</span><div className="flex-1 h-px bg-border" /></div>
            {group.msgs.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              const isImg = isImageUrl(msg.content);
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }} className={`flex mb-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl ${isImg ? "p-1" : "px-3.5 py-2.5"} ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                    {isImg ? (
                      <div className="relative">
                        {isProofImage(msg.content) && (
                          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-[#30D158] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                            <Receipt size={10} /> Preuve d'achat
                          </div>
                        )}
                        <img src={getImageUrl(msg.content)} alt="Photo" className="max-w-[220px] max-h-[280px] rounded-xl object-cover cursor-pointer" onClick={() => setPreviewPhoto(getImageUrl(msg.content))} />
                        <div className={`absolute bottom-1 right-2 flex items-center gap-0.5`}><span className="text-[9px] text-white/80 drop-shadow">{formatTime(msg.created_at)}</span>{isMine && <CheckCheck size={12} className={msg.is_read ? "text-blue-300 drop-shadow" : "text-white/60 drop-shadow"} />}</div>
                      </div>
                    ) : (() => {
                      const { text, linkId } = parseMessageWithLink(msg.content);
                      return (
                        <>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
                          {linkId && (
                            <button
                              onClick={() => navigate(`/needit/${linkId}`)}
                              className={`mt-2 w-full text-xs font-semibold py-2 rounded-xl transition-colors ${isMine ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
                            >
                              → Voir les détails de la mission
                            </button>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <p className={`text-[9px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatTime(msg.created_at)}</p>
                            {isMine && <CheckCheck size={12} className={msg.is_read ? "text-blue-300" : "text-primary-foreground/40"} />}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
        <AnimatePresence>{isOtherTyping && (<motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="flex justify-start"><div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-1.5"><span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" /><span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" /><span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" /></div></motion.div>)}</AnimatePresence>
      </div>

      {/* Proof upload banner for voyageur on NeedIt missions */}
      {isMissionChat && isVoyageur && shipmentStatus === "accepted" && !proofSent && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-2 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl p-3.5"
        >
          {proofPreview ? (
            <>
              <p className="text-xs font-bold text-foreground mb-2">Aperçu de la preuve</p>
              <div className="relative rounded-xl overflow-hidden mb-3">
                <img src={proofPreview} alt="Aperçu preuve" className="w-full max-h-[240px] object-cover rounded-xl" />
                <button
                  onClick={() => { setProofPreview(null); setProofFile(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleProofRetake}
                  disabled={uploadingProof}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-muted-foreground text-xs font-bold active:scale-[0.97] transition-all"
                >
                  <Camera size={14} /> Reprendre
                </button>
                <button
                  onClick={handleProofConfirm}
                  disabled={uploadingProof}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#30D158] text-white text-xs font-bold active:scale-[0.97] transition-all disabled:opacity-50"
                >
                  {uploadingProof ? (
                    <><Loader2 size={14} className="animate-spin" /> Envoi...</>
                  ) : (
                    <><CheckCheck size={14} /> Confirmer</>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/20 flex items-center justify-center shrink-0">
                  <Receipt size={18} className="text-[#F59E0B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground mb-0.5">Preuve d'achat requise</p>
                  <p className="text-[11px] text-muted-foreground">Envoie une photo du produit + ticket de caisse pour débloquer l'étape suivante.</p>
                </div>
              </div>
              <button
                onClick={() => proofCameraRef.current?.click()}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0D84FF] text-white text-xs font-bold active:scale-[0.97] transition-all"
              >
                <Camera size={14} /> Envoyer preuve (photo)
              </button>
            </>
          )}
        </motion.div>
      )}

      {/* Proof sent confirmation */}
      {isMissionChat && isVoyageur && shipmentStatus === "accepted" && proofSent && (
        <div className="mx-4 mb-2 bg-[#30D158]/10 border border-[#30D158]/30 rounded-2xl px-4 py-2.5 flex items-center gap-2">
          <CheckCheck size={14} className="text-[#30D158]" />
          <span className="text-xs font-semibold text-[#30D158]">Preuve envoyée ✓</span>
        </div>
      )}

      {/* Hidden camera input for proof */}
      <input
        ref={proofCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleProofCapture}
      />

      <div className="px-4 pb-1 shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {(() => {
            const quickReplies: { icon: React.ReactNode; label: string; message: string }[] = [];
            if (isVoyageur) {
              if (shipmentStatus === "accepted" || shipmentStatus === "pending") quickReplies.push({ icon: <HandshakeIcon size={12} />, label: t("chat.parcelPickedUp"), message: "J'ai récupéré le colis !" }, { icon: <MapPinned size={12} />, label: t("chat.meetingPoint"), message: "Voici le point de rendez-vous : " });
              if (shipmentStatus === "picked_up") quickReplies.push({ icon: <Truck size={12} />, label: t("chat.inTransit"), message: "Le colis est en transit" }, { icon: <Camera size={12} />, label: "Photo colis", message: "Voici une photo du colis" });
              if (shipmentStatus === "in_transit") quickReplies.push({ icon: <PackageCheck size={12} />, label: "Colis remis", message: "Le colis a été remis au destinataire" }, { icon: <Navigation size={12} />, label: "Lieu de remise", message: "Je suis arrivé au lieu de remise" });
            } else {
              if (shipmentStatus === "pending") quickReplies.push({ icon: <CalendarDays size={12} />, label: "Dispo quand ?", message: "Quand êtes-vous disponible pour récupérer ?" });
              if (shipmentStatus === "accepted" || shipmentStatus === "picked_up") quickReplies.push({ icon: <MapPinned size={12} />, label: "Où en est-on ?", message: "Où en est le colis ?" });
              if (shipmentStatus === "in_transit") quickReplies.push({ icon: <Clock size={12} />, label: "ETA ?", message: "Heure d'arrivée estimée ?" });
            }
            quickReplies.push({ icon: <ThumbsUp size={12} />, label: "OK", message: "OK parfait, merci !" }, { icon: <Camera size={12} />, label: t("chat.sendPhoto"), message: "" }, { icon: <Phone size={12} />, label: t("chat.callQuestion"), message: "On peut s'appeler pour coordonner ?" });
            return quickReplies.map((qr) => (<button key={qr.label} onClick={() => { if (qr.label === t("chat.sendPhoto")) fileRef.current?.click(); else setNewMessage(qr.message); }} className="shrink-0 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 active:scale-95 transition-all whitespace-nowrap flex items-center gap-1">{qr.icon}<span>{qr.label}</span></button>));
          })()}
        </div>
      </div>

      <div className="bg-card/95 backdrop-blur-lg border-t border-border/60 px-4 py-3 pb-safe shrink-0">
        <div className="flex items-end gap-2 max-w-lg mx-auto">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => fileRef.current?.click()} disabled={uploadingPhoto} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50">{uploadingPhoto ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <ImageIcon size={18} />}</motion.button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handlePhotoUpload(file); e.target.value = ""; }} />
          <div className="flex-1 bg-muted rounded-2xl px-4 py-2.5"><textarea value={newMessage} onChange={(e) => handleInputChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={t("chat.writeMessage")} rows={1} className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-24" /></div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={!newMessage.trim() || sending} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"><SendIcon size={18} className="text-primary-foreground" /></motion.button>
        </div>
      </div>

      <AnimatePresence>{previewPhoto && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewPhoto(null)}><button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setPreviewPhoto(null)}><X size={28} /></button><img src={previewPhoto} alt="Aperçu" className="max-w-full max-h-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} /></motion.div>)}</AnimatePresence>
    </div>
  );
};

export default ChatPage;
