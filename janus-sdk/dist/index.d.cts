interface JanusClientConfig {
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
interface CmsCategory {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    isActive: boolean;
    projectId: string;
    parentId: string | null;
    parent?: {
        id: string;
        name: string;
    } | null;
    children?: Array<{
        id: string;
        name: string;
        isActive: boolean;
    }>;
}
interface CmsTag {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    projectId: string;
    parentId: string | null;
    parent?: {
        id: string;
        name: string;
    } | null;
    children?: Array<{
        id: string;
        name: string;
        isActive: boolean;
    }>;
}
/** Join shape returned inside the `tags` array of a blog post. */
interface CmsPostTag {
    tag: Pick<CmsTag, "id" | "name" | "slug" | "parentId" | "isActive">;
}
/** Shape returned by the blog list endpoint (`GET /api/{tenant}/{project}/blog`). */
interface CmsPost {
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
    categories: Array<{
        category: CmsCategory;
    }>;
    tags: CmsPostTag[];
    project: {
        id: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
}
/** Shape returned by the blog detail endpoint (`GET /api/{tenant}/{project}/blog/{id}`). */
interface CmsPostDetail extends Omit<CmsPost, "slug"> {
    body: string;
}
interface CmsPostDetailResponse {
    success: boolean;
    company: string;
    projectId: string;
    post: CmsPostDetail;
}
interface CmsPostsResponse {
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
interface CmsCategoriesResponse {
    success: boolean;
    company: string;
    projectId: string;
    categories: CmsCategory[];
}
interface CmsTagsResponse {
    success: boolean;
    company: string;
    projectId: string;
    tags: CmsTag[];
}
interface TocHeading {
    id: string;
    text: string;
    level: 2 | 3;
}
interface Post {
    slug: string;
    title: string;
    subtitle?: string;
    description: string;
    category: {
        id: string;
        name: string;
        slug: string;
    };
    coverImage: string;
    publishedAt: string;
    readingTimeMinutes: number;
    author: {
        name: string;
        avatarInitials: string;
        avatarColor: string;
    };
    htmlBody: string;
    tags: Array<{
        name: string;
        slug: string;
    }>;
}
interface JanusPage {
    slug: string;
    name: string;
    /** Present when the page uses Advanced mode (`isAdvanced = true`). */
    schema?: unknown;
    /** Present when the page uses Legacy mode (`isAdvanced = false`). */
    content?: unknown;
    updatedAt: string;
}
interface GetPostsOptions {
    categoryId?: string;
    search?: string;
    /** Maximum number of posts to return. Defaults to 50. */
    limit?: number;
    page?: number;
}
/** Tailwind CSS class bundle for a category colour swatch. */
interface CategoryColor {
    bg: string;
    text: string;
    border: string;
    dot: string;
}

declare class JanusAPIError extends Error {
    readonly status: number;
    readonly url: string;
    constructor(status: number, statusText: string, url: string);
}
declare function getCategoryColor(name: string): CategoryColor;
declare function processHtmlBody(html: string): {
    processedHtml: string;
    headings: TocHeading[];
};
declare function formatDate(isoDate: string): string;
declare class JanusClient {
    private readonly baseUrl;
    private readonly tenantId;
    private readonly projectId;
    private readonly defaultInit;
    constructor(config: JanusClientConfig);
    /**
     * Core fetch wrapper.
     *
     * - Network errors (no connection, DNS, timeout) → returns `null` silently.
     * - HTTP errors (`!res.ok`) → throws `JanusAPIError` with the response status.
     * - Malformed JSON → returns `null` silently.
     *
     * Public methods decide whether to catch or propagate `JanusAPIError`.
     */
    private fetchJson;
    private blogUrl;
    private blogPostDetailUrl;
    private blogCategoriesUrl;
    private blogTagsUrl;
    /**
     * Returns published blog posts.
     * Always resolves to an array — returns `[]` on any error (safe for ISR builds).
     */
    getPosts(opts?: GetPostsOptions): Promise<Post[]>;
    /**
     * Returns a single post by slug, or `null` if not found.
     * Fetches the list to locate the post ID, then fetches the full detail for `htmlBody`.
     * Call `notFound()` when this returns `null`.
     */
    getPost(slug: string): Promise<Post | null>;
    /**
     * Returns all published post slugs.
     * Always resolves to an array — returns `[]` on any error (safe for `generateStaticParams`).
     */
    getPostSlugs(): Promise<string[]>;
    /**
     * Returns up to 3 posts in the same category, excluding the given slug.
     * Always resolves to an array — returns `[]` on any error.
     */
    getRelatedPosts(categoryId: string, excludeSlug: string): Promise<Post[]>;
    /**
     * Returns all blog categories for the project.
     * Always resolves to an array — returns `[]` on any error.
     */
    getCategories(): Promise<CmsCategory[]>;
    /**
     * Returns all blog tags for the project.
     * Always resolves to an array — returns `[]` on any error.
     */
    getTags(): Promise<CmsTag[]>;
    /**
     * Returns a published headless page by slug.
     *
     * - Returns `null` on 404 (page not published or slug not found) — call `notFound()`.
     * - Re-throws `JanusAPIError` for 5xx errors so Next.js `error.tsx` can handle them.
     * - Returns `null` on network errors (graceful degradation).
     */
    getPage(pageSlug: string): Promise<JanusPage | null>;
}

export { type CategoryColor, type CmsCategoriesResponse, type CmsCategory, type CmsPost, type CmsPostDetail, type CmsPostDetailResponse, type CmsPostTag, type CmsPostsResponse, type CmsTag, type CmsTagsResponse, type GetPostsOptions, JanusAPIError, JanusClient, type JanusClientConfig, type JanusPage, type Post, type TocHeading, formatDate, getCategoryColor, processHtmlBody };
