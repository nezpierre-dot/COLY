import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Plus, X, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";

interface AvailDay {
  id: string;
  available_date: string;
  city: string | null;
  country: string | null;
  note: string | null;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const TransporterPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [availabilities, setAvailabilities] = useState<AvailDay[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAvailabilities = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("voyageur_availability")
      .select("*")
      .eq("user_id", user.id)
      .order("available_date", { ascending: true });
    if (data) setAvailabilities(data as AvailDay[]);
  };

  useEffect(() => { loadAvailabilities(); }, [user]);

  const availSet = useMemo(() => new Set(availabilities.map(a => a.available_date)), [availabilities]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday = 0 in our grid
    let startOffset = (firstDay.getDay() + 6) % 7;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [currentMonth]);

  const formatDateKey = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const toggleDate = async (dateKey: string) => {
    if (!user) return;
    if (dateKey < today) return;

    if (availSet.has(dateKey)) {
      // Remove
      const item = availabilities.find(a => a.available_date === dateKey);
      if (item) {
        await supabase.from("voyageur_availability").delete().eq("id", item.id);
        setAvailabilities(prev => prev.filter(a => a.id !== item.id));
        toast.success("Disponibilité retirée");
      }
    } else {
      setSelectedDate(dateKey);
    }
  };

  const handleAddAvailability = async () => {
    if (!user || !selectedDate) return;
    setSaving(true);
    const { error } = await supabase.from("voyageur_availability").insert({
      user_id: user.id,
      available_date: selectedDate,
      city: city.trim() || null,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Disponibilité ajoutée ✅");
      setSelectedDate(null);
      setCity("");
      await loadAvailabilities();
    }
    setSaving(false);
  };

  const monthLabel = currentMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="page-shell">
      <div className="page-header-soft flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-card border border-border/60 flex items-center justify-center shadow-soft">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Calendar size={20} className="text-primary" /> Je transporte
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Indique tes journées de voyage 🌍</p>
        </div>
      </div>

      <div className="page-content pt-6 space-y-5">
        {/* Calendar */}
        <div className="card-future">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
              <ChevronLeft size={16} className="text-foreground" />
            </button>
            <h2 className="text-sm font-bold text-foreground capitalize">{monthLabel}</h2>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
              <ChevronRight size={16} className="text-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-center text-xs font-semibold text-muted-foreground py-1">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const key = formatDateKey(day);
              const isAvail = availSet.has(key);
              const isPast = key < today;
              const isToday = key === today;

              return (
                <motion.button
                  key={key}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleDate(key)}
                  disabled={isPast}
                  className={`aspect-square rounded-xl text-sm font-semibold transition-all flex items-center justify-center relative ${
                    isAvail
                      ? "bg-primary text-primary-foreground shadow-md"
                      : isPast
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : "text-foreground hover:bg-muted"
                  } ${isToday ? "ring-2 ring-primary/30" : ""}`}
                >
                  {day.getDate()}
                  {isAvail && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Add availability dialog */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card border border-primary/30 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  📅 {new Date(selectedDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </h3>
                <button onClick={() => setSelectedDate(null)} className="text-muted-foreground"><X size={16} /></button>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Ville de départ (optionnel)</label>
                <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Paris, Lyon..." className="rounded-xl" />
              </div>
              <Button onClick={handleAddAvailability} disabled={saving} className="w-full rounded-xl gap-2">
                <Plus size={16} /> {saving ? "Ajout..." : "Marquer disponible"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upcoming availabilities list */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Prochaines disponibilités
          </h3>
          {availabilities.filter(a => a.available_date >= today).length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Aucune disponibilité à venir. Tapez sur un jour du calendrier pour en ajouter.
            </div>
          ) : (
            availabilities.filter(a => a.available_date >= today).map(a => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card border border-border rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(a.available_date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                    {a.city && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin size={10} /> {a.city}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await supabase.from("voyageur_availability").delete().eq("id", a.id);
                    setAvailabilities(prev => prev.filter(x => x.id !== a.id));
                    toast.success("Retiré");
                  }}
                  className="text-muted-foreground hover:text-accent transition-colors"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default TransporterPage;
