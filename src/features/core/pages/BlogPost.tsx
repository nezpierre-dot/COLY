import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";
import ShareButton from "@/components/ShareButton";
import { BLOG_POSTS, getBlogPost, getRelatedPosts, type BlogBlock } from "@/lib/blogPosts";
import { POPULAR_ROUTES, routeSlug } from "@/lib/popularRoutes";

function renderBlock(block: BlogBlock, idx: number) {
  switch (block.type) {
    case "h2":
      return (
        <h2 key={idx} className="mt-8 text-2xl font-bold leading-tight">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 key={idx} className="mt-6 text-lg font-semibold">
          {block.text}
        </h3>
      );
    case "p":
      return (
        <p key={idx} className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          {block.text}
        </p>
      );
    case "ul":
      return (
        <ul key={idx} className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground md:text-base">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={idx} className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground md:text-base">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote
          key={idx}
          className="mt-6 border-l-4 border-primary/50 bg-muted/30 px-4 py-3 text-sm italic text-foreground"
        >
          {block.text}
        </blockquote>
      );
    case "table":
      return (
        <div key={idx} className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                {block.head.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "cta":
      return (
        <div key={idx} className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
          <p className="text-sm font-semibold">{block.text}</p>
          <Button asChild className="mt-3">
            <Link to={block.href}>{block.label}</Link>
          </Button>
        </div>
      );
  }
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = slug ? getBlogPost(slug) : undefined;

  useEffect(() => {
    if (post) document.title = `${post.title} | Nidit`;
  }, [post]);

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold">Article introuvable</h1>
        <Button onClick={() => navigate("/blog")} className="mt-4">
          Voir tous les articles
        </Button>
      </div>
    );
  }

  const canonical = `/blog/${post.slug}`;
  const related = getRelatedPosts(post.slug, 3);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
      url: `https://nidit.fr${canonical}`,
      author: { "@type": "Organization", name: "Nidit", url: "https://nidit.fr" },
      publisher: {
        "@type": "Organization",
        name: "Nidit",
        logo: { "@type": "ImageObject", url: "https://nidit.fr/icons/pwa-512x512.png" },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": `https://nidit.fr${canonical}` },
      keywords: post.keywords.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://nidit.fr/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://nidit.fr/blog" },
        { "@type": "ListItem", position: 3, name: post.title, item: `https://nidit.fr${canonical}` },
      ],
    },
  ];

  const relatedRouteEntries = (post.relatedRoutes ?? [])
    .map((s) => {
      const match = POPULAR_ROUTES.find(([from, to]) => routeSlug(from, to) === s);
      return match ? { slug: s, from: match[0], to: match[1] } : null;
    })
    .filter((r): r is { slug: string; from: string; to: string } => r !== null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title={`${post.title} | Nidit`}
        description={post.description}
        canonical={canonical}
        type="article"
        jsonLd={jsonLd}
      />

      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Link to="/blog" className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <BookOpen className="h-4 w-4" />
            Blog
          </Link>
          <div className="flex-1" />
          <ShareButton url={canonical} title={post.title} text={post.description} />
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
            {post.category}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {post.readingMinutes} min de lecture
          </span>
          <span>
            {new Date(post.publishedAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">{post.title}</h1>
        <p className="mt-3 text-base text-muted-foreground">{post.description}</p>

        <div className="mt-6">
          {post.blocks.map((b, i) => renderBlock(b, i))}
        </div>

        {relatedRouteEntries.length > 0 && (
          <section className="mt-10 rounded-3xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold">Trajets liés à cet article</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {relatedRouteEntries.map((r) => (
                <li key={r.slug}>
                  <Link
                    to={`/explore/${r.slug}`}
                    className="inline-flex items-center rounded-full border border-border bg-muted/30 px-3 py-1 text-sm font-medium hover:border-primary/50 hover:text-primary"
                  >
                    {r.from} → {r.to}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold">À lire aussi</h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    to={`/blog/${r.slug}`}
                    className="block h-full rounded-2xl border border-border bg-card p-4 hover:border-primary/50"
                  >
                    <div className="text-xs font-semibold text-primary">{r.category}</div>
                    <div className="mt-1 text-sm font-semibold leading-snug">{r.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
}

// Re-export so route preloading can warm the data
export { BLOG_POSTS };
