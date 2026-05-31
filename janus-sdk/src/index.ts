export * from "./types";
export type {
  JanusClientConfig,
  CmsCategory,
  CmsTag,
  CmsPostTag,
  CmsPost,
  CmsPostDetail,
  CmsPostDetailResponse,
  CmsPostsResponse,
  CmsCategoriesResponse,
  CmsTagsResponse,
  TocHeading,
  Post,
  JanusPage,
  GetPostsOptions,
  CategoryColor,
} from "./types";

import type {
  JanusClientConfig,
  CmsCategory,
  CmsTag,
  CmsPost,
  CmsPostDetail,
  CmsPostDetailResponse,
  CmsPostsResponse,
  CmsCategoriesResponse,
  CmsTagsResponse,
  TocHeading,
  Post,
  JanusPage,
  GetPostsOptions,
} from "./types";

import type { CategoryColor } from "./types";

// ─── JanusAPIError ────────────────────────────────────────────────────────────

export class JanusAPIError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(status: number, statusText: string, url: string) {
    super(`Janus API error ${status} (${statusText}) — ${url}`);
    this.name = "JanusAPIError";
    this.status = status;
    this.url = url;
  }
}

// ─── Category colour palette (deterministic by name) ─────────────────────────

const PALETTE: readonly CategoryColor[] = [
  { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500"    },
  { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200",  dot: "bg-purple-500"  },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  dot: "bg-orange-500"  },
  { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    dot: "bg-rose-500"    },
  { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500"   },
];

export function getCategoryColor(name: string): CategoryColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % PALETTE.length;
  }
  return PALETTE[Math.abs(hash)];
}

// ─── HTML / ToC utilities ─────────────────────────────────────────────────────

export function processHtmlBody(html: string): { processedHtml: string; headings: TocHeading[] } {
  const headings: TocHeading[] = [];
  const idCount: Record<string, number> = {};

  const processedHtml = html.replace(
    /<(h[23])([^>]*)>([\s\S]*?)<\/h[23]>/gi,
    (_, tag: string, attrs: string, inner: string) => {
      const level = parseInt(tag[1]) as 2 | 3;
      const text = inner.replace(/<[^>]+>/g, "").trim();
      let id = slugifyText(text);
      if (idCount[id] !== undefined) {
        idCount[id]++;
        id = `${id}-${idCount[id]}`;
      } else {
        idCount[id] = 0;
      }
      headings.push({ id, text, level });
      const cleanAttrs = attrs.replace(/\s*id="[^"]*"/gi, "");
      return `<${tag}${cleanAttrs} id="${id}">${inner}</${tag}>`;
    }
  );

  return { processedHtml, headings };
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoDate));
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-emerald-600",
  "bg-orange-500", "bg-rose-600", "bg-indigo-600",
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(h)];
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const COVER_FALLBACK =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1280";

function resolveCategory(post: CmsPost): { id: string; name: string; slug: string } {
  const cat = post.categories[0]?.category;
  if (cat) return { id: cat.id, name: cat.name, slug: cat.slug };
  return { id: "", name: "Geral", slug: "geral" };
}

function cmsToPost(p: CmsPost, htmlBody = ""): Post {
  const authorName = p.authorName ?? "Equipe";

  return {
    slug: p.slug ?? p.id,
    title: p.title,
    subtitle: p.subtitle ?? undefined,
    description: p.subtitle ?? p.title,
    category: resolveCategory(p),
    coverImage: p.coverImageUrl ?? COVER_FALLBACK,
    publishedAt: p.publishedAt ?? p.createdAt,
    readingTimeMinutes: p.readingTime ?? 5,
    author: {
      name: authorName,
      avatarInitials: avatarInitials(authorName),
      avatarColor: avatarColor(authorName),
    },
    htmlBody,
    tags: p.tags.map((t) => ({ name: t.tag.name, slug: t.tag.slug })),
  };
}

function cmsPostDetailToPost(p: CmsPostDetail, listPost: CmsPost): Post {
  const { processedHtml } = processHtmlBody(p.body);
  return cmsToPost(listPost, processedHtml);
}

// ─── JanusClient ─────────────────────────────────────────────────────────────

export class JanusClient {
  private readonly baseUrl: string;
  private readonly tenantId: string;
  private readonly projectId: string;
  private readonly defaultInit: RequestInit;

  constructor(config: JanusClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.tenantId = config.tenantId;
    this.projectId = config.projectId;
    this.defaultInit = config.defaultInit ?? {};
  }

  /**
   * Core fetch wrapper.
   *
   * - Network errors (no connection, DNS, timeout) → returns `null` silently.
   * - HTTP errors (`!res.ok`) → throws `JanusAPIError` with the response status.
   * - Malformed JSON → returns `null` silently.
   *
   * Public methods decide whether to catch or propagate `JanusAPIError`.
   */
  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
    const url = `${this.baseUrl}${path}`;
    let res: Response;
    try {
      res = await fetch(url, { ...this.defaultInit, ...init });
    } catch {
      return null;
    }
    if (!res.ok) {
      throw new JanusAPIError(res.status, res.statusText, url);
    }
    try {
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  // ─── URL builders ──────────────────────────────────────────────────────────

  private blogUrl(params?: Record<string, string>): string {
    const base = `/api/${this.tenantId}/${this.projectId}/blog`;
    if (!params) return base;
    const qs = new URLSearchParams(params).toString();
    return qs ? `${base}?${qs}` : base;
  }

  private blogPostDetailUrl(id: string): string {
    return `/api/${this.tenantId}/${this.projectId}/blog/${id}`;
  }

  private blogCategoriesUrl(): string {
    return `/api/${this.tenantId}/${this.projectId}/blog/categories`;
  }

  private blogTagsUrl(): string {
    return `/api/${this.tenantId}/${this.projectId}/blog/tags`;
  }

  // ─── Blog methods ──────────────────────────────────────────────────────────

  /**
   * Returns published blog posts.
   * Always resolves to an array — returns `[]` on any error (safe for ISR builds).
   */
  async getPosts(opts?: GetPostsOptions): Promise<Post[]> {
    const params: Record<string, string> = {
      limit: String(opts?.limit ?? 50),
    };
    if (opts?.page) params.page = String(opts.page);
    if (opts?.categoryId) params.categoryId = opts.categoryId;
    if (opts?.search) params.search = opts.search;

    try {
      const data = await this.fetchJson<CmsPostsResponse>(this.blogUrl(params));
      return (data?.posts ?? []).map((p) => cmsToPost(p));
    } catch {
      return [];
    }
  }

  /**
   * Returns a single post by slug, or `null` if not found.
   * Fetches the list to locate the post ID, then fetches the full detail for `htmlBody`.
   * Call `notFound()` when this returns `null`.
   */
  async getPost(slug: string): Promise<Post | null> {
    try {
      const listData = await this.fetchJson<CmsPostsResponse>(
        this.blogUrl({ limit: "200" })
      );
      const listPost = listData?.posts.find((p) => (p.slug ?? p.id) === slug);
      if (!listPost) return null;

      const detailData = await this.fetchJson<CmsPostDetailResponse>(
        this.blogPostDetailUrl(listPost.id)
      );
      if (!detailData?.post) return null;

      return cmsPostDetailToPost(detailData.post, listPost);
    } catch {
      return null;
    }
  }

  /**
   * Returns all published post slugs.
   * Always resolves to an array — returns `[]` on any error (safe for `generateStaticParams`).
   */
  async getPostSlugs(): Promise<string[]> {
    try {
      const data = await this.fetchJson<CmsPostsResponse>(
        this.blogUrl({ limit: "200" })
      );
      return (data?.posts ?? []).map((p) => p.slug ?? p.id);
    } catch {
      return [];
    }
  }

  /**
   * Returns up to 3 posts in the same category, excluding the given slug.
   * Always resolves to an array — returns `[]` on any error.
   */
  async getRelatedPosts(categoryId: string, excludeSlug: string): Promise<Post[]> {
    try {
      const data = await this.fetchJson<CmsPostsResponse>(
        this.blogUrl({ categoryId, limit: "10" })
      );
      return (data?.posts ?? [])
        .filter((p) => (p.slug ?? p.id) !== excludeSlug)
        .slice(0, 3)
        .map((p) => cmsToPost(p));
    } catch {
      return [];
    }
  }

  /**
   * Returns all blog categories for the project.
   * Always resolves to an array — returns `[]` on any error.
   */
  async getCategories(): Promise<CmsCategory[]> {
    try {
      const data = await this.fetchJson<CmsCategoriesResponse>(this.blogCategoriesUrl());
      return data?.categories ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Returns all blog tags for the project.
   * Always resolves to an array — returns `[]` on any error.
   */
  async getTags(): Promise<CmsTag[]> {
    try {
      const data = await this.fetchJson<CmsTagsResponse>(this.blogTagsUrl());
      return data?.tags ?? [];
    } catch {
      return [];
    }
  }

  // ─── Headless page ─────────────────────────────────────────────────────────

  /**
   * Returns a published headless page by slug.
   *
   * - Returns `null` on 404 (page not published or slug not found) — call `notFound()`.
   * - Re-throws `JanusAPIError` for 5xx errors so Next.js `error.tsx` can handle them.
   * - Returns `null` on network errors (graceful degradation).
   */
  async getPage(pageSlug: string): Promise<JanusPage | null> {
    try {
      return await this.fetchJson<JanusPage>(
        `/api/v1/content/${this.tenantId}/${pageSlug}`
      );
    } catch (err) {
      if (err instanceof JanusAPIError && err.status === 404) return null;
      throw err;
    }
  }
}
