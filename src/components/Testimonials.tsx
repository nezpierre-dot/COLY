import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

interface Testimonial {
  name: string;
  initials: string;
  role: string;
  city: string;
  rating: number;
  text: string;
  accent: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Aïssatou D.",
    initials: "AD",
    role: "Expéditrice",
    city: "Paris → Dakar",
    rating: 5,
    text: "J'ai envoyé un cadeau d'anniversaire à ma mère en moins de 4 jours. Le voyageur était adorable et j'ai pu suivre le colis en temps réel. Bien mieux que la poste !",
    accent: "from-primary/20 to-primary/5",
  },
  {
    name: "Karim B.",
    initials: "KB",
    role: "Voyageur Nidit",
    city: "Lyon → Casablanca",
    rating: 5,
    text: "Je voyage tous les mois pour le boulot. Avec Nidit je rentabilise mes 10 kg de bagages libres et je rends service. Le paiement séquestre rassure tout le monde.",
    accent: "from-success/20 to-success/5",
  },
  {
    name: "Sophie M.",
    initials: "SM",
    role: "Expéditrice",
    city: "Bordeaux → Abidjan",
    rating: 5,
    text: "Première utilisation, j'avais des doutes. Mais la vérification d'identité, les avis publics et l'OTP de remise m'ont mise en confiance. Adoptée à vie !",
    accent: "from-amber-500/20 to-amber-500/5",
  },
  {
    name: "Mohamed T.",
    initials: "MT",
    role: "Voyageur Nidit",
    city: "Marseille → Tunis",
    rating: 5,
    text: "L'app est ultra fluide, le chat sécurisé est top, et le paiement arrive bien sous 48h après livraison. Plus de 30 colis transportés, jamais le moindre souci.",
    accent: "from-violet-500/20 to-violet-500/5",
  },
  {
    name: "Léa V.",
    initials: "LV",
    role: "Expéditrice",
    city: "Nice → Alger",
    rating: 5,
    text: "Service client réactif, prix transparents, et surtout : l'aspect humain. Mon voyageur m'a envoyé une photo à la livraison, ma grand-mère était aux anges.",
    accent: "from-blue-500/20 to-blue-500/5",
  },
  {
    name: "Yacine R.",
    initials: "YR",
    role: "Voyageur Nidit",
    city: "Toulouse → Bamako",
    rating: 5,
    text: "Je gagne en moyenne 80€ par trajet. C'est devenu un vrai complément de revenu, sans contrainte puisque je voyageais déjà. Recommandé à tous mes proches.",
    accent: "from-emerald-500/20 to-emerald-500/5",
  },
];

export default function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-10 text-center"
      >
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500">
          <Star className="h-3 w-3 fill-amber-500" />
          Note moyenne 4,9 / 5
        </div>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Ils nous font confiance
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Témoignages d'expéditeurs et de voyageurs Nidit.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4 }}
            className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${t.accent} p-5 transition`}
          >
            <Quote className="absolute right-3 top-3 h-8 w-8 text-foreground/5" />
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: t.rating }).map((_, k) => (
                <Star key={k} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="relative text-sm leading-relaxed text-foreground/90">
              « {t.text} »
            </p>
            <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {t.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{t.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {t.role} • {t.city}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
