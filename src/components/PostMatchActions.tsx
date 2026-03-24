import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HandshakeIcon,
  Key,
  Copy,
  CheckCircle,
  Truck,
  PackageCheck,
  Loader2,
  Navigation,
  Bell,
  Shield,
  Timer,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { successFeedback } from "@/lib/successFeedback";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import LiveLocationSharing from "@/components/LiveLocationSharing";
import RatingDialog from "@/components/RatingDialog";

interface PostMatchActionsProps {
  shipmentId: string;
  shipmentStatus: string;
  senderId: string; // expéditeur
  voyageurId: string | null;
  onStatusChange?: (newStatus: string) => void;
  compact?: boolean; // for ChatPage embedding
  itemType?: "shipment" | "needit"; // defaults to shipment
}

// OTP expiration in milliseconds (30 minutes)
const OTP_EXPIRY_MS = 30 * 60 * 1000;

// Generate a random 6-char OTP
const generateOtp = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

// Step config
const STEPS = [
  { status: "accepted", label: "postmatch.stepAccepted", icon: HandshakeIcon },
  { status: "picked_up", label: "postmatch.stepPickedUp", icon: Truck },
  { status: "in_transit", label: "postmatch.stepInTransit", icon: Navigation },
  { status: "delivered", label: "postmatch.stepDelivered", icon: PackageCheck },
];

const PostMatchActions = ({
  shipmentId,
  shipmentStatus,
  senderId,
  voyageurId,
  onStatusChange,
  compact = false,
  itemType = "shipment",
}: PostMatchActionsProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const tableName = itemType === "needit" ? "needit_missions" : "shipments";
  const [pickupOtp, setPickupOtp] = useState<string | null>(null);
  const [deliveryOtp, setDeliveryOtp] = useState<string | null>(null);
  const [pickupOtpCreatedAt, setPickupOtpCreatedAt] = useState<number | null>(null);
  const [deliveryOtpCreatedAt, setDeliveryOtpCreatedAt] = useState<number | null>(null);
  const [enteredCode, setEnteredCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [otpLoading, setOtpLoading] = useState(true);
  const [pickupTimeLeft, setPickupTimeLeft] = useState<number | null>(null);
  const [deliveryTimeLeft, setDeliveryTimeLeft] = useState<number | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  const isSender = user?.id === senderId;
  const isVoyageur = user?.id === voyageurId;

  const parseOtpCodes = (raw: string | null) => {
    try {
      const codes = JSON.parse(raw || "{}");
      setPickupOtp(codes.pickup || null);
      setDeliveryOtp(codes.delivery || null);
      setPickupOtpCreatedAt(codes.pickupCreatedAt || null);
      setDeliveryOtpCreatedAt(codes.deliveryCreatedAt || null);
    } catch {
      setPickupOtp(raw || null);
      setDeliveryOtp(null);
      setPickupOtpCreatedAt(null);
      setDeliveryOtpCreatedAt(null);
    }
  };

  // Load existing OTPs
  const loadOtps = useCallback(async () => {
    setOtpLoading(true);
    const { data } = await supabase
      .from(tableName as any)
      .select("confirmation_code, status")
      .eq("id", shipmentId)
      .maybeSingle();
    if (data) {
      parseOtpCodes((data as any).confirmation_code);
    }
    setOtpLoading(false);
  }, [shipmentId, tableName]);

  useEffect(() => {
    loadOtps();
  }, [loadOtps, shipmentStatus]);

  // Subscribe to realtime shipment changes
  useEffect(() => {
    const channel = supabase
      .channel(`postmatch-${shipmentId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: tableName,
        filter: `id=eq.${shipmentId}`,
      }, (payload: any) => {
        const row = payload.new;
        if (row.status !== shipmentStatus) {
          onStatusChange?.(row.status);
        }
        parseOtpCodes(row.confirmation_code);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [shipmentId, shipmentStatus, onStatusChange]);

  // Timer countdown for OTP expiration
  useEffect(() => {
    const interval = setInterval(() => {
      if (pickupOtpCreatedAt) {
        const remaining = OTP_EXPIRY_MS - (Date.now() - pickupOtpCreatedAt);
        if (remaining <= 0) {
          setPickupTimeLeft(0);
          // Auto-expire: clear pickup OTP
          if (pickupOtp) {
            setPickupOtp(null);
            setPickupOtpCreatedAt(null);
            saveOtpCodes(null, deliveryOtp, null, deliveryOtpCreatedAt);
          }
        } else {
          setPickupTimeLeft(remaining);
        }
      } else {
        setPickupTimeLeft(null);
      }
      if (deliveryOtpCreatedAt) {
        const remaining = OTP_EXPIRY_MS - (Date.now() - deliveryOtpCreatedAt);
        if (remaining <= 0) {
          setDeliveryTimeLeft(0);
          if (deliveryOtp) {
            setDeliveryOtp(null);
            setDeliveryOtpCreatedAt(null);
            saveOtpCodes(pickupOtp, null, pickupOtpCreatedAt, null);
          }
        } else {
          setDeliveryTimeLeft(remaining);
        }
      } else {
        setDeliveryTimeLeft(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pickupOtpCreatedAt, deliveryOtpCreatedAt, pickupOtp, deliveryOtp]);

  // Check if current user already rated this shipment
  useEffect(() => {
    if (!user || shipmentStatus !== "delivered") return;
    if (!isSender && !isVoyageur) return;
    supabase
      .from("ratings")
      .select("id")
      .eq("shipment_id", shipmentId)
      .eq("rater_id", user.id)
      .then(({ data }) => {
        if (data && data.length > 0) setHasRated(true);
      });
  }, [user, isSender, isVoyageur, shipmentStatus, shipmentId]);

  const saveOtpCodes = async (
    pickup: string | null,
    delivery: string | null,
    pickupTs?: number | null,
    deliveryTs?: number | null
  ) => {
    const codes = JSON.stringify({
      pickup,
      delivery,
      pickupCreatedAt: pickupTs !== undefined ? pickupTs : pickupOtpCreatedAt,
      deliveryCreatedAt: deliveryTs !== undefined ? deliveryTs : deliveryOtpCreatedAt,
    });
    await supabase
      .from(tableName as any)
      .update({ confirmation_code: codes } as any)
      .eq("id", shipmentId);
  };

  const sendNotification = async (targetUserId: string, title: string, message: string, type: string) => {
    await supabase.from("notifications").insert({
      user_id: targetUserId,
      title,
      message,
      type: `${type}:${shipmentId}`,
    });
  };

  const addTrackingEvent = async (status: string, label: string, description?: string) => {
    await supabase.from("tracking_events").insert({
      shipment_id: shipmentId,
      status,
      label,
      description: description || null,
    });
  };

  // ─── STEP 1: Expéditeur generates pickup OTP ───
  const handleGeneratePickupOtp = async () => {
    setLoading(true);
    try {
      const otp = generateOtp();
      const now = Date.now();
      await saveOtpCodes(otp, deliveryOtp, now, deliveryOtpCreatedAt);
      setPickupOtp(otp);
      setPickupOtpCreatedAt(now);

      // Notify voyageur
      if (voyageurId) {
        await sendNotification(
          voyageurId,
          t("postmatch.notifPickupReady"),
          t("postmatch.notifPickupReadyDesc"),
          "pickup_ready"
        );
      }

      await addTrackingEvent("accepted", t("postmatch.trackPickupReady"), t("postmatch.trackPickupReadyDesc"));
      toast.success(t("postmatch.otpGenerated"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 2: Voyageur confirms pickup with OTP ───
  const handleConfirmPickup = async () => {
    // Check expiration
    if (pickupOtpCreatedAt && Date.now() - pickupOtpCreatedAt > OTP_EXPIRY_MS) {
      toast.error(t("postmatch.codeExpired") || "Code expiré. Demandez un nouveau code au demandeur.");
      return;
    }
    if (enteredCode.toUpperCase() !== pickupOtp?.toUpperCase()) {
      toast.error(t("postmatch.wrongCode"));
      return;
    }
    setLoading(true);
    try {
      await supabase.from(tableName as any).update({ status: "picked_up" } as any).eq("id", shipmentId);
      await addTrackingEvent("picked_up", t("postmatch.trackPickedUp"), t("postmatch.trackPickedUpDesc"));
      
      // Notify sender (in-app)
      await sendNotification(senderId, t("postmatch.notifPickedUp"), t("postmatch.notifPickedUpDesc"), "picked_up");

      // Send push notification to sender via edge function
      try {
        await supabase.functions.invoke("notify-status-change", {
          body: {
            shipment_id: shipmentId,
            item_type: itemType === "needit" ? "needit_mission" : "shipment",
            new_status: "picked_up",
          },
        });
      } catch (pushErr) {
        console.warn("Push notification failed:", pushErr);
      }
      
      setEnteredCode("");
      onStatusChange?.("picked_up");
      successFeedback(t("postmatch.pickupConfirmed"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 3: Voyageur generates delivery OTP ───
  const handleGenerateDeliveryOtp = async () => {
    setLoading(true);
    try {
      const otp = generateOtp();
      const now = Date.now();
      await saveOtpCodes(pickupOtp, otp, pickupOtpCreatedAt, now);
      setDeliveryOtp(otp);
      setDeliveryOtpCreatedAt(now);

      // Update status to in_transit
      await supabase.from(tableName as any).update({ status: "in_transit" } as any).eq("id", shipmentId);
      await addTrackingEvent("in_transit", t("postmatch.trackInTransit"), t("postmatch.trackInTransitDesc"));

      // Notify sender
      await sendNotification(senderId, t("postmatch.notifInTransit"), t("postmatch.notifInTransitDesc"), "in_transit");

      onStatusChange?.("in_transit");
      toast.success(t("postmatch.otpGenerated"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 4: Confirm delivery with OTP ───
  const handleConfirmDelivery = async () => {
    // Check expiration
    if (deliveryOtpCreatedAt && Date.now() - deliveryOtpCreatedAt > OTP_EXPIRY_MS) {
      toast.error(t("postmatch.codeExpired") || "Code expiré. Demandez un nouveau code au voyageur.");
      return;
    }
    if (enteredCode.toUpperCase() !== deliveryOtp?.toUpperCase()) {
      toast.error(t("postmatch.wrongCode"));
      return;
    }
    setLoading(true);
    try {
      await supabase.from(tableName as any).update({ status: itemType === "needit" ? "completed" : "delivered" } as any).eq("id", shipmentId);
      await addTrackingEvent("delivered", t("postmatch.trackDelivered"), t("postmatch.trackDeliveredDesc"));

      // Notify both parties
      if (voyageurId) {
        await sendNotification(voyageurId, t("postmatch.notifDelivered"), t("postmatch.notifDeliveredDesc"), "delivered");
      }
      await sendNotification(senderId, t("postmatch.notifDeliveredSender"), t("postmatch.notifDeliveredSenderDesc"), "delivered");

      setEnteredCode("");
      onStatusChange?.("delivered");
      successFeedback(t("postmatch.deliveryConfirmed"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeLeft = (ms: number | null) => {
    if (ms === null || ms <= 0) return null;
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(t("postmatch.codeCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  if (otpLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={20} className="animate-spin text-primary" />
      </div>
    );
  }

  // Don't show for pending or cancelled/delivered
  if (shipmentStatus === "pending" || shipmentStatus === "cancelled") return null;
  if (!voyageurId) return null;

  // Progress indicator
  const currentStepIdx = STEPS.findIndex((s) => s.status === shipmentStatus);

  return (
    <div className={`space-y-3 ${compact ? "" : "mt-2"}`}>
      {/* Progress steps */}
      {!compact && (
        <div className="flex items-center gap-1 px-1 mb-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === currentStepIdx;
            const isDone = i < currentStepIdx;
            return (
              <div key={step.status} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isDone
                      ? "bg-accent/20 text-accent"
                      : isActive
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <CheckCircle size={14} /> : <Icon size={14} />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded ${isDone ? "bg-accent" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── ACCEPTED: Expéditeur generates pickup OTP ─── */}
      {shipmentStatus === "accepted" && isSender && !pickupOtp && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <HandshakeIcon size={16} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">{t("postmatch.readyToHandover")}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t("postmatch.generatePickupOtpDesc")}</p>
          <Button
            onClick={handleGeneratePickupOtp}
            disabled={loading}
            className="w-full rounded-xl"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin mr-2" /> {t("common.loading")}</>
            ) : (
              <><Key size={14} className="mr-2" /> {t("postmatch.generateCode")}</>
            )}
          </Button>
        </motion.div>
      )}

      {/* ─── ACCEPTED: Expéditeur shows pickup OTP ─── */}
      {shipmentStatus === "accepted" && isSender && pickupOtp && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Key size={16} className="text-amber-600" />
            <h3 className="text-sm font-bold text-foreground">{t("postmatch.pickupCode")}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t("postmatch.sharePickupCode")}</p>
          <div className="flex items-center justify-center gap-3">
            <div className="bg-background border-2 border-amber-300 dark:border-amber-700 rounded-xl px-6 py-3 font-mono text-2xl font-black tracking-[0.3em] text-foreground select-all">
              {pickupOtp}
            </div>
            <button
              onClick={() => handleCopy(pickupOtp)}
              className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center hover:bg-amber-200 transition-colors"
            >
              {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center font-medium flex items-center justify-center gap-1">
            <Shield size={10} /> {t("postmatch.shareOnlyAtHandover")}
          </p>
          {formatTimeLeft(pickupTimeLeft) && (
            <p className="text-[10px] text-center font-medium flex items-center justify-center gap-1 text-muted-foreground">
              <Timer size={10} /> Expire dans {formatTimeLeft(pickupTimeLeft)}
            </p>
          )}
          {pickupTimeLeft !== null && pickupTimeLeft <= 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-center font-medium text-destructive">
                Code expiré
              </p>
              <Button
                onClick={handleGeneratePickupOtp}
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin mr-2" /> {t("common.loading")}</>
                ) : (
                  <><Key size={14} className="mr-2" /> Regénérer le code</>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── ACCEPTED: Voyageur enters pickup OTP ─── */}
      {shipmentStatus === "accepted" && isVoyageur && pickupOtp && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-primary/20 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Key size={16} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">{t("postmatch.confirmPickup")}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t("postmatch.enterPickupCode")}</p>
          <Input
            value={enteredCode}
            onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
            placeholder="Ex: A3F9B2"
            className="text-center font-mono text-lg tracking-[0.2em] uppercase"
            maxLength={6}
          />
          <Button
            onClick={handleConfirmPickup}
            disabled={enteredCode.length < 4 || loading}
            className="w-full rounded-xl"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin mr-2" /> {t("common.loading")}</>
            ) : (
              <><CheckCircle size={14} className="mr-2" /> {t("postmatch.confirmPickupBtn")}</>
            )}
          </Button>
        </motion.div>
      )}

      {/* ─── ACCEPTED: Voyageur waiting for OTP ─── */}
      {shipmentStatus === "accepted" && isVoyageur && !pickupOtp && (
        <div className="bg-muted/50 border border-border rounded-2xl p-4 flex items-center gap-3">
          <Bell size={16} className="text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">{t("postmatch.waitingForSender")}</p>
        </div>
      )}

      {/* ─── PICKED_UP: Voyageur generates delivery OTP ─── */}
      {shipmentStatus === "picked_up" && isVoyageur && !deliveryOtp && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-secondary/5 to-primary/5 border border-secondary/20 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-secondary" />
            <h3 className="text-sm font-bold text-foreground">{t("postmatch.readyToDeliver")}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t("postmatch.generateDeliveryOtpDesc")}</p>
          <Button
            onClick={handleGenerateDeliveryOtp}
            disabled={loading}
            className="w-full rounded-xl"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin mr-2" /> {t("common.loading")}</>
            ) : (
              <><Key size={14} className="mr-2" /> {t("postmatch.generateDeliveryCode")}</>
            )}
          </Button>
        </motion.div>
      )}

      {/* ─── IN_TRANSIT: Voyageur shows delivery OTP ─── */}
      {(shipmentStatus === "picked_up" || shipmentStatus === "in_transit") && isVoyageur && deliveryOtp && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Key size={16} className="text-amber-600" />
            <h3 className="text-sm font-bold text-foreground">{t("postmatch.deliveryCode")}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t("postmatch.shareDeliveryCode")}</p>
          <div className="flex items-center justify-center gap-3">
            <div className="bg-background border-2 border-amber-300 dark:border-amber-700 rounded-xl px-6 py-3 font-mono text-2xl font-black tracking-[0.3em] text-foreground select-all">
              {deliveryOtp}
            </div>
            <button
              onClick={() => handleCopy(deliveryOtp)}
              className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center hover:bg-amber-200 transition-colors"
            >
              {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center font-medium flex items-center justify-center gap-1">
            <Shield size={10} /> {t("postmatch.shareOnlyAtDelivery")}
          </p>
          {formatTimeLeft(deliveryTimeLeft) && (
            <p className="text-[10px] text-center font-medium flex items-center justify-center gap-1 text-muted-foreground">
              <Timer size={10} /> Expire dans {formatTimeLeft(deliveryTimeLeft)}
            </p>
          )}
          {deliveryTimeLeft !== null && deliveryTimeLeft <= 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-center font-medium text-destructive">
                Code expiré
              </p>
              <Button
                onClick={handleGenerateDeliveryOtp}
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin mr-2" /> {t("common.loading")}</>
                ) : (
                  <><Key size={14} className="mr-2" /> Regénérer le code</>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── IN_TRANSIT: Sender/Anyone enters delivery OTP ─── */}
      {shipmentStatus === "in_transit" && !isVoyageur && deliveryOtp && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-primary/20 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <PackageCheck size={16} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">{t("postmatch.confirmDelivery")}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t("postmatch.enterDeliveryCode")}</p>
          <Input
            value={enteredCode}
            onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
            placeholder="Ex: X7K2M9"
            className="text-center font-mono text-lg tracking-[0.2em] uppercase"
            maxLength={6}
          />
          <Button
            onClick={handleConfirmDelivery}
            disabled={enteredCode.length < 4 || loading}
            className="w-full rounded-xl"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin mr-2" /> {t("common.loading")}</>
            ) : (
              <><PackageCheck size={14} className="mr-2" /> {t("postmatch.confirmDeliveryBtn")}</>
            )}
          </Button>
        </motion.div>
      )}

      {/* ─── DELIVERED: Success ─── */}
      {shipmentStatus === "delivered" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-accent/10 border border-accent/30 rounded-2xl p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <CheckCircle size={20} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{t("postmatch.missionComplete")}</p>
            <p className="text-xs text-muted-foreground">
              {isVoyageur ? t("postmatch.missionCompleteDescVoyageur") : t("postmatch.missionCompleteDescDemandeur")}
            </p>
          </div>
        </motion.div>
      )}

      {/* ─── DELIVERED: Rating invitation for demandeur ─── */}
      {shipmentStatus === "delivered" && isSender && !hasRated && voyageurId && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={() => setShowRating(true)}
            variant="outline"
            className="w-full rounded-xl border-accent/30 text-accent hover:bg-accent/10 gap-2"
          >
            <Star size={16} className="fill-accent" />
            {t("postmatch.rateVoyageur")}
          </Button>
        </motion.div>
      )}

      {/* ─── DELIVERED: Rating invitation for voyageur ─── */}
      {shipmentStatus === "delivered" && isVoyageur && !hasRated && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={() => setShowRating(true)}
            variant="outline"
            className="w-full rounded-xl border-accent/30 text-accent hover:bg-accent/10 gap-2"
          >
            <Star size={16} className="fill-accent" />
            {t("postmatch.rateDemandeur")}
          </Button>
        </motion.div>
      )}

      {shipmentStatus === "delivered" && (isSender || isVoyageur) && hasRated && (
        <p className="text-xs text-center text-muted-foreground">✅ {t("postmatch.alreadyRated")}</p>
      )}

      {/* Rating dialog - demandeur rates voyageur */}
      {voyageurId && isSender && (
        <RatingDialog
          open={showRating}
          onClose={() => { setShowRating(false); setHasRated(true); }}
          shipmentId={shipmentId}
          ratedUserId={voyageurId}
          raterRole="demandeur"
        />
      )}

      {/* Rating dialog - voyageur rates demandeur */}
      {isVoyageur && (
        <RatingDialog
          open={showRating}
          onClose={() => { setShowRating(false); setHasRated(true); }}
          shipmentId={shipmentId}
          ratedUserId={senderId}
          raterRole="voyageur"
        />
      )}

      {voyageurId && shipmentStatus !== "delivered" && shipmentStatus !== "cancelled" && !compact && (
        <LiveLocationSharing
          itemId={shipmentId}
          voyageurId={voyageurId}
          isVoyageur={isVoyageur}
        />
      )}
    </div>
  );
};

export default PostMatchActions;
