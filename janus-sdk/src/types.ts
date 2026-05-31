// ─── Client config ────────────────────────────────────────────────────────────

export interface JanusClientConfig {
  /** Base URL of the Janus instance (e.g. "https://cms.example.com"). */
  baseUrl: string;
  /**
   * Tenant identifier — maps to `companySlug` on all API routes.
   */
  tenantId: string;
  /**
   * Project identifier — required for blog endpoints
   * (`/api/{tenantId}/{projectId}/blog/...`).
   */
  projectId: string;
  /**
   * Default `RequestInit` merged into every fetch call.
   * Use this to pass framework-specific options such as Next.js ISR:
   * `{ next: { revalidate: 60 } }`
   */
  defaultInit?: RequestInit;
}

// ─── Raw CMS shapes (mirror Janus Prisma schema) ─────────────────────────────

export interface CmsCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  projectId: string;
  parentId: string | null;
  parent?: { id: string; name: string } | null;
  children?: Array<{ id: string; name: string; isActive: boolean }>;
}

export interface CmsTag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  projectId: string;
  parentId: string | null;
  parent?: { id: string; name: string } | null;
  children?: Array<{ id: string; name: string; isActive: boolean }>;
}

/** Join shape returned inside the `tags` array of a blog post. */
export interface CmsPostTag {
  tag: Pick<CmsTag, "id" | "name" | "slug" | "parentId" | "isActive">;
}

/** Shape returned by the blog list endpoint (`GET /api/{tenant}/{project}/blog`). */
export interface CmsPost {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  coverImageUrl: string | null;
  authorName: string;
  readingTime: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  categories: Array<{ category: CmsCategory }>;
  tags: CmsPostTag[];
  project: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

/** Shape returned by the blog detail endpoint (`GET /api/{tenant}/{project}/blog/{id}`). */
export interface CmsPostDetail extends Omit<CmsPost, "slug"> {
  body: string;
}

export interface CmsPostDetailResponse {
  success: boolean;
  company: string;
  projectId: string;
  post: CmsPostDetail;
}

export interface CmsPostsResponse {
  success: boolean;
  company: string;
  projectId: string;
  posts: CmsPost[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CmsCategoriesResponse {
  success: boolean;
  company: string;
  projectId: string;
  categories: CmsCategory[];
}

export interface CmsTagsResponse {
  success: boolean;
  company: string;
  projectId: string;
  tags: CmsTag[];
}

// ─── Normalized shapes (consumed by UI components) ───────────────────────────

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface Post {
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  category: { id: string; name: string; slug: string };
  coverImage: string;
  publishedAt: string;
  readingTimeMinutes: number;
  author: { name: string; avatarInitials: string; avatarColor: string };
  htmlBody: string;
  tags: Array<{ name: string; slug: string }>;
}

export interface JanusPage {
  slug: string;
  name: string;
  /** Present when the page uses Advanced mode (`isAdvanced = true`). */
  schema?: unknown;
  /** Present when the page uses Legacy mode (`isAdvanced = false`). */
  content?: unknown;
  updatedAt: string;
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface GetPostsOptions {
  categoryId?: string;
  search?: string;
  /** Maximum number of posts to return. Defaults to 50. */
  limit?: number;
  page?: number;
}

// ─── Utility types ────────────────────────────────────────────────────────────

/** Tailwind CSS class bundle for a category colour swatch. */
export interface CategoryColor {
  bg: string;
  text: string;
  border: string;
  dot: string;
}
