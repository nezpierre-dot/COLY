import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Camera,
  ChevronRight,
  Hash,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCurrencyForCountry } from "@/hooks/useLocaleUnits";
import { successFeedback } from "@/lib/successFeedback";
import NeeditPageHeader from "../components/NeeditPageHeader";
import BrandImage from "../components/BrandImage";
import { clearNeeditDraft, useNeeditDraft } from "../hooks/useNeeditDraft";

const LAST_LOCATION_KEY = "nidit:needit:lastLocation";

const readLastLocation = (): { pays?: string; ville?: string; pickupAddress?: string } => {
  try {
    const raw = localStorage.getItem(LAST_LOCATION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeLastLocation = (loc: { pays?: string; ville?: string; pickupAddress?: string }) => {
  try {
    localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(loc));
  } catch {
    /* ignore */
  }
};

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const COMMENTS_MAX = 500;
const PICKUP_MAX = 200;

const buildSchema = (budgetMode: "fixed" | "devis") =>
  z.object({
    pays: z
      .string()
      .trim()
      .min(2, { message: "Indiquez un pays valide (2 caractères min.)." })
      .max(60, { message: "Le pays ne peut pas dépasser 60 caractères." }),
    ville: z
      .string()
      .trim()
      .min(2, { message: "Indiquez une ville valide (2 caractères min.)." })
      .max(80, { message: "La ville ne peut pas dépasser 80 caractères." }),
    quantity: z
      .number({ invalid_type_error: "La quantité doit être un nombre." })
      .int({ message: "La quantité doit être un entier." })
      .min(1, { message: "La quantité doit être d’au moins 1." })
      .max(99, { message: "La quantité ne peut pas dépasser 99." }),
    budget:
      budgetMode === "devis"
        ? z.string().optional()
        : z
            .string()
            .trim()
            .min(1, { message: "Indiquez un budget maximum." })
            .refine((v) => !Number.isNaN(parseFloat(v.replace(",", "."))), {
              message: "Budget invalide. Utilisez un nombre (ex : 25 ou 25,50).",
            })
            .refine((v) => parseFloat(v.replace(",", ".")) > 0, {
              message: "Le budget doit être supérieur à 0.",
            })
            .refine((v) => parseFloat(v.replace(",", ".")) <= 10000, {
              message: "Le budget ne peut pas dépasser 10 000.",
            }),
    comments: z
      .string()
      .max(COMMENTS_MAX, {
        message: `Les commentaires ne peuvent pas dépasser ${COMMENTS_MAX} caractères.`,
      })
      .optional(),
    pickupAddress: z
      .string()
      .max(PICKUP_MAX, {
        message: `L’adresse ne peut pas dépasser ${PICKUP_MAX} caractères.`,
      })
      .optional(),
  });

type FieldErrors = Partial<
  Record<"pays" | "ville" | "quantity" | "budget" | "comments" | "pickupAddress", string>
>;

/**
 * Écran 3/3 — Création de la mission style Vinted.
 * Page unique scrollable avec sticky bottom CTA + récap prix.
 */
const NeeditCreatePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft, reset } = useNeeditDraft();

  const last = useMemo(() => readLastLocation(), []);

  // Sécurité : si on arrive ici sans catégorie/marque dans le draft, retour à la sélection.
  useEffect(() => {
    if (!draft.categoryKey && !draft.categoryLabel && !draft.brand) {
      navigate("/needit/categories", { replace: true });
    }
  }, [draft, navigate]);

  // Form state
  const [pays, setPays] = useState(draft.pays ?? last.pays ?? "France");
  const [ville, setVille] = useState(draft.ville ?? last.ville ?? "");
  const [quantity, setQuantity] = useState(String(draft.quantity ?? 1));
  const [variant, setVariant] = useState<string | null>(draft.variant ?? null);
  const [budget, setBudget] = useState(draft.budget ?? "");
  const [budgetMode, setBudgetMode] = useState<"fixed" | "devis">(
    draft.budget === "__devis__" ? "devis" : "fixed",
  );
  const [comments, setComments] = useState(draft.comments ?? "");
  const [pickupAddress, setPickupAddress] = useState(draft.pickupAddress ?? last.pickupAddress ?? "");
  const [autoAccept, setAutoAccept] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    draft.brandProduct?.photo_url ?? null,
  );
  const [submitting, setSubmitting] = useState(false);

  const currency = getCurrencyForCountry(pays);

  const productName =
    draft.brandProduct?.name ?? draft.categoryLabel ?? "Produit";

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const qtyNum = Math.max(1, parseInt(quantity || "1", 10) || 1);
  const budgetNum = budgetMode === "fixed" ? parseFloat(budget.replace(",", ".")) : NaN;
  const totalEstimate = !Number.isNaN(budgetNum) ? budgetNum * qtyNum : null;

  const canSubmit =
    !!pays.trim() &&
    !!ville.trim() &&
    (budgetMode === "devis" || (!Number.isNaN(budgetNum) && budgetNum > 0));

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Vous devez être connecté.");
      return;
    }
    if (!pays.trim() || !ville.trim()) {
      toast.error("Indiquez le pays et la ville de récupération.");
      return;
    }
    if (budgetMode === "fixed" && (!budget.trim() || Number.isNaN(budgetNum) || budgetNum <= 0)) {
      toast.error("Indiquez un budget maximum valide.");
      return;
    }

    setSubmitting(true);
    try {
      // Upload photo if any (otherwise use brand product photo url)
      let photo_url: string | null = draft.brandProduct?.photo_url ?? null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("shipment-photos")
          .upload(path, photoFile);
        if (!uploadErr) {
          const { data } = await supabase.storage
            .from("shipment-photos")
            .createSignedUrl(path, 60 * 60 * 24 * 90);
          photo_url = data?.signedUrl ?? null;
        }
      }

      // Build category_path: Category > Brand > Product
      const pathLabels: string[] = [];
      if (draft.categoryLabel) pathLabels.push(draft.categoryLabel);
      if (draft.brand?.name) pathLabels.push(draft.brand.name);
      if (draft.brandProduct?.name) pathLabels.push(draft.brandProduct.name);

      // Compose product name with brand + variant
      const baseName = [draft.brand?.name, draft.brandProduct?.name ?? draft.categoryLabel ?? "Produit"]
        .filter(Boolean)
        .join(" ");
      const variantSuffix = variant ? ` – ${variant}` : "";
      const finalProductName =
        qtyNum > 1 ? `${qtyNum}× ${baseName}${variantSuffix}` : `${baseName}${variantSuffix}`;

      const finalPrixMax = budgetMode === "devis" ? "Sur devis" : budget;

      const mergedDescription = comments.trim() ? `Commentaires : ${comments.trim()}` : null;

      const { data: inserted, error } = await supabase
        .from("needit_missions")
        .insert({
          user_id: user.id,
          country: pays,
          city: ville || null,
          timing: "asap",
          category_path: pathLabels.length > 0 ? pathLabels : undefined,
          product_name: finalProductName,
          is_unlisted: false,
          unlisted_description: mergedDescription,
          photo_url,
          prix_max: finalPrixMax,
          auto_accept: autoAccept,
          pickup_address: pickupAddress || null,
        } as never)
        .select("id")
        .single();

      if (error) throw error;

      // Save last location for next time
      writeLastLocation({ pays, ville, pickupAddress });

      // Notify matching travellers in background
      if (inserted) {
        supabase.functions
          .invoke("notify-match", { body: { type: "mission", record_id: inserted.id } })
          .catch(() => {});
      }

      successFeedback("Mission publiée !", {
        description: "Les voyageurs disponibles ont été prévenus.",
      });
      reset();
      clearNeeditDraft();
      navigate("/mes-missions-needit");
    } catch (err) {
      toast.error("Impossible de publier la mission. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NeeditPageHeader
        title="Créer ma mission"
        subtitle={productName}
        onBack={() => navigate(-1)}
      />

      <main className="flex-1 px-4 sm:px-5 pt-4 pb-40 max-w-2xl mx-auto w-full">
        {/* Hero photo + product info */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm mb-6">
          <div className="relative mx-auto mb-4 aspect-square max-w-[260px] rounded-3xl bg-gradient-to-b from-muted/40 to-muted/10 overflow-hidden flex items-center justify-center">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt={productName}
                className="w-full h-full object-contain p-4"
              />
            ) : draft.brand?.logo_url ? (
              <BrandImage
                src={draft.brand.logo_url}
                alt={draft.brand.name}
                kind="logo"
                className="w-3/4 h-3/4 rounded-2xl"
                imgClassName="object-contain"
                fallback={<Package size={48} className="text-muted-foreground/50" />}
                showNoPhotoBadge={false}
              />
            ) : (
              <Package size={56} className="text-muted-foreground/40" />
            )}
            <label className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm text-xs font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors">
              <Camera size={12} /> {photoPreview ? "Changer" : "Photo"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          </div>

          {draft.brand && (
            <p className="text-center text-xs font-bold text-primary uppercase tracking-wider mb-1">
              {draft.brand.name}
            </p>
          )}
          <h2 className="text-center text-2xl font-extrabold text-foreground leading-tight mb-2 tracking-tight">
            {draft.brandProduct?.name ?? draft.categoryLabel ?? "Produit"}
          </h2>

          {/* Variant chips */}
          {draft.brandProduct && draft.brandProduct.variants.length > 0 && (
            <>
              <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3 mb-2">
                Volume / Référence
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {draft.brandProduct.variants.map((v) => {
                  const isActive = variant === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setVariant(v)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow"
                          : "bg-muted text-foreground hover:bg-muted/70"
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {draft.brandProduct?.indicative_price && (
            <p className="text-center text-sm text-muted-foreground mt-3">
              Prix indicatif&nbsp;:{" "}
              <span className="font-semibold text-foreground">
                {draft.brandProduct.indicative_price}
              </span>
            </p>
          )}
        </section>

        {/* Ma demande */}
        <SectionTitle>Ma demande</SectionTitle>
        <div className="space-y-4 mb-8">
          {/* Quantity */}
          <Field
            label="Quantité souhaitée"
            icon={<Hash size={14} className="text-primary" />}
          >
            <div className="inline-flex items-center rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setQuantity((q) => String(Math.max(1, parseInt(q || "1") - 1)))}
                className="w-12 h-12 flex items-center justify-center text-foreground hover:bg-muted transition-colors text-lg font-bold"
                aria-label="Diminuer"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, "") || "1")}
                className="w-16 h-12 text-center bg-transparent text-base font-semibold text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Quantité"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => String(parseInt(q || "1") + 1))}
                className="w-12 h-12 flex items-center justify-center text-foreground hover:bg-muted transition-colors text-lg font-bold"
                aria-label="Augmenter"
              >
                +
              </button>
            </div>
          </Field>

          {/* Budget */}
          <Field
            label={
              <span className="flex items-center gap-1.5">
                Budget maximum <span className="text-destructive">*</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={12} className="text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px] text-xs">
                      Vous ne paierez jamais plus que ce montant. Le voyageur peut proposer moins.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
            }
          >
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBudgetMode("fixed")}
                  className={`px-3 py-3 rounded-2xl text-sm font-semibold transition-all border ${
                    budgetMode === "fixed"
                      ? "bg-primary text-primary-foreground border-primary shadow"
                      : "bg-card text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  Tarif fixe
                </button>
                <button
                  onClick={() => setBudgetMode("devis")}
                  className={`px-3 py-3 rounded-2xl text-sm font-semibold transition-all border ${
                    budgetMode === "devis"
                      ? "bg-primary text-primary-foreground border-primary shadow"
                      : "bg-card text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  Sur devis
                </button>
              </div>
              {budgetMode === "fixed" && (
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="h-14 text-2xl font-bold text-foreground bg-card rounded-2xl border-border pr-14 pl-5 focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                    {currency.symbol}
                  </span>
                </div>
              )}
            </div>
          </Field>

          {/* Comments */}
          <Field
            label="Commentaires / Instructions"
            icon={<MessageSquare size={14} className="text-primary" />}
          >
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Ex : emballage renforcé, livraison en main propre, alternative si rupture…"
              rows={4}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none transition-colors"
            />
          </Field>
        </div>

        {/* Localisation */}
        <SectionTitle>Lieu de récupération</SectionTitle>
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pays *">
              <Input
                value={pays}
                onChange={(e) => setPays(e.target.value)}
                placeholder="Ex : France"
                className="h-12 rounded-2xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </Field>
            <Field label="Ville *">
              <Input
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                placeholder="Ex : Paris"
                className="h-12 rounded-2xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </Field>
          </div>

          <Field
            label="Adresse précise (optionnel)"
            icon={<MapPin size={14} className="text-primary" />}
          >
            <Input
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Ex : Carrefour Champs-Élysées"
              className="h-12 rounded-2xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </Field>
        </div>

        {/* Auto-accept */}
        <div className="flex items-center justify-between rounded-2xl bg-muted/40 border border-border p-4 mb-4">
          <div className="flex-1 mr-3">
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Sparkles size={14} className="text-accent" /> Acceptation automatique
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Le premier voyageur qualifié sera assigné sans validation.
            </p>
          </div>
          <Switch checked={autoAccept} onCheckedChange={setAutoAccept} />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-6">
          Vous serez débité uniquement à la livraison. Aucun engagement avant qu'un voyageur
          accepte votre mission.
        </p>
      </main>

      {/* Sticky bottom CTA with recap */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-3">
          {/* Recap row */}
          <div className="flex items-center justify-between mb-2.5 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-semibold text-foreground">{qtyNum}</span>
              <X size={12} className="opacity-60" />
              <span>
                {budgetMode === "devis"
                  ? "Sur devis"
                  : !Number.isNaN(budgetNum) && budgetNum > 0
                  ? `${budgetNum.toFixed(2)} ${currency.symbol}`
                  : "—"}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground leading-none mb-0.5">
                Total estimé
              </p>
              <p className="text-base font-extrabold text-foreground tabular-nums leading-none">
                {totalEstimate !== null
                  ? `${totalEstimate.toFixed(2)} ${currency.symbol}`
                  : budgetMode === "devis"
                  ? "Sur devis"
                  : "—"}
              </p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-base font-extrabold shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Publier ma mission <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </motion.div>

      <BottomNav />
    </div>
  );
};

/* ------------------------------------------------------------------ */

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-bold text-foreground/80 uppercase tracking-wider mb-3 px-1">
    {children}
  </h3>
);

const Field = ({
  label,
  icon,
  children,
}: {
  label: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
      {icon}
      {label}
    </label>
    {children}
  </div>
);

export default NeeditCreatePage;
