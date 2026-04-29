import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  Package,
  Plane,
  MessageCircle,
  Bell,
  Wallet,
  Settings as SettingsIcon,
  User,
  Search,
  ShoppingBag,
  Heart,
  Trophy,
  Map,
  HelpCircle,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";

type Hit = {
  id: string;
  label: string;
  sublabel?: string;
  to: string;
  type: "shipment" | "voyage" | "contact" | "mission";
};

const usePaletteShortcut = (open: boolean, setOpen: (v: boolean) => void) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);
};

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  usePaletteShortcut(open, setOpen);

  // Pages — always available
  const pages = useMemo(
    () => [
      { icon: Home, label: t("nav.home") || "Accueil", to: "/dashboard" },
      { icon: Package, label: t("dashboard.myShipments") || "Mes envois", to: "/history/shipments" },
      { icon: Plane, label: t("dashboard.myVoyages") || "Mes voyages", to: "/history/voyages" },
      { icon: ShoppingBag, label: "NeedIt", to: "/needit/categories" },
      { icon: MessageCircle, label: t("nav.messages") || "Messages", to: "/conversations" },
      { icon: Bell, label: "Notifications", to: "/notifications" },
      { icon: Wallet, label: "Solde / Wallet", to: "/solde" },
      { icon: Map, label: "Tracking", to: "/dashboard" },
      { icon: Heart, label: "Favoris", to: "/favorites" },
      { icon: Trophy, label: "Classement", to: "/leaderboard" },
      { icon: User, label: "Mon compte", to: "/my-account" },
      { icon: SettingsIcon, label: "Paramètres", to: "/settings" },
      { icon: Shield, label: "Litiges", to: "/litiges" },
      { icon: HelpCircle, label: "Aide", to: "/aide" },
    ],
    [t]
  );

  // Live search across shipments / voyages / contacts
  useEffect(() => {
    if (!open || !user) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const like = `%${q}%`;
        const [ships, trips, missions, profiles] = await Promise.all([
          supabase
            .from("shipments")
            .select("id, departure_city, arrival_city, status")
            .or(
              `departure_city.ilike.${like},arrival_city.ilike.${like},description.ilike.${like}`
            )
            .limit(5),
          supabase
            .from("voyages")
            .select("id, departure_city, arrival_city, departure_date")
            .or(`departure_city.ilike.${like},arrival_city.ilike.${like}`)
            .limit(5),
          supabase
            .from("needit_missions")
            .select("id, produit, city, country")
            .or(`produit.ilike.${like},city.ilike.${like}`)
            .limit(5),
          supabase
            .from("profiles_public" as any)
            .select("user_id, full_name")
            .ilike("full_name", like)
            .limit(5),
        ]);

        if (cancelled) return;
        const out: Hit[] = [];
        ships.data?.forEach((s: any) =>
          out.push({
            id: s.id,
            type: "shipment",
            label: `${s.departure_city} → ${s.arrival_city}`,
            sublabel: `Envoi · ${s.status}`,
            to: `/shipment/${s.id}`,
          })
        );
        trips.data?.forEach((v: any) =>
          out.push({
            id: v.id,
            type: "voyage",
            label: `${v.departure_city} → ${v.arrival_city}`,
            sublabel: `Voyage · ${v.departure_date}`,
            to: `/voyage/${v.id}`,
          })
        );
        missions.data?.forEach((m: any) =>
          out.push({
            id: m.id,
            type: "mission",
            label: m.produit || "Mission",
            sublabel: `NeedIt · ${m.city || m.country || ""}`,
            to: `/mission/${m.id}`,
          })
        );
        profiles.data?.forEach((p: any) =>
          out.push({
            id: p.id,
            type: "contact",
            label: p.full_name || "Utilisateur",
            sublabel: "Contact",
            to: `/profile/${p.id}`,
          })
        );
        setHits(out);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, user]);

  const go = (to: string) => {
    setOpen(false);
    setQuery("");
    navigate(to);
  };

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => p.label.toLowerCase().includes(q));
  }, [pages, query]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Rechercher envois, voyages, contacts, pages…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Recherche…" : "Aucun résultat."}
        </CommandEmpty>

        {hits.length > 0 && (
          <>
            <CommandGroup heading="Résultats">
              {hits.map((h) => (
                <CommandItem
                  key={`${h.type}-${h.id}`}
                  value={`${h.type}-${h.label}-${h.id}`}
                  onSelect={() => go(h.to)}
                >
                  <Search size={14} className="mr-2 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm">{h.label}</span>
                    {h.sublabel && (
                      <span className="text-xs text-muted-foreground">{h.sublabel}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Pages">
          {filteredPages.map((p) => {
            const Icon = p.icon;
            return (
              <CommandItem
                key={p.to + p.label}
                value={`page-${p.label}`}
                onSelect={() => go(p.to)}
              >
                <Icon size={14} className="mr-2 text-muted-foreground" />
                <span className="text-sm">{p.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
