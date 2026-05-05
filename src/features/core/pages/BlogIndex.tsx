import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, BookOpen, Clock, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";
import { BLOG_POSTS, BLOG_CATEGORIES, BLOG_CATEGORY_LABELS, type BlogPost } from "@/lib/blogPosts";

const PAGE_SIZE = 6;

export default function BlogIndex() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCategory = searchParams.get("cat") as BlogPost["category"] | null;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const filtered = useMemo(() => {
    const list = activeCategory
      ? BLOG_POSTS.filter((p) => p.category === activeCategory)
      : BLOG_POSTS;
    return [...list].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  }, [activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const setFilter = (cat: BlogPost["category"] | null) => {
    const next = new URLSearchParams(searchParams);
    if (cat) next.set("cat", cat);
    else next.delete("cat");
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const goToPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    setSearchParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog Nidit — Guides envoi de colis international",
    url: "https://nidit.fr/blog",
    blogPost: BLOG_POSTS.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.publishedAt,
      dateModified: p.updatedAt ?? p.publishedAt,
      url: `https://nidit.fr/blog/${p.slug}`,
    })),
  };

  const seoTitle = activeCategory
    ? `Blog Nidit — ${BLOG_CATEGORY_LABELS[activeCategory]}`
    : "Blog Nidit — Guides pour envoyer un colis à l'international";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title={seoTitle}
        description="Guides pratiques, comparatifs et astuces pour envoyer un colis à l'international moins cher : Maroc, Sénégal, Algérie, Tunisie, Canada, et plus."
        canonical="/blog"
        jsonLd={jsonLd}
      />

      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-primary" />
            Blog Nidit
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">
          Guides &amp; astuces pour <span className="text-primary">envoyer un colis</span> à l'international
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
          Comparatifs, tarifs, douane, conseils d'emballage : tout ce qu'il faut savoir pour envoyer un colis pas
          cher au Maroc, au Sénégal, en Algérie, en Tunisie, au Canada et ailleurs avec un voyageur Nidit vérifié.
        </p>

        {/* Category filters */}
        <nav aria-label="Filtrer par catégorie" className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter(null)}
            aria-pressed={!activeCategory}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              !activeCategory
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
            }`}
          >
            Tout
          </button>
          {BLOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              aria-pressed={activeCategory === cat}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                activeCategory === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
              }`}
            >
              {BLOG_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </nav>

        {paged.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">Aucun article dans cette catégorie pour le moment.</p>
        ) : (
          <ul className="mt-6 grid gap-4 md:grid-cols-2" data-testid="blog-list">
            {paged.map((post) => (
              <li key={post.slug}>
                <Link
                  to={`/blog/${post.slug}`}
                  className="group block h-full rounded-3xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5">
                      {BLOG_CATEGORY_LABELS[post.category]}
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {post.readingMinutes} min
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-bold leading-snug group-hover:text-primary">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{post.description}</p>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {new Date(post.publishedAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => goToPage(safePage - 1)}
            >
              Précédent
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                aria-current={p === safePage ? "page" : undefined}
                className={`h-9 min-w-9 rounded-md border px-3 text-sm font-medium transition ${
                  p === safePage
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                }`}
              >
                {p}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => goToPage(safePage + 1)}
            >
              Suivant
            </Button>
          </nav>
        )}

        <div className="mt-10 rounded-3xl border border-primary/30 bg-primary/5 p-6 text-center">
          <h2 className="text-lg font-bold">Prêt à envoyer ton colis ?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trouve un voyageur Nidit vérifié sur ta route en quelques secondes.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/explore")}>Explorer les trajets</Button>
            <Button variant="outline" onClick={() => navigate("/signup")}>
              Créer un compte
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
