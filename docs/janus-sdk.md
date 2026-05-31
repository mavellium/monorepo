# janus-sdk — Guia Completo

> Documento gerado em 2026-05-17. Mantido manualmente conforme o SDK evolui.

---

## Índice

1. [O que é e por que existe](#1-o-que-é-e-por-que-existe)
2. [Estrutura do pacote](#2-estrutura-do-pacote)
3. [Ferramentas de build](#3-ferramentas-de-build)
4. [Instalação](#4-instalação)
   - [Opção A — dentro do monorepo (workspace)](#opção-a--dentro-do-monorepo-workspace)
   - [Opção B — projeto externo via pnpm link](#opção-b--projeto-externo-via-pnpm-link)
   - [Opção C — npm/pnpm publish (produção)](#opção-c--npmpnpm-publish-produção)
5. [Inicialização do cliente](#5-inicialização-do-cliente)
6. [Métodos de blog](#6-métodos-de-blog)
7. [Método de página headless](#7-método-de-página-headless)
8. [Funções utilitárias](#8-funções-utilitárias)
9. [Tratamento de erros](#9-tratamento-de-erros)
10. [Tipos TypeScript](#10-tipos-typescript)
11. [Workflow de desenvolvimento](#11-workflow-de-desenvolvimento)
12. [Referência de comandos](#12-referência-de-comandos)

---

## 1. O que é e por que existe

O `institucional-mavellium` consumia a API do Janus diretamente via `src/lib/blog-api.ts` — um arquivo acoplado ao Next.js (usava `process.env`, cache via `{ next: { revalidate } }` hardcoded, e classes Tailwind embutidas na lógica de negócio). Isso tornava impossível reusar o mesmo cliente em outro framework ou projeto Node puro.

O `janus-sdk` resolve isso extraindo toda a lógica de comunicação com a API do Janus para um **pacote agnóstico de framework**:

- Sem dependência de `process.env` — configuração explícita via construtor
- Sem imports de Next.js — cache/revalidação configurável pelo consumidor via `defaultInit`
- Sem classes Tailwind no core — paletas disponíveis via utilitários exportados
- Usa apenas `fetch` nativo (Node ≥ 18, browsers, Deno, Bun, Cloudflare Workers)
- Exporta ESM e CommonJS simultaneamente

```
institucional-mavellium          Janus CMS
        │
        │  import { JanusClient } from "janus-sdk"
        │
        ▼
    janus-sdk
        │  fetch nativa
        │  GET /api/{tenantId}/blog/posts
        │  GET /api/{tenantId}/blog/categories
        │  GET /api/v1/content/{tenantId}/{pageSlug}
        ▼
    API pública do Janus
```

---

## 2. Estrutura do pacote

```
janus-sdk/
├── src/
│   ├── types.ts        ← todas as interfaces e tipos exportados (sem runtime values)
│   └── index.ts        ← JanusAPIError, JanusClient, funções utilitárias; re-exporta types.ts
├── dist/               ← gerado pelo build (não commitado)
│   ├── index.js        ← ESM
│   ├── index.cjs       ← CommonJS
│   ├── index.d.ts      ← tipos ESM
│   └── index.d.cts     ← tipos CJS
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

### `src/types.ts`

Contém apenas `interface` e `type` — nenhum valor runtime. Permite que consumidores importem só os tipos sem arrastar código executável.

```ts
import type { Post, JanusPage, CmsCategory } from "janus-sdk";
```

### `src/index.ts`

Re-exporta tudo de `types.ts` e adiciona:
- `JanusAPIError` — classe de erro tipada com `status` e `url`
- `JanusClient` — classe principal
- `getCategoryColor`, `processHtmlBody`, `formatDate` — utilitários puros exportados

---

## 3. Ferramentas de build

| Ferramenta | Versão | Função |
|---|---|---|
| `tsup` | ^8.4 | Bundler — gera ESM, CJS e `.d.ts` em um único comando |
| `typescript` | ^5.8 | Compilador TypeScript |

### `tsup.config.ts`

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],   // gera index.js (ESM) e index.cjs (CJS)
  dts: true,                // gera index.d.ts e index.d.cts
  clean: true,              // limpa dist/ antes de cada build
  sourcemap: true,
});
```

### `package.json` — campos de exports

```json
{
  "type": "module",
  "main":   "./dist/index.cjs",
  "module": "./dist/index.js",
  "types":  "./dist/index.d.ts",
  "exports": {
    ".": {
      "types":   "./dist/index.d.ts",
      "import":  "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

- `"type": "module"` — arquivos `.js` são tratados como ESM; CJS usa extensão `.cjs`
- `"types"` vem **antes** de `"import"`/`"require"` no `exports` — exigido pelo TypeScript para resolução correta
- `moduleResolution: "bundler"` no `tsconfig.json` — compatível com tsup e TypeScript 5

---

## 4. Instalação

### Opção A — dentro do monorepo (workspace)

O `pnpm-workspace.yaml` na raiz já declara `janus-sdk` como workspace:

```yaml
packages:
  - 'institucional-mavellium'
  - 'packages/*'
  - 'janus-sdk'
```

Adicione a dependência no projeto consumidor:

```bash
# Na raiz do monorepo
pnpm add janus-sdk --filter institucional-mavellium --workspace
```

Ou edite manualmente o `package.json` do projeto:

```json
{
  "dependencies": {
    "janus-sdk": "workspace:*"
  }
}
```

Depois instale na raiz:

```bash
pnpm install
```

O pnpm cria um symlink em `institucional-mavellium/node_modules/janus-sdk` → `janus-sdk/dist/`. Nenhuma publicação no npm é necessária.

> **Atenção:** o symlink aponta para `dist/`. Sempre rode `pnpm build` no SDK antes de usar, ou deixe o watch ativo durante o desenvolvimento.

### Opção B — projeto externo via pnpm link

Use quando o projeto consumidor está **fora** do monorepo.

**Passo 1 — registrar o link global (uma única vez)**

```bash
cd janus-sdk
pnpm build
pnpm link --global
```

Saída esperada:
```
C:\Users\...\pnpm\global\5:
+ janus-sdk 0.1.0 <- ...\MONOREPO\janus-sdk
```

**Passo 2 — conectar ao projeto externo**

```bash
cd /caminho/do/seu-projeto
pnpm link --global janus-sdk
```

A partir daqui, `import { JanusClient } from "janus-sdk"` funciona normalmente no projeto externo, e qualquer rebuild do SDK (`pnpm build`) reflete imediatamente sem precisar re-linkar.

**Desfazer o link**

```bash
# No projeto externo
pnpm unlink janus-sdk

# Para remover o registro global (opcional)
cd janus-sdk
pnpm unlink --global
```

### Opção C — npm/pnpm publish (produção)

Quando o SDK estiver estável e você quiser distribuí-lo:

```bash
cd janus-sdk
pnpm build
pnpm publish --access public
# ou para escopo privado/organização:
pnpm publish
```

Projetos externos instalam normalmente:

```bash
npm i janus-sdk
```

---

## 5. Inicialização do cliente

```ts
import { JanusClient } from "janus-sdk";

const client = new JanusClient({
  baseUrl:  "https://cms.exemplo.com.br", // URL base do Janus
  tenantId: "minha-empresa",              // companySlug registrado no Janus
});
```

### Configuração completa

```ts
export interface JanusClientConfig {
  baseUrl:     string;        // obrigatório
  tenantId:    string;        // obrigatório
  defaultInit?: RequestInit;  // opcional — mesclado em todos os fetches
}
```

### Com Next.js App Router (ISR)

Crie uma instância singleton em `lib/janus.ts` e reutilize em todo o projeto:

```ts
// src/lib/janus.ts
import { JanusClient } from "janus-sdk";

export const janus = new JanusClient({
  baseUrl:     process.env.JANUS_URL!,
  tenantId:    process.env.JANUS_TENANT_ID!,
  defaultInit: {
    next: { revalidate: 60 }, // revalida todas as rotas a cada 60 s (ISR)
  } as RequestInit,
});
```

O `defaultInit` é mesclado com `{ ...defaultInit, ...init }` em cada chamada — métodos individuais podem sobrescrever com seus próprios `init` se necessário.

### Com Node.js puro

```ts
import { JanusClient } from "janus-sdk";

const client = new JanusClient({
  baseUrl:  "https://cms.exemplo.com.br",
  tenantId: "minha-empresa",
});

const posts = await client.getPosts();
console.log(posts);
```

---

## 6. Métodos de blog

Todos os métodos de blog comunicam com o endpoint:
```
GET /api/{tenantId}/blog/...
```

### `getPosts(opts?)`

Retorna posts publicados. Sempre resolve — retorna `[]` em qualquer erro.

```ts
// Todos os posts
const posts = await janus.getPosts();

// Com filtros
const featured   = await janus.getPosts({ featured: true });
const categoria  = await janus.getPosts({ categoryId: "abc123" });
const paginado   = await janus.getPosts({ limit: 6 });
```

```ts
interface GetPostsOptions {
  categoryId?: string;
  featured?:   boolean;
  limit?:      number;   // padrão: 50
}
```

**Uso em Next.js — listagem de posts:**

```tsx
// app/blog/page.tsx
import { janus } from "@/lib/janus";

export default async function BlogPage() {
  const posts = await janus.getPosts();

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.slug}>
          <a href={`/blog/${post.slug}`}>{post.title}</a>
        </li>
      ))}
    </ul>
  );
}
```

---

### `getPost(slug)`

Retorna um post pelo slug ou `null` se não encontrado. Em caso de erro HTTP no endpoint de lista, também retorna `null` — chame `notFound()` após verificar.

> O Janus não expõe `GET /posts/:slug`. O SDK busca a lista paginada (limit 100) e filtra client-side.

```ts
const post = await janus.getPost("meu-artigo");
// Post | null
```

**Uso em Next.js — página de post:**

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import { janus } from "@/lib/janus";
import { processHtmlBody } from "janus-sdk";

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await janus.getPost(params.slug);
  if (!post) notFound();

  const { processedHtml, headings } = processHtmlBody(post.htmlBody);

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
    </article>
  );
}
```

---

### `getPostSlugs()`

Retorna todos os slugs de posts publicados. Sempre resolve — retorna `[]` em erro. Ideal para `generateStaticParams`.

```ts
const slugs = await janus.getPostSlugs();
// string[]
```

**Uso em Next.js — geração estática:**

```ts
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const slugs = await janus.getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}
```

---

### `getRelatedPosts(categoryId, excludeSlug)`

Retorna até 3 posts da mesma categoria, excluindo o slug informado. Sempre resolve — retorna `[]` em erro.

```ts
const related = await janus.getRelatedPosts(post.category.id, post.slug);
// Post[]  (máximo 3 itens)
```

---

### `getCategories()`

Retorna todas as categorias do tenant. Sempre resolve — retorna `[]` em erro.

```ts
const categories = await janus.getCategories();
// CmsCategory[]
```

```ts
interface CmsCategory {
  id:           string;
  name:         string;
  slug?:        string;
  description?: string;
  image?:       string;
}
```

---

## 7. Método de página headless

Comunica com o endpoint público do Janus:
```
GET /api/v1/content/{tenantId}/{pageSlug}
```

### `getPage(pageSlug)`

Retorna uma página publicada ou `null` se não encontrada (404). Re-lança `JanusAPIError` em erros de servidor (5xx).

```ts
const page = await janus.getPage("home");
// JanusPage | null
```

```ts
interface JanusPage {
  slug:      string;
  name:      string;
  schema:    unknown;  // schema de campos definido pelo developer
  content:   unknown;  // dados preenchidos pelo cliente
  updatedAt: string;
}
```

**Uso em Next.js:**

```tsx
// app/[slug]/page.tsx
import { notFound } from "next/navigation";
import { janus, JanusAPIError } from "@/lib/janus";

export default async function DynamicPage({ params }: { params: { slug: string } }) {
  const page = await janus.getPage(params.slug);
  if (!page) notFound(); // 404 ou página não publicada

  // O schema é dinâmico — fazer cast para o tipo esperado
  const content = page.content as { hero_title: string; hero_subtitle: string };

  return (
    <main>
      <h1>{content.hero_title}</h1>
      <p>{content.hero_subtitle}</p>
    </main>
  );
}
```

---

## 8. Funções utilitárias

Exportadas como funções puras — não dependem do `JanusClient`.

### `processHtmlBody(html)`

Injeta atributos `id` únicos em todas as tags `<h2>` e `<h3>` do HTML, e retorna a lista de headings para construção de Sumário (ToC).

```ts
import { processHtmlBody } from "janus-sdk";

const { processedHtml, headings } = processHtmlBody(post.htmlBody);

// headings: TocHeading[]
// [
//   { id: "introducao", text: "Introdução", level: 2 },
//   { id: "configuracao", text: "Configuração", level: 3 },
// ]
```

**Exemplo de ToC com React:**

```tsx
function TableOfContents({ headings }: { headings: TocHeading[] }) {
  return (
    <nav>
      <ul>
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: h.level === 3 ? "1rem" : 0 }}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

---

### `getCategoryColor(name)`

Retorna um bundle de classes Tailwind CSS para uma categoria, determinístico pelo nome (mesmo nome → sempre mesma cor).

```ts
import { getCategoryColor } from "janus-sdk";

const color = getCategoryColor("Inteligência Artificial");
// { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" }
```

**Exemplo de badge de categoria:**

```tsx
function CategoryBadge({ name }: { name: string }) {
  const { bg, text, border, dot } = getCategoryColor(name);
  return (
    <span className={`${bg} ${text} ${border} border rounded-full px-2 py-0.5 text-xs flex items-center gap-1`}>
      <span className={`${dot} w-1.5 h-1.5 rounded-full`} />
      {name}
    </span>
  );
}
```

Paleta disponível (6 cores, seleção por hash do nome):

| Cor | bg | text | border | dot |
|---|---|---|---|---|
| Azul | `bg-blue-50` | `text-blue-700` | `border-blue-200` | `bg-blue-500` |
| Roxo | `bg-purple-50` | `text-purple-700` | `border-purple-200` | `bg-purple-500` |
| Verde | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` | `bg-emerald-500` |
| Laranja | `bg-orange-50` | `text-orange-700` | `border-orange-200` | `bg-orange-500` |
| Rosa | `bg-rose-50` | `text-rose-700` | `border-rose-200` | `bg-rose-500` |
| Âmbar | `bg-amber-50` | `text-amber-700` | `border-amber-200` | `bg-amber-500` |

---

### `formatDate(isoDate)`

Formata uma string ISO 8601 para português brasileiro.

```ts
import { formatDate } from "janus-sdk";

formatDate("2026-05-17T00:00:00.000Z"); // "17 de maio de 2026"
formatDate("2026-01-01T00:00:00.000Z"); // "1 de janeiro de 2026"
```

---

## 9. Tratamento de erros

### Como o `fetchJson` interno funciona

O método privado `fetchJson` tem dois níveis de falha com comportamentos distintos:

```
fetchJson(path)
    │
    ├── fetch() lança exceção (sem rede, DNS, timeout)
    │       └── retorna null  ← graceful, não quebra o build
    │
    ├── res.ok === false (HTTP 4xx / 5xx)
    │       └── throw new JanusAPIError(status, statusText, url)  ← tipado
    │
    └── res.json() lança exceção (JSON malformado)
            └── retorna null  ← graceful
```

### Semântica por método público

| Método | Erro de rede | HTTP 404 | HTTP 5xx |
|---|---|---|---|
| `getPosts` | `[]` | `[]` | `[]` |
| `getPostSlugs` | `[]` | `[]` | `[]` |
| `getRelatedPosts` | `[]` | `[]` | `[]` |
| `getCategories` | `[]` | `[]` | `[]` |
| `getPost` | `null` | `null` | `null` |
| `getPage` | `null` | `null` | **lança `JanusAPIError`** |

**Por que `getPage` re-lança em 5xx?**

`getPage` alimenta páginas renderizadas via Server Component. Um erro 500 do Janus deve acionar o `error.tsx` do Next.js (exibir mensagem de erro) — não retornar `null` silenciosamente e exibir uma página em branco.

### `JanusAPIError`

```ts
export class JanusAPIError extends Error {
  readonly status: number;  // código HTTP (ex: 404, 500, 503)
  readonly url:    string;  // URL completa que falhou
}
```

**Capturando manualmente em Next.js:**

```tsx
import { JanusAPIError } from "janus-sdk";
import { notFound } from "next/navigation";

export default async function Page({ params }) {
  let page;
  try {
    page = await janus.getPage(params.slug);
  } catch (err) {
    if (err instanceof JanusAPIError) {
      console.error(`Janus ${err.status} em ${err.url}`);
      // 5xx → deixa o Next.js renderizar o error.tsx
    }
    throw err;
  }

  if (!page) notFound(); // 404
  // ...
}
```

**Criando um `error.tsx` para capturar `JanusAPIError`:**

```tsx
// app/error.tsx
"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Algo deu errado ao carregar o conteúdo.</h2>
      <button onClick={reset}>Tentar novamente</button>
    </div>
  );
}
```

---

## 10. Tipos TypeScript

Todos os tipos são exportados do pacote e podem ser importados explicitamente:

```ts
import type {
  // Configuração
  JanusClientConfig,

  // Tipos normalizados (use estes nos componentes)
  Post,
  JanusPage,
  TocHeading,
  CategoryColor,
  GetPostsOptions,

  // Tipos raw da API (use se precisar trabalhar com a resposta bruta)
  CmsPost,
  CmsCategory,
  CmsTag,
  CmsAuthor,
  CmsPostsResponse,
} from "janus-sdk";
```

### Tipo `Post` (normalizado)

```ts
interface Post {
  slug:               string;
  title:              string;
  subtitle?:          string;
  description:        string;           // excerpt ou subtitle ou title
  category:           { id: string; name: string; slug: string };
  coverImage:         string;           // URL da imagem ou fallback Unsplash
  publishedAt:        string;           // ISO 8601
  readingTimeMinutes: number;           // padrão: 5
  author:             {
    name:             string;
    avatarInitials:   string;           // ex: "JD" para "John Doe"
    avatarColor:      string;           // classe Tailwind determinística
  };
  htmlBody:           string;           // HTML do corpo — use processHtmlBody() para ToC
  featured:           boolean;
  tags:               Array<{ name: string; slug: string }>;
}
```

### Tipo `JanusPage` (headless)

```ts
interface JanusPage {
  slug:      string;
  name:      string;
  schema:    unknown;  // cast para o tipo do seu projeto
  content:   unknown;  // cast para o tipo do seu projeto
  updatedAt: string;
}
```

`schema` e `content` são `unknown` intencionalmente — o schema é definido pelo developer no builder do Janus e varia por empresa/projeto. Faça o cast no consumidor:

```ts
const page = await janus.getPage("home");
const content = page?.content as {
  hero_title:    string;
  hero_subtitle: string;
  cta_label:     string;
};
```

---

## 11. Workflow de desenvolvimento

### Desenvolvimento no monorepo

```bash
# Terminal 1 — SDK em watch mode (rebuild automático em cada mudança)
cd janus-sdk
pnpm dev

# Terminal 2 — site institucional
cd institucional-mavellium
pnpm dev
```

Mudanças em `janus-sdk/src/` são compiladas automaticamente pelo tsup e refletem imediatamente no site (o Next.js recarrega o módulo no próximo request).

### Testando alterações no SDK

Smoke test direto sem framework:

```bash
cd janus-sdk
node -e "
const { JanusClient } = require('./dist/index.cjs');
const c = new JanusClient({ baseUrl: 'https://cms.mavellium.com', tenantId: 'mavellium' });
c.getPosts().then(posts => console.log('posts:', posts.length));
c.getCategories().then(cats => console.log('cats:', cats.length));
"
```

Verificar todos os exports:

```bash
node -e "const s = require('./dist/index.cjs'); console.log(Object.keys(s))"
# ['JanusAPIError', 'JanusClient', 'formatDate', 'getCategoryColor', 'processHtmlBody']
```

### Publicando uma nova versão

```bash
cd janus-sdk

# 1. Atualizar a versão no package.json
#    patch: 0.1.0 → 0.1.1  (bugfix)
#    minor: 0.1.0 → 0.2.0  (nova funcionalidade compatível)
#    major: 0.1.0 → 1.0.0  (breaking change)
pnpm version patch   # ou minor / major

# 2. Build
pnpm build

# 3. Publicar
pnpm publish
```

---

## 12. Referência de comandos

| Comando | Executar em | Descrição |
|---|---|---|
| `pnpm build` | `janus-sdk/` | Build único (ESM + CJS + tipos) |
| `pnpm dev` | `janus-sdk/` | Watch mode — rebuild em cada mudança |
| `pnpm typecheck` | `janus-sdk/` | `tsc --noEmit` — valida tipos sem gerar arquivos |
| `pnpm link --global` | `janus-sdk/` | Registra link global para projetos externos |
| `pnpm link --global janus-sdk` | projeto externo | Conecta ao link global |
| `pnpm unlink janus-sdk` | projeto externo | Remove o link |
| `pnpm add janus-sdk --filter X --workspace` | raiz do monorepo | Adiciona como dep workspace no projeto X |
| `pnpm install` | raiz do monorepo | Sincroniza todos os workspaces |
| `pnpm version patch` | `janus-sdk/` | Incrementa versão patch |
| `pnpm publish` | `janus-sdk/` | Publica no registry npm |
