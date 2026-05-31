# janus-sdk

Framework-agnostic TypeScript SDK for the [Janus](https://github.com/mavellium/janus) headless CMS API.

Works in any JavaScript runtime that supports the native `fetch` API (Node ≥ 18, browsers, Deno, Bun, Cloudflare Workers, Next.js, Astro, etc.).

---

## Installation

```bash
npm i janus-sdk
# or
pnpm add janus-sdk
# or
yarn add janus-sdk
```

---

## Initialization

```ts
import { JanusClient } from "janus-sdk";

const client = new JanusClient({
  baseUrl:  "https://cms.example.com",
  tenantId: "my-company", // companySlug registered in Janus
});
```

### With Next.js ISR (recommended for App Router)

Pass framework-specific fetch options via `defaultInit`. Every request made by the client will inherit these options.

```ts
// lib/janus.ts
import { JanusClient } from "janus-sdk";

export const janus = new JanusClient({
  baseUrl:     process.env.JANUS_URL!,
  tenantId:    process.env.JANUS_TENANT_ID!,
  defaultInit: { next: { revalidate: 60 } }, // revalidate all requests every 60 s
});
```

---

## Blog

### List posts

```ts
const posts = await janus.getPosts();
// with filters:
const featured = await janus.getPosts({ featured: true, limit: 6 });
const byCategory = await janus.getPosts({ categoryId: "abc123", limit: 10 });
```

`getPosts` always resolves — returns `[]` on any network or HTTP error. Safe to use inside `generateStaticParams` and ISR page components.

### Single post

```ts
// app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await janus.getPost(params.slug);
  if (!post) notFound();

  return <article dangerouslySetInnerHTML={{ __html: post.htmlBody }} />;
}
```

### Static params (SSG)

```ts
export async function generateStaticParams() {
  const slugs = await janus.getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}
```

### Related posts

```ts
const related = await janus.getRelatedPosts(post.category.id, post.slug);
// returns up to 3 posts in the same category, excluding the current one
```

### Categories

```ts
const categories = await janus.getCategories();
```

---

## Headless page

`getPage` fetches a published page from the `/api/v1/content/:tenantId/:pageSlug` endpoint.

```ts
// app/[slug]/page.tsx
import { notFound } from "next/navigation";
import { JanusAPIError } from "janus-sdk";

export default async function DynamicPage({ params }: { params: { slug: string } }) {
  const page = await janus.getPage(params.slug);
  if (!page) notFound(); // 404 or not published

  const content = page.content as Record<string, string>;
  return <main>{content.hero_title}</main>;
}
```

`getPage` distinguishes error types:
- **Not found (404)** → returns `null` → call `notFound()`
- **Server error (5xx)** → throws `JanusAPIError` → caught by Next.js `error.tsx`
- **Network error** → returns `null` (graceful degradation)

---

## Utilities

### `processHtmlBody`

Parses `<h2>` and `<h3>` tags from an HTML body, injects unique `id` attributes, and returns a headings list for building a Table of Contents.

```ts
import { processHtmlBody } from "janus-sdk";

const { processedHtml, headings } = processHtmlBody(post.htmlBody);
// headings: Array<{ id: string; text: string; level: 2 | 3 }>
```

### `getCategoryColor`

Returns a deterministic Tailwind CSS colour bundle for a category name.

```ts
import { getCategoryColor } from "janus-sdk";

const { bg, text, border, dot } = getCategoryColor(post.category.name);
// e.g. { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" }

return (
  <span className={`${bg} ${text} ${border} border rounded-full px-2 py-0.5 text-xs`}>
    {post.category.name}
  </span>
);
```

### `formatDate`

Formats an ISO date string to Brazilian Portuguese locale.

```ts
import { formatDate } from "janus-sdk";

formatDate("2026-05-17T00:00:00.000Z"); // "17 de maio de 2026"
```

---

## Error handling

| Method | Network error | HTTP 404 | HTTP 5xx |
|---|---|---|---|
| `getPosts` | `[]` | `[]` | `[]` |
| `getPostSlugs` | `[]` | `[]` | `[]` |
| `getRelatedPosts` | `[]` | `[]` | `[]` |
| `getCategories` | `[]` | `[]` | `[]` |
| `getPost` | `null` | `null` | `null` |
| `getPage` | `null` | `null` | throws `JanusAPIError` |

List methods always resolve safely to avoid breaking static builds. `getPage` re-throws server errors so Next.js can render the appropriate `error.tsx`.

### Catching `JanusAPIError` manually

```ts
import { JanusAPIError } from "janus-sdk";

try {
  const page = await janus.getPage("home");
} catch (err) {
  if (err instanceof JanusAPIError) {
    console.error(`HTTP ${err.status} on ${err.url}`);
  }
  throw err;
}
```

---

## TypeScript

All types are exported from the package root:

```ts
import type {
  JanusClientConfig,
  Post,
  JanusPage,
  CmsPost,
  CmsCategory,
  CmsTag,
  CmsAuthor,
  CmsPostsResponse,
  TocHeading,
  GetPostsOptions,
  CategoryColor,
} from "janus-sdk";
```
