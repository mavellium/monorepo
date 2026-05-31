# Arquitetura do Ecossistema Mavellium

> Documento atualizado em 2026-05-17 (revisão 2) a partir da leitura direta dos arquivos do repositório.

---

## 1. Visão Geral

O ecossistema Mavellium é composto por dois projetos Next.js independentes que operam em simbiose:

| Projeto | Papel | Repositório |
|---|---|---|
| **institucional-mavellium** | Site público da Mavellium (marketing, blog, eventos) | Standalone |
| **Janus** | CMS headless + plataforma de gerenciamento de conteúdo para clientes | Standalone |

A relação entre os dois é cliente/servidor: o `institucional-mavellium` consome a API pública do `Janus` para renderizar o blog. O `Janus` é o backend de conteúdo; o site institucional é o frontend consumidor.

```
┌────────────────────────────────────────────────────────────────────────┐
│                         MONOREPO (c:\temp\MONOREPO)                    │
│                                                                         │
│  ┌──────────────────────────┐      HTTP/REST API       ┌─────────────┐ │
│  │  institucional-mavellium │ ─────────────────────── ▶│    Janus    │ │
│  │   (Site Público)         │  GET /api/v1/content/..  │  (CMS)      │ │
│  │   Next.js 16 · React 19  │  GET /api/{id}/blog/...  │  Next.js 16 │ │
│  └──────────────────────────┘                          └──────┬──────┘ │
│            │                                                  │        │
│            │ pg (pool direto)                    Prisma ORM   │        │
│            ▼                                                  ▼        │
│      ┌───────────┐                                    ┌───────────┐   │
│      │ PostgreSQL │                                    │ PostgreSQL│   │
│      │  (fitec)  │                                    │  (prisma) │   │
│      └───────────┘                                    └───────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Topologia do Monorepo

Este repositório **não utiliza pnpm workspaces com pacotes compartilhados**. Cada projeto é completamente autônomo — possui seu próprio `package.json`, `node_modules`, `tsconfig.json`, e repositório git (`.git/`). A pasta raiz é apenas um contêiner de organização.

```
c:\temp\MONOREPO\
├── docs\architecture.md               ← este documento
│
├── institucional-mavellium\           ← APP: Site público Mavellium
│   ├── package.json                   (name: "mavellium-itc")
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── pnpm-workspace.yaml            (somente ignoredBuiltDependencies)
│   ├── CLAUDE.md → @AGENTS.md
│   ├── AGENTS.md
│   ├── public\
│   │   ├── logo-mavellium-header.svg
│   │   └── imagem-1..5.png
│   └── src\
│       ├── app\
│       │   ├── layout.tsx
│       │   ├── page.tsx               ← Home
│       │   ├── api\
│       │   │   └── fitec-register\
│       │   │       └── route.ts       ← POST: lead capture FITEC
│       │   ├── blog\
│       │   │   ├── page.tsx           ← Listagem de posts
│       │   │   └── [slug]\
│       │   │       └── page.tsx       ← Post individual
│       │   └── fitec-2026\
│       │       └── page.tsx           ← Landing do evento
│       ├── components\
│       │   ├── Header\
│       │   └── ui\                    ← ~25 componentes visuais
│       └── lib\
│           ├── blog-api.ts            ← Client da API Janus/CMS
│           ├── blog.ts
│           ├── db.ts                  ← Pool pg para fitec_visitors
│           ├── fitec-api.ts
│           ├── portfolio.ts
│           ├── constants.ts
│           └── utils.ts
│
└── Janus\                             ← APP: CMS Headless + Dashboard
    ├── package.json                   (name: "janus")
    ├── tsconfig.json
    ├── next.config.ts
    ├── .env.example
    ├── pnpm-workspace.yaml            (somente ignoredBuiltDependencies)
    ├── CLAUDE.md
    ├── prisma\
    │   └── schema.prisma              ← Modelos: Company, User, Project, Page, Blog*, Guest*, ProjectHistory, LoginAttempt
    ├── scripts\
    │   ├── test-db-connection.ts
    │   └── seed-test-user.ts
    ├── docs\postman\
    ├── .github\workflows\
    │   └── deploy.yml                 ← CI/CD: push main → deploy Hostinger via SSH
    ├── public\
    │   ├── janus-logo.svg
    │   └── logo-min.svg
    └── src\
        ├── middleware.ts              ← Auth guard global (NextAuth)
        ├── app\
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── (auth)\login\          ← Rota pública de login
        │   ├── [companySlug]\
        │   │   ├── welcome\page.tsx   ← Registro público de convidados (Guest Mode)
        │   │   ├── guest\             ← Galeria pública de posts de convidados
        │   │   │   ├── page.tsx
        │   │   │   ├── layout.tsx
        │   │   │   ├── GuestGalleryClient.tsx
        │   │   │   ├── NewPostModal.tsx
        │   │   │   ├── EditPostModal.tsx
        │   │   │   └── DeletePostButton.tsx
        │   │   └── dashboard\         ← Dashboard do cliente (por empresa)
        │   │       ├── sites\
        │   │       │   └── [siteId]\
        │   │       │       ├── layout.tsx
        │   │       │       ├── analytics\page.tsx
        │   │       │       ├── pages\
        │   │       │       │   ├── page.tsx
        │   │       │       │   └── [pageId]\{edit,builder}\page.tsx
        │   │       │       └── blog\  ← Blog por site
        │   │       │           ├── page.tsx   ← visão geral
        │   │       │           ├── posts\{page,new,[postId]\edit}\
        │   │       │           ├── categories\page.tsx
        │   │       │           └── tags\page.tsx
        │   │       ├── landing-pages\
        │   │       │   └── [lpId]\
        │   │       │       ├── layout.tsx
        │   │       │       ├── analytics\page.tsx
        │   │       │       ├── pages\
        │   │       │       │   ├── page.tsx
        │   │       │       │   └── [pageId]\{edit,builder}\page.tsx
        │   │       │       └── blog\  ← Blog por landing page
        │   │       │           ├── page.tsx   ← visão geral
        │   │       │           ├── posts\{page,new,[postId]\edit}\
        │   │       │           ├── categories\page.tsx
        │   │       │           └── tags\page.tsx
        │   │       └── settings\
        │   ├── preview\[pageId]\       ← Preview isolado de página
        │   ├── dashboard-admin\        ← Painel super-admin Mavellium
        │   │   ├── companies\
        │   │   │   └── [companyId]\guests\  ← Convidados por empresa
        │   │   ├── guests\             ← Lista global de convidados
        │   │   │   └── [guestId]\posts\
        │   │   ├── developers\
        │   │   ├── logs\
        │   │   └── users\
        │   ├── dev\[devId]\dashboard\ ← Painel developer
        │   │   ├── layout.tsx
        │   │   ├── page.tsx
        │   │   ├── settings\page.tsx
        │   │   ├── companies\page.tsx
        │   │   └── users\page.tsx
        │   ├── first-access\          ← Fluxo de primeiro acesso
        │   └── api\
        │       ├── auth\[...nextauth]\ ← NextAuth handler
        │       ├── upload\route.ts     ← Upload de imagens e vídeos → BunnyCDN
        │       ├── impersonate\route.ts       ← Impersonation de usuário DEFAULT
        │       ├── impersonate-dev\route.ts   ← Impersonation de DEVELOPER
        │       ├── guest\signout\route.ts  ← Logout de convidado
        │       ├── dev\companies\[companyId]\projects\route.ts
        │       ├── projects\[projectId]\blog-enabled\route.ts
        │       ├── v1\admin\guests\route.ts  ← Admin: lista convidados
        │       └── v1\content\
        │           └── [companySlug]\[pageSlug]\route.ts  ← API pública headless
        ├── components\
        │   ├── ui\                    ← shadcn/ui (avatar, button, dialog…)
        │   ├── auth\LoginForm.tsx
        │   ├── dashboard\
        │   │   ├── Sidebar.tsx
        │   │   ├── MobileNav.tsx          ← Navegação drawer para mobile
        │   │   ├── ImpersonationBanner.tsx ← Toggle "Simular Visão do Usuário"
        │   │   ├── UserPermissionsModal.tsx ← Editar permissões de usuário DEFAULT
        │   │   └── DevPermissionsModal.tsx  ← Editar permissões ao impersonar DEVELOPER
        │   ├── admin\AdminSidebar.tsx
        │   ├── dev\
        │   │   ├── DevSidebar.tsx
        │   │   └── ProjectsBlogModal.tsx  ← Modal de blog no painel developer
        │   ├── projects\              ← Modais CRUD de projetos/páginas
        │   ├── schema-builder\        ← Editor Monaco + DynamicForm + IframePreview
        │   ├── blog\                  ← RichEditor (Tiptap), CategoryModal, TagModal…
        │   ├── guests\                ← GuestWelcomeForm, GuestSidebar
        │   └── ui\
        │       └── SlugInput.tsx      ← Input com validação de slug em tempo real
        ├── hooks\
        │   └── use-toast.ts
        ├── lib\
        │   ├── auth.ts                ← Config NextAuth
        │   ├── auth.config.ts
        │   ├── auth\permissions.ts    ← Constantes e utilitários RBAC
        │   ├── prisma.ts              ← Singleton Prisma client
        │   ├── slug.ts                ← Geração de slugs
        │   ├── validations\password.ts
        │   └── utils.ts
        ├── modules\                   ← Clean Architecture: lógica de negócio
        │   ├── admin\{actions,queries}
        │   │   ├── actions\adminCreate/Edit/DeleteCompany.ts
        │   │   ├── actions\adminCreate/Edit/DeleteUser.ts
        │   │   ├── actions\createDeveloper.ts
        │   │   ├── actions\updateUserPermissions.ts  ← Atualiza permissions[] de um usuário
        │   │   ├── actions\updateProjectBlogEnabled.ts
        │   │   ├── actions\deleteGuestAsAdmin.ts
        │   │   ├── actions\deleteGuestPostAsAdmin.ts
        │   │   ├── actions\updateGuestAsAdmin.ts
        │   │   ├── actions\updateGuestPostAsAdmin.ts
        │   │   ├── actions\toggleGuestMode.ts
        │   │   └── actions\unblockIp.ts
        │   ├── auth\
        │   │   ├── actions\checkIpStatus.ts
        │   │   ├── actions\toggleViewMode.ts    ← Cookie janus_view_mode (simular DEFAULT)
        │   │   ├── actions\viewAsDeveloper.ts   ← Simular perspectiva de DEVELOPER
        │   │   ├── queries\getUserPermissions.ts
        │   │   ├── queries\getImpersonatedUserPermissions.ts
        │   │   └── queries\getImpersonatedDevPermissions.ts
        │   ├── blog\{actions,queries}           ← CRUD de posts, categorias, tags
        │   ├── dev\{actions,queries}
        │   ├── guests\
        │   │   ├── actions\registerGuest.ts
        │   │   ├── actions\confirmExistingGuest.ts
        │   │   ├── actions\createGuestPost.ts
        │   │   ├── actions\deleteGuestPost.ts
        │   │   └── actions\updateGuestPost.ts
        │   ├── projects\{actions,queries}
        │   ├── upload\actions\        ← BunnyCDN upload (imagens + vídeos)
        │   └── users\{actions,queries,domain}
        ├── test\
        │   ├── setup.ts
        │   └── create-test-user.spec.ts
        └── types\next-auth.d.ts
```

---

## 3. Mapeamento de Projetos

### 3.1 institucional-mavellium

**Responsabilidade principal:** Site público e institucional da Mavellium. Exibe o portfólio, blog corporativo (consumido do Janus), landing page do evento FITEC-2026, pricing e seção de contato.

#### Stack Técnica

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js | 16.2.1 |
| Runtime UI | React + React DOM | 19.2.4 |
| Linguagem | TypeScript | ^5 |
| Estilização | Tailwind CSS | ^4 |
| Componentes | shadcn/ui, Radix UI | — |
| Animações | Framer Motion / Motion | ^12.38 |
| Carrossel | Embla Carousel | ^8.6 |
| Ícones | HugeIcons, Iconify, Lucide, Radix Icons | — |
| Shaders | @paper-design/shaders-react | ^0.0.72 |
| Banco (direto) | pg (Pool) | ^8.20 |
| Linting | ESLint + eslint-config-next | ^9 |

#### Dependências Core (package.json)

```json
"next": "16.2.1",
"react": "19.2.4",
"react-dom": "19.2.4",
"framer-motion": "^12.38.0",
"motion": "^12.38.0",
"embla-carousel-react": "^8.6.0",
"@paper-design/shaders-react": "^0.0.72",
"pg": "^8.20.0",
"tailwind-merge": "^3.5.0",
"class-variance-authority": "^0.7.1",
"clsx": "^2.1.1"
```

#### Variáveis de Ambiente

Não há `.env.example`. As variáveis são inferidas do código-fonte:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Connection string PostgreSQL (pool `pg` para tabela `fitec_visitors`) |
| `BLOG_API_URL` | Sim | URL base do Janus (ex: `https://cms.mavellium.com`) |
| `BLOG_SUBTYPE_ID` | Sim | ID do subtype/tenant no Janus para o blog |

#### Imagens Remotas Permitidas (next.config.ts)

- `images.unsplash.com`
- `me7aitdbxq.ufs.sh`
- `images.pexels.com`
- `assets.mixkit.co`
- `tegbe-cdn.b-cdn.net` (BunnyCDN Janus)

#### Porta padrão

```
http://localhost:3000
```

---

### 3.2 Janus

**Responsabilidade principal:** Plataforma SaaS multi-tenant de gerenciamento de conteúdo (CMS headless). Permite que empresas (clientes Mavellium) criem e publiquem Sites e Landing Pages com blog integrado. Também oferece um sistema de Guest Mode para coleta pública de depoimentos/mídia. Expõe uma API pública que entrega o conteúdo publicado para consumo por sites externos.

#### Stack Técnica

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js | 16.2.4 |
| Runtime UI | React + React DOM | 19.2.4 |
| Linguagem | TypeScript | ^5 |
| Estilização | Tailwind CSS | ^3.4.17 |
| ORM | Prisma | ^7.8.0 |
| Banco | PostgreSQL (via `@prisma/adapter-pg` + `pg`) | — |
| Autenticação | NextAuth v5 (beta.31) + @auth/prisma-adapter | — |
| Criptografia | bcryptjs | ^3.0.3 |
| Validação | Zod | ^4.4.3 |
| Componentes | shadcn/ui, Radix UI | — |
| Editor de Código | Monaco Editor (@monaco-editor/react) | ^4.7.0 |
| Editor Rich Text | Tiptap | ^3.23.2 |
| Drag-and-Drop | @dnd-kit (core, sortable, utilities) | — |
| Storage CDN | BunnyCDN (via HTTP nativo) | — |
| Testes | Vitest + @testing-library/react | ^4.1.5 |
| Ícones | Lucide React | ^1.14.0 |
| UUIDs | uuid | ^14.0.0 |
| Build | standalone output (Docker ready) | — |

#### Dependências Core (package.json)

```json
"next": "16.2.4",
"react": "19.2.4",
"@prisma/client": "^7.8.0",
"@prisma/adapter-pg": "^7.8.0",
"next-auth": "5.0.0-beta.31",
"@auth/prisma-adapter": "^2.11.2",
"zod": "^4.4.3",
"bcryptjs": "^3.0.3",
"uuid": "^14.0.0",
"@monaco-editor/react": "^4.7.0",
"@tiptap/react": "^3.23.2",
"@tiptap/starter-kit": "^3.23.2",
"@tiptap/extension-image": "^3.23.2",
"@tiptap/extension-link": "^3.23.2",
"@tiptap/extension-placeholder": "^3.23.2",
"@tiptap/extension-text-align": "^3.23.2",
"@tiptap/extension-underline": "^3.23.2",
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^10.0.0",
"sharp": "^0.34.5"
```

#### Variáveis de Ambiente (.env.example)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Connection string Prisma Postgres (`prisma+postgres://...`) |
| `AUTH_SECRET` | Sim | Segredo JWT NextAuth — gerar com `openssl rand -base64 32` |
| `BUNNY_STORAGE_ZONE` | Sim | Nome da storage zone no BunnyCDN (ex: `janus`) |
| `BUNNY_ACCESS_KEY` | Sim | API key de acesso ao BunnyCDN |
| `BUNNY_HOST` | Sim | Endpoint de upload (ex: `br.storage.bunnycdn.com`) |
| `BUNNY_PULL_ZONE` | Sim | Domínio público de entrega de mídia (ex: `tegbe-cdn.b-cdn.net`) |

#### Porta padrão

```
http://localhost:3000
```

#### Modelo de Dados (Prisma Schema)

```
Company (multi-tenant)
├── id: UUID PK
├── slug: String UNIQUE          ← chave de roteamento (/[companySlug])
├── name, description, logo
├── guestModeEnabled: Boolean @default(false)  ← habilita Guest Mode
└── users[], projects[], guestEntries[]

User
├── id: UUID PK
├── email: String UNIQUE
├── password: String (bcrypt)
├── role: ADMIN | DEFAULT | DEVELOPER
├── permissions: String[]        ← RBAC granular (ex: PAGE_CREATE, BLOG_MANAGE)
├── preferences: Json
├── requiresPasswordReset: Boolean
└── companyId: FK → Company

Project
├── id: UUID PK
├── type: LANDING_PAGE | INSTITUTIONAL
├── blogEnabled: Boolean @default(false)
├── companyId: FK → Company
└── pages[], blogCategories[], blogTags[], blogPosts[]

Page
├── id: UUID PK
├── slug: String
├── content: Json              ← estrutura interna do builder
├── schemaData: Json           ← schema de campos editáveis
├── contentData: Json          ← dados de conteúdo preenchidos
├── isPublished: Boolean
└── projectId: FK → Project

BlogCategory
├── id: UUID PK
├── name, description, imageUrl, slug
├── projectId: FK → Project (CASCADE)
└── posts: BlogPost[]

BlogTag
├── id: UUID PK
├── name, description, imageUrl, slug
├── projectId: FK → Project (CASCADE)
└── posts: BlogPostTag[]

BlogPost
├── id: UUID PK
├── title, subtitle, body (rich text), coverImageUrl, authorName
├── publishedAt, seoTitle, seoDescription, seoKeywords
├── projectId: FK → Project (CASCADE)
├── categoryId: FK → BlogCategory
└── tags: BlogPostTag[]

BlogPostTag (M:N join)
├── postId: FK → BlogPost (CASCADE)
└── tagId: FK → BlogTag (CASCADE)

GuestEntry
├── id: UUID PK
├── name: String
├── email: String
├── companyId: FK → Company (CASCADE)
└── posts: GuestPost[]

GuestPost
├── id: UUID PK
├── message: String
├── imageUrl: String
├── mediaType: String @default("IMAGE")   ← "IMAGE" | "VIDEO"
├── guestId: FK → GuestEntry (CASCADE)
└── createdAt, updatedAt

ProjectHistory               ← audit trail (versionamento)
LoginAttempt                 ← log de tentativas + controle de IP
```

#### Roles de Usuário

| Role | Acesso |
|---|---|
| `ADMIN` | `dashboard-admin/` — painel super-admin Mavellium |
| `DEVELOPER` | `dev/[devId]/dashboard/` — painel developer (cria empresas/usuários) |
| `DEFAULT` | `[companySlug]/dashboard/` — dashboard da empresa |

**RBAC Granular (permissions array):**

| Permissão | Descrição |
|---|---|
| `PAGE_CREATE` | Criar novas páginas |
| `PAGE_DELETE` | Excluir páginas |
| `PAGE_BUILD` | Acessar o schema builder |
| `BLOG_MANAGE` | Gerenciar posts, categorias e tags |
| `GUEST_MANAGE` | Gerenciar entradas de convidados |
| `TEAM_MANAGE` | Gerenciar membros da equipe |

- `ADMIN` e `DEVELOPER` recebem `ALL_PERMISSIONS` por padrão.
- Usuários `DEFAULT` recebem `[]` por padrão (permissões configuradas pelo admin via `PermissionsModal`).
- Admins e desenvolvedores podem ativar o modo de impersonação via cookie HTTP-only `janus_view_mode` para simular a visão de um usuário `DEFAULT`.

#### CI/CD

- **Pipeline:** GitHub Actions (`.github/workflows/deploy.yml`)
- **Trigger:** Push na branch `main`
- **Processo:** SSH na VPS Hostinger → `git pull` → `docker compose down && docker compose up -d --build`
- **Output:** `standalone` (Next.js) — pronto para containerização

---

## 4. Fluxo de Integração

### 4.1 Blog: institucional-mavellium → Janus

O blog do site institucional é headless: os posts vivem no Janus e são entregues via API REST pública.

```
institucional-mavellium              Janus CMS
src/lib/blog-api.ts
        │
        │  GET ${BLOG_API_URL}/api/${BLOG_SUBTYPE_ID}/blog/posts?status=PUBLISHED
        │  GET ${BLOG_API_URL}/api/${BLOG_SUBTYPE_ID}/blog/categories
        │
        └─────────────────────────────────────────────────────▶
                                                    rota interna Janus
                                                    (não mapeada como App Router —
                                                     provável rota legada ou
                                                     serviço separado)
```

- Revalidação: `{ next: { revalidate: 60 } }` — ISR de 60 segundos
- Fallback graceful: se `BLOG_API_URL` ou `BLOG_SUBTYPE_ID` estiverem ausentes, todas as funções retornam `[]` / `null` sem lançar erro

### 4.2 API Headless Pública do Janus

O endpoint público entrega conteúdo de páginas publicadas para consumo por qualquer cliente externo:

```
GET /api/v1/content/:companySlug/:pageSlug
```

**Response (200):**
```json
{
  "slug": "home",
  "name": "Página Inicial",
  "schema": { /* campos editáveis definidos pelo developer */ },
  "content": { /* dados preenchidos pelo cliente */ },
  "updatedAt": "2026-05-17T00:00:00.000Z"
}
```

- CORS: `Access-Control-Allow-Origin: *` — qualquer origem pode consumir
- Cache: `public, max-age=60, s-maxage=60` — CDN e browser cacheiam por 60s
- Autenticação: **nenhuma** — endpoint totalmente público para páginas publicadas

### 4.3 Captura de Leads FITEC (institucional-mavellium → PostgreSQL próprio)

```
Frontend FITEC-2026
        │
        │  POST /api/fitec-register
        │  { name, email, phone }
        ▼
src/app/api/fitec-register/route.ts
        │
        │  pool.query("INSERT INTO fitec_visitors ...")
        ▼
PostgreSQL (DATABASE_URL do site institucional)
tabela: fitec_visitors (id, name, email, phone, created_at)
```

### 4.4 Upload de Mídia (Janus → BunnyCDN)

```
/api/upload (route handler) ou Server Action (uploadImage/uploadMedia)
        │
        │  PUT https://{BUNNY_HOST}/{BUNNY_STORAGE_ZONE}/...
        │  headers: { AccessKey: BUNNY_ACCESS_KEY }
        │  suporte: JPEG, PNG, HEIC, MP4, MOV, WebM
        │  timeout: 600s (vídeos grandes)
        ▼
BunnyCDN Storage
        │
        │  URL pública: https://{BUNNY_PULL_ZONE}/...
        ▼
URL armazenada em User.image, Company.logo, GuestPost.imageUrl, BlogPost.coverImageUrl
```

### 4.5 Autenticação no Janus (NextAuth v5)

```
Request HTTP
     │
     ▼
middleware.ts (NextAuth.auth)   ← proteção global de todas as rotas
     │                             exceto: /api/*, /_next/static, /_next/image, favicons, .png, .jpg
     │
     ├── Não autenticado → redirect /login
     │
     └── Autenticado
          │
          ├── role: ADMIN     → acesso a /dashboard-admin/*
          ├── role: DEVELOPER → acesso a /dev/[devId]/*
          └── role: DEFAULT   → acesso a /[companySlug]/dashboard/*
                                 (ações restritas por permissions[])
```

**View Mode (Impersonation):**
```
ADMIN/DEVELOPER → ImpersonationBanner
     │
     ├── toggleViewMode() → cookie HTTP-only janus_view_mode
     │        ├── "user_mode"  → simula DEFAULT sem permissions[]
     │        └── desativado   → volta a ALL_PERMISSIONS
     │
     └── viewAsDeveloper() → /api/impersonate-dev
              ├── DevPermissionsModal  → edita permissions[] da sessão temporária
              └── getImpersonatedDevPermissions() → busca permissões simuladas
```

### 4.6 Guest Mode (Modo Convidado)

Empresas com `guestModeEnabled: true` expõem rotas públicas para coleta de depoimentos e mídia:

```
Visitante externo
     │
     ├── GET /:companySlug/welcome   → formulário de cadastro (GuestWelcomeForm)
     │        │
     │        │  registerGuest() ou confirmExistingGuest()
     │        ▼  Cria/confirma GuestEntry → cookie de sessão de convidado
     │
     └── GET /:companySlug/guest     → galeria de posts (GuestGalleryClient)
              │
              ├── NewPostModal   → createGuestPost() → upload /api/upload → BunnyCDN
              ├── EditPostModal  → updateGuestPost()
              └── DeletePostButton → deleteGuestPost()

Admin
     └── /dashboard-admin/guests/            → lista global de GuestEntry
         /dashboard-admin/guests/[guestId]/posts/ → posts do convidado
         /dashboard-admin/companies/[companyId]/guests/ → convidados por empresa
         toggleGuestMode() → alterna Company.guestModeEnabled
```

---

## 5. Workflow de Desenvolvimento

### Pré-requisitos

- Node.js ≥ 20
- pnpm (recomendado) ou npm
- PostgreSQL local ou acesso à instância remota
- Conta BunnyCDN (apenas para Janus em produção)

### 5.1 institucional-mavellium

```bash
# 1. Instalar dependências
cd institucional-mavellium
pnpm install

# 2. Configurar variáveis de ambiente
# Não há .env.example — criar manualmente:
# DATABASE_URL="postgresql://user:pass@localhost:5432/mavellium"
# BLOG_API_URL="http://localhost:3001"   # URL do Janus rodando localmente
# BLOG_SUBTYPE_ID="seu-subtype-id"

# 3. Rodar em desenvolvimento
pnpm dev
# → http://localhost:3000

# 4. Build de produção
pnpm build
pnpm start

# 5. Lint
pnpm lint
```

### 5.2 Janus

```bash
# 1. Instalar dependências
cd Janus
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Preencher: DATABASE_URL, AUTH_SECRET, BUNNY_*

# 3. Banco de dados
pnpm db:migrate          # Aplica migrations Prisma
pnpm db:seed             # Seed inicial (dados padrão)
pnpm db:seed-test        # Seed de usuário de teste
pnpm db:test-connection  # Valida conexão com o banco
pnpm db:studio           # Abre Prisma Studio na porta 5555

# 4. Rodar em desenvolvimento
pnpm dev
# → http://localhost:3000

# 5. Testes
pnpm test                # Vitest watch
pnpm test:coverage       # Cobertura com @vitest/coverage-v8

# 6. Verificações de qualidade
pnpm typecheck           # tsc --noEmit
pnpm lint                # ESLint

# 7. Build de produção
pnpm build
pnpm start

# 8. Docker (produção — Hostinger)
docker compose up -d --build
```

### 5.3 Rodando o Ecossistema Completo Localmente

Para que o blog do site institucional funcione localmente, o Janus deve estar rodando:

```bash
# Terminal 1 — Janus CMS (porta 3000)
cd Janus && pnpm dev

# Terminal 2 — Site institucional (precisa de porta diferente)
cd institucional-mavellium
PORT=3001 pnpm dev
# → http://localhost:3001

# No .env do institucional-mavellium:
# BLOG_API_URL="http://localhost:3000"
```

### 5.4 Fluxo de Deploy (Janus — Produção)

```
git push origin main
        │
        ▼
GitHub Actions (.github/workflows/deploy.yml)
        │
        │  SSH → VPS Hostinger
        │  cd /var/www/janus/Janus
        │  git pull origin main
        │  docker compose down
        │  docker compose up -d --build
        ▼
Produção (Next.js standalone + Docker)
```

O `institucional-mavellium` não possui pipeline de CI/CD configurado no repositório analisado.

---

## 6. Convenções de Código (Janus)

Definidas no `CLAUDE.md` do projeto:

- **Server Actions** (`'use server'`): exclusivas para mutações. Fluxo obrigatório: `Zod validation → Auth check → Prisma → revalidatePath()`. Retorno padronizado: `{ ok: true, data }` ou `{ ok: false, error, code? }`.
- **Queries**: leitura direta via Prisma no servidor; sempre filtrar `deletedAt: null` em entidades com soft delete.
- **Componentes**: Server Components por padrão; `'use client'` somente quando há estado, hooks ou interação de browser.
- **Formulários**: obrigatoriamente via `useActionState` do React 19.
- **Sem comentários** explicativos nos arquivos fonte.
- **Sem gambiarras** (ex: `localStorage` para controle estrutural).

---

## 7. Notas Arquiteturais

1. **Sem pacotes compartilhados**: Não existe um diretório `packages/` com código reutilizável entre os dois apps. Código duplicado (ex: utilitários `clsx`/`tailwind-merge`, componentes shadcn) é instalado separadamente em cada projeto.

2. **Tailwind divergente**: `institucional-mavellium` usa Tailwind CSS **v4** (com `@tailwindcss/postcss`); `Janus` usa Tailwind CSS **v3.4.17** (com `autoprefixer` + `postcss`). São configurações incompatíveis entre si.

3. **Prisma Client gerado localmente**: O output do Prisma Client está em `src/generated/prisma` (não em `node_modules/@prisma/client`), configurado com `engineType = "library"` para compatibilidade com o adapter `pg`.

4. **Arquivos arquivados no Janus**: O diretório `src/components/_archived_builder/` e `src/hooks/use-builder.ts` estão explicitamente excluídos do `tsconfig.json` — contêm uma versão anterior do builder drag-and-drop que foi descontinuada.

5. **Multi-tenant por slug**: O roteamento do Janus é `/:companySlug/dashboard/...`. O `companySlug` é único no banco e determina o tenant. Toda query de dados no dashboard filtra por `companySlug → companyId`.

6. **IP Blocking**: O Janus registra tentativas de login (`LoginAttempt`) e possui lógica de bloqueio de IP (`modules/auth/actions/checkIpStatus.ts`, `modules/admin/actions/unblockIp.ts`), visível no painel admin em `/dashboard-admin/logs/`.

7. **Blog por projeto**: O campo `Project.blogEnabled` controla se o blog está ativo para cada Site ou Landing Page individualmente (toggle feito pelo admin via `updateProjectBlogEnabled`). O blog é gerenciado por categorias, tags e posts com rich text (Tiptap) e campos de SEO.

8. **Guest Mode por empresa**: O modo convidado é opt-in por empresa (`Company.guestModeEnabled`). Quando ativado, expõe rotas públicas `/:companySlug/welcome` e `/:companySlug/guest` sem autenticação NextAuth. Convidados são identificados via cookie de sessão separado.

9. **RBAC híbrido**: O controle de acesso combina roles (`ADMIN`/`DEVELOPER`/`DEFAULT`) com um array de permissões granulares (`permissions: String[]`) no modelo `User`. ADMINs e DEVELOPERs têm todas as permissões; usuários DEFAULT têm apenas as que o admin conceder.

10. **Upload de vídeos**: O endpoint `/api/upload` suporta vídeos (MP4, MOV, WebM) com timeout de 600 segundos para uploads grandes. O tipo de mídia é rastreado em `GuestPost.mediaType` (`IMAGE` | `VIDEO`).

11. **Mobile-first no dashboard**: O Janus adotou layouts responsivos com `MobileNav` (drawer hambúrguer), grids com breakpoints (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) e tabelas com `overflow-x-auto`. Mínimo de 40px para alvos touch.

12. **SlugInput com validação live**: O componente `SlugInput` (`src/components/ui/SlugInput.tsx`) valida disponibilidade do slug em tempo real via debounce, integrado nos modais de criação e edição de páginas.

13. **Impersonation dupla camada**: ADMINs e DEVELOPERs podem simular dois tipos de perspectiva — `toggleViewMode` simula um usuário `DEFAULT` (sem permissions), e `viewAsDeveloper` + `DevPermissionsModal` simula um `DEVELOPER` com permissões configuráveis. Ambas usam endpoints dedicados (`/api/impersonate` e `/api/impersonate-dev`) e não afetam a sessão real do usuário.
