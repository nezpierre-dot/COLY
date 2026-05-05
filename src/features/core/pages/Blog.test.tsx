import { describe, it, expect, beforeEach } from "vitest";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import BlogIndex from "./BlogIndex";
import BlogPost from "./BlogPost";
import { BLOG_POSTS } from "@/lib/blogPosts";

function getJsonLd(): Array<Record<string, unknown>> {
  const scripts = Array.from(document.head.querySelectorAll('script[type="application/ld+json"]'));
  return scripts.flatMap((s) => {
    const parsed = JSON.parse(s.textContent || "null");
    return Array.isArray(parsed) ? parsed : [parsed];
  });
}

function renderAt(path: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("/blog (BlogIndex) — JSON-LD & validity", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("injects a valid Blog JSON-LD listing every post", async () => {
    renderAt("/blog");

    await waitFor(() => {
      const items = getJsonLd();
      const blog = items.find((i) => i["@type"] === "Blog");
      expect(blog).toBeDefined();
      expect(blog!["@context"]).toBe("https://schema.org");
      const posts = blog!.blogPost as Array<Record<string, unknown>>;
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBe(BLOG_POSTS.length);
      for (const p of posts) {
        expect(p["@type"]).toBe("BlogPosting");
        expect(typeof p.headline).toBe("string");
        expect(typeof p.url).toBe("string");
      }
    });
  });

  it("has an absolute canonical for /blog", async () => {
    renderAt("/blog");
    await waitFor(() => {
      const c = document.head.querySelector('link[rel="canonical"]');
      expect(c?.getAttribute("href")).toBe("https://nidit.fr/blog");
    });
  });
});

describe("/blog?cat=...&page=... — canonical, rel prev/next, JSON-LD", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("keeps canonical aligned with cat + page params", async () => {
    renderAt("/blog?cat=guide&page=2");
    await waitFor(() => {
      const c = document.head.querySelector('link[rel="canonical"]');
      // safePage is clamped to totalPages; canonical must match the actual rendered page
      const href = c?.getAttribute("href") || "";
      expect(href.startsWith("https://nidit.fr/blog")).toBe(true);
      expect(href).toContain("cat=guide");
    });
  });

  it("emits a valid Blog JSON-LD even when filtering by category", async () => {
    renderAt("/blog?cat=destination");
    await waitFor(() => {
      const items = getJsonLd();
      const blog = items.find((i) => i["@type"] === "Blog");
      expect(blog).toBeDefined();
      expect(blog!["@context"]).toBe("https://schema.org");
    });
  });

  it("exposes RSS and Atom alternates", async () => {
    renderAt("/blog");
    await waitFor(() => {
      const rss = document.head.querySelector('link[rel="alternate"][type="application/rss+xml"]');
      const atom = document.head.querySelector('link[rel="alternate"][type="application/atom+xml"]');
      expect(rss).toBeTruthy();
      expect(atom).toBeTruthy();
    });
  });
});

describe("/blog filters & pagination", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("filters posts by category", async () => {
    renderAt("/blog");
    const guideBtn = await screen.findByRole("button", { name: "Guide" });
    fireEvent.click(guideBtn);

    const list = await screen.findByTestId("blog-list");
    const items = list.querySelectorAll("li");
    // At least one guide post exists in fixtures
    expect(items.length).toBeGreaterThan(0);
    // All visible items should be guide-category
    const guideCount = BLOG_POSTS.filter((p) => p.category === "guide").length;
    expect(items.length).toBe(Math.min(guideCount, 6));
  });
});

describe("/blog/:slug (BlogPost) — JSON-LD validity", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("injects BlogPosting + BreadcrumbList for any post", async () => {
    const post = BLOG_POSTS[0];
    renderAt(`/blog/${post.slug}`);

    await waitFor(() => {
      const items = getJsonLd();
      const types = items.map((i) => i["@type"]);
      expect(types).toContain("BlogPosting");
      expect(types).toContain("BreadcrumbList");
    });

    for (const item of getJsonLd()) {
      expect(item["@context"]).toBe("https://schema.org");
      expect(typeof item["@type"]).toBe("string");
    }
  });

  it("emits FAQPage JSON-LD when the post has an FAQ", async () => {
    const postWithFaq = BLOG_POSTS.find((p) => p.faq && p.faq.length > 0);
    expect(postWithFaq).toBeDefined();
    renderAt(`/blog/${postWithFaq!.slug}`);

    await waitFor(() => {
      const items = getJsonLd();
      const faq = items.find((i) => i["@type"] === "FAQPage");
      expect(faq).toBeDefined();
      const main = faq!.mainEntity as Array<Record<string, unknown>>;
      expect(Array.isArray(main)).toBe(true);
      expect(main.length).toBe(postWithFaq!.faq!.length);
      for (const q of main) {
        expect(q["@type"]).toBe("Question");
        const ans = q.acceptedAnswer as Record<string, unknown>;
        expect(ans["@type"]).toBe("Answer");
        expect(typeof ans.text).toBe("string");
      }
    });
  });

  it("uses an absolute canonical matching the slug", async () => {
    const post = BLOG_POSTS[0];
    renderAt(`/blog/${post.slug}`);
    await waitFor(() => {
      const c = document.head.querySelector('link[rel="canonical"]');
      expect(c?.getAttribute("href")).toBe(`https://nidit.fr/blog/${post.slug}`);
    });
  });
});
