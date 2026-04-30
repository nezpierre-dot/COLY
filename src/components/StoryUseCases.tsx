import { motion } from "framer-motion";
import { Heart, Gift, Pill, Sparkles, Cake, BookOpen } from "lucide-react";

interface UseCase {
  icon: typeof Heart;
  emoji: string;
  title: string;
  story: string;
  route: string;
  gradient: string;
  iconColor: string;
}

const STORIES: UseCase[] = [
  {
    icon: Sparkles,
    emoji: "💄",
    title: "Un parfum pour ta sœur",
    story: "Sa marque préférée n'existe pas chez elle. Tu commandes à Dubaï, un voyageur le ramène à Casablanca pour son anniversaire.",
    route: "Dubaï → Casablanca",
    gradient: "from-pink-500/20 via-rose-500/10 to-transparent",
    iconColor: "text-pink-500",
  },
  {
    icon: Pill,
    emoji: "💊",
    title: "Les médicaments de mamie",
    story: "Son traitement est introuvable au Sénégal. Un voyageur passe par la pharmacie à Paris et lui apporte le mois suivant.",
    route: "Paris → Dakar",
    gradient: "from-emerald-500/20 via-success/10 to-transparent",
    iconColor: "text-success",
  },
  {
    icon: Cake,
    emoji: "🎂",
    title: "Le gâteau d'anniversaire",
    story: "Tes parents fêtent leurs 40 ans à Alger. Tu envoies leurs pâtisseries préférées de Lyon. Ils ouvrent le colis devant la caméra.",
    route: "Lyon → Alger",
    gradient: "from-amber-500/20 via-yellow-500/10 to-transparent",
    iconColor: "text-amber-500",
  },
  {
    icon: BookOpen,
    emoji: "📚",
    title: "Les livres de cours",
    story: "Ton petit frère prépare le bac à Tunis. Tu lui envoies les manuels qu'il ne trouve pas, juste à temps pour les révisions.",
    route: "Marseille → Tunis",
    gradient: "from-blue-500/20 via-primary/10 to-transparent",
    iconColor: "text-primary",
  },
  {
    icon: Gift,
    emoji: "🎁",
    title: "Le cadeau de mariage",
    story: "Tu ne peux pas être au mariage de ta cousine à Abidjan. Ton cadeau y sera. Photo de remise garantie.",
    route: "Bordeaux → Abidjan",
    gradient: "from-violet-500/20 via-purple-500/10 to-transparent",
    iconColor: "text-violet-500",
  },
  {
    icon: Heart,
    emoji: "💌",
    title: "Une attention pour maman",
    story: "Elle te manque. Une boîte de chocolats, une carte écrite à la main. Un voyageur s'en charge dans la semaine.",
    route: "Nice → Bamako",
    gradient: "from-red-500/20 via-pink-500/10 to-transparent",
    iconColor: "text-red-500",
  },
];

export default function StoryUseCases() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-12 text-center"
      >
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-pink-500">
          <Heart className="h-3 w-3 fill-pink-500" />
          De vraies histoires
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
          Derrière chaque colis,
          <br />
          <span className="bg-gradient-to-r from-primary via-pink-500 to-success bg-clip-text text-transparent">
            une histoire qui compte.
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          Nidit, c'est plus qu'un transport. C'est un lien entre toi et ceux que tu aimes, où qu'ils soient.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {STORIES.map((s, i) => (
          <motion.article
            key={s.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.06, duration: 0.5 }}
            whileHover={{ y: -6 }}
            className={`group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${s.gradient} p-6 transition`}
          >
            <div className="pointer-events-none absolute -right-6 -top-6 text-7xl opacity-20 transition group-hover:scale-110 group-hover:opacity-30">
              {s.emoji}
            </div>
            <div className={`relative mb-4 inline-flex rounded-2xl bg-card/80 p-3 backdrop-blur ${s.iconColor}`}>
              <s.icon className="h-6 w-6" />
            </div>
            <h3 className="relative text-lg font-bold leading-tight">{s.title}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-foreground/80">{s.story}</p>
            <div className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-card/70 px-3 py-1 text-xs font-semibold text-foreground/70 backdrop-blur">
              ✈️ {s.route}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
