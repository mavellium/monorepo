// ─── Internal API response shape ─────────────────────────────────────────────

export interface JanusPageResponse {
  slug: string
  name: string
  schema: unknown
  content: unknown
  updatedAt: string
}

// ─── Custom errors ───────────────────────────────────────────────────────────

export class JanusNotFoundError extends Error {
  constructor(projectId: string) {
    super(`JanusNotFoundError: no published content found for "${projectId}"`)
    this.name = 'JanusNotFoundError'
  }
}

export class JanusNetworkError extends Error {
  readonly cause: unknown

  constructor(message: string, cause: unknown) {
    super(`JanusNetworkError: ${message}`)
    this.name = 'JanusNetworkError'
    this.cause = cause
  }
}
