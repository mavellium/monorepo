"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  JanusAPIError: () => JanusAPIError,
  JanusClient: () => JanusClient,
  formatDate: () => formatDate,
  getCategoryColor: () => getCategoryColor,
  processHtmlBody: () => processHtmlBody
});
module.exports = __toCommonJS(index_exports);
var JanusAPIError = class extends Error {
  constructor(status, statusText, url) {
    super(`Janus API error ${status} (${statusText}) \u2014 ${url}`);
    this.name = "JanusAPIError";
    this.status = status;
    this.url = url;
  }
};
var PALETTE = [
  { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" }
];
function getCategoryColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % PALETTE.length;
  }
  return PALETTE[Math.abs(hash)];
}
function processHtmlBody(html) {
  const headings = [];
  const idCount = {};
  const processedHtml = html.replace(
    /<(h[23])([^>]*)>([\s\S]*?)<\/h[23]>/gi,
    (_, tag, attrs, inner) => {
      const level = parseInt(tag[1]);
      const text = inner.replace(/<[^>]+>/g, "").trim();
      let id = slugifyText(text);
      if (idCount[id] !== void 0) {
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
function formatDate(isoDate) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(isoDate));
}
function slugifyText(text) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}
var AVATAR_COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-orange-500",
  "bg-rose-600",
  "bg-indigo-600"
];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(h)];
}
function avatarInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
var COVER_FALLBACK = "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1280";
function resolveCategory(post) {
  const cat = post.categories[0]?.category;
  if (cat) return { id: cat.id, name: cat.name, slug: cat.slug };
  return { id: "", name: "Geral", slug: "geral" };
}
function cmsToPost(p, htmlBody = "") {
  const authorName = p.authorName ?? "Equipe";
  return {
    slug: p.slug ?? p.id,
    title: p.title,
    subtitle: p.subtitle ?? void 0,
    description: p.subtitle ?? p.title,
    category: resolveCategory(p),
    coverImage: p.coverImageUrl ?? COVER_FALLBACK,
    publishedAt: p.publishedAt ?? p.createdAt,
    readingTimeMinutes: p.readingTime ?? 5,
    author: {
      name: authorName,
      avatarInitials: avatarInitials(authorName),
      avatarColor: avatarColor(authorName)
    },
    htmlBody,
    tags: p.tags.map((t) => ({ name: t.tag.name, slug: t.tag.slug }))
  };
}
function cmsPostDetailToPost(p, listPost) {
  const { processedHtml } = processHtmlBody(p.body);
  return cmsToPost(listPost, processedHtml);
}
var JanusClient = class {
  constructor(config) {
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
  async fetchJson(path, init) {
    const url = `${this.baseUrl}${path}`;
    let res;
    try {
      res = await fetch(url, { ...this.defaultInit, ...init });
    } catch {
      return null;
    }
    if (!res.ok) {
      throw new JanusAPIError(res.status, res.statusText, url);
    }
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  // ─── URL builders ──────────────────────────────────────────────────────────
  blogUrl(params) {
    const base = `/api/${this.tenantId}/${this.projectId}/blog`;
    if (!params) return base;
    const qs = new URLSearchParams(params).toString();
    return qs ? `${base}?${qs}` : base;
  }
  blogPostDetailUrl(id) {
    return `/api/${this.tenantId}/${this.projectId}/blog/${id}`;
  }
  blogCategoriesUrl() {
    return `/api/${this.tenantId}/${this.projectId}/blog/categories`;
  }
  blogTagsUrl() {
    return `/api/${this.tenantId}/${this.projectId}/blog/tags`;
  }
  // ─── Blog methods ──────────────────────────────────────────────────────────
  /**
   * Returns published blog posts.
   * Always resolves to an array — returns `[]` on any error (safe for ISR builds).
   */
  async getPosts(opts) {
    const params = {
      limit: String(opts?.limit ?? 50)
    };
    if (opts?.page) params.page = String(opts.page);
    if (opts?.categoryId) params.categoryId = opts.categoryId;
    if (opts?.search) params.search = opts.search;
    try {
      const data = await this.fetchJson(this.blogUrl(params));
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
  async getPost(slug) {
    try {
      const listData = await this.fetchJson(
        this.blogUrl({ limit: "200" })
      );
      const listPost = listData?.posts.find((p) => (p.slug ?? p.id) === slug);
      if (!listPost) return null;
      const detailData = await this.fetchJson(
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
  async getPostSlugs() {
    try {
      const data = await this.fetchJson(
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
  async getRelatedPosts(categoryId, excludeSlug) {
    try {
      const data = await this.fetchJson(
        this.blogUrl({ categoryId, limit: "10" })
      );
      return (data?.posts ?? []).filter((p) => (p.slug ?? p.id) !== excludeSlug).slice(0, 3).map((p) => cmsToPost(p));
    } catch {
      return [];
    }
  }
  /**
   * Returns all blog categories for the project.
   * Always resolves to an array — returns `[]` on any error.
   */
  async getCategories() {
    try {
      const data = await this.fetchJson(this.blogCategoriesUrl());
      return data?.categories ?? [];
    } catch {
      return [];
    }
  }
  /**
   * Returns all blog tags for the project.
   * Always resolves to an array — returns `[]` on any error.
   */
  async getTags() {
    try {
      const data = await this.fetchJson(this.blogTagsUrl());
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
  async getPage(pageSlug) {
    try {
      return await this.fetchJson(
        `/api/v1/content/${this.tenantId}/${pageSlug}`
      );
    } catch (err) {
      if (err instanceof JanusAPIError && err.status === 404) return null;
      throw err;
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JanusAPIError,
  JanusClient,
  formatDate,
  getCategoryColor,
  processHtmlBody
});
//# sourceMappingURL=index.cjs.map