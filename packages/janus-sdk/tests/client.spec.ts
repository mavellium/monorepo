import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { JanusClient } from '../src/client'

// ---------------------------------------------------------------------------
// Local mock type — the SDK is generic; domain types live in the consumer.
// ---------------------------------------------------------------------------

interface MockSlide {
  id: string
  title: string
  order: number
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_URL = 'https://cms.mavellium.com'

const MOCK_SLIDES: MockSlide[] = [
  { id: 'slide-1', title: 'Transforme sua presença digital', order: 0 },
  { id: 'slide-2', title: 'Automatize com inteligência', order: 1 },
]

// content IS the array — no wrapper key needed.
const MOCK_API_RESPONSE = {
  slug: 'home',
  name: 'Página Inicial',
  schema: {},
  content: MOCK_SLIDES,
  updatedAt: '2026-05-12T00:00:00.000Z',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchOk(body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    }),
  )
}

function mockFetchNotFound(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Page not found or not published' }),
    }),
  )
}

function mockFetchNetworkError(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
  )
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('JanusClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ─── Instanciação ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('armazena o baseUrl fornecido', () => {
      const client = new JanusClient({ baseUrl: BASE_URL })

      expect(client.baseUrl).toBe(BASE_URL)
    })

    it('remove trailing slash do baseUrl para evitar URLs duplicadas', () => {
      const client = new JanusClient({ baseUrl: `${BASE_URL}/` })

      expect(client.baseUrl).toBe(BASE_URL)
    })

    it('lança erro se baseUrl for uma string vazia', () => {
      expect(() => new JanusClient({ baseUrl: '' })).toThrow(
        'JanusClient: baseUrl não pode ser vazio.',
      )
    })
  })

  // ─── getHeroContent<T> ────────────────────────────────────────────────────

  describe('getHeroContent<T>(projectId)', () => {
    let client: JanusClient

    beforeEach(() => {
      client = new JanusClient({ baseUrl: BASE_URL })
    })

    // ── Sucesso ──

    it('retorna T[] quando a API responde com sucesso', async () => {
      mockFetchOk(MOCK_API_RESPONSE)

      const slides = await client.getHeroContent<MockSlide>('mavellium/home')

      expect(slides).toEqual(MOCK_SLIDES)
    })

    it('chama o endpoint correto: GET /api/v1/content/:companySlug/:pageSlug', async () => {
      mockFetchOk(MOCK_API_RESPONSE)
      const fetchSpy = vi.mocked(fetch)

      await client.getHeroContent<MockSlide>('mavellium/home')

      expect(fetchSpy).toHaveBeenCalledOnce()
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/api/v1/content/mavellium/home`,
        expect.objectContaining({ method: 'GET' }),
      )
    })

    it('retorna array vazio quando content não é um array', async () => {
      mockFetchOk({ ...MOCK_API_RESPONSE, content: { unexpected: 'object' } })

      const slides = await client.getHeroContent<MockSlide>('mavellium/home')

      expect(slides).toEqual([])
    })

    it('retorna array vazio quando content é null', async () => {
      mockFetchOk({ ...MOCK_API_RESPONSE, content: null })

      const slides = await client.getHeroContent<MockSlide>('mavellium/home')

      expect(slides).toEqual([])
    })

    // ── Falha: API retorna 404 ──

    it('lança JanusNotFoundError quando a página não existe ou não está publicada', async () => {
      mockFetchNotFound()

      await expect(client.getHeroContent<MockSlide>('mavellium/home')).rejects.toThrow(
        'JanusNotFoundError',
      )
    })

    it('inclui o projectId na mensagem de JanusNotFoundError', async () => {
      mockFetchNotFound()

      await expect(client.getHeroContent<MockSlide>('mavellium/inexistente')).rejects.toThrow(
        'mavellium/inexistente',
      )
    })

    // ── Falha: rede offline / API indisponível ──

    it('lança JanusNetworkError quando a API está offline', async () => {
      mockFetchNetworkError()

      await expect(client.getHeroContent<MockSlide>('mavellium/home')).rejects.toThrow(
        'JanusNetworkError',
      )
    })

    it('preserva a causa original dentro de JanusNetworkError', async () => {
      mockFetchNetworkError()

      const error = await client.getHeroContent<MockSlide>('mavellium/home').catch((e) => e)

      expect(error.cause).toBeInstanceOf(TypeError)
      expect((error.cause as TypeError).message).toBe('Failed to fetch')
    })

    // ── Validação de argumento ──

    it('lança erro síncrono se projectId for string vazia', async () => {
      await expect(client.getHeroContent('')).rejects.toThrow(
        'JanusClient.getHeroContent: projectId não pode ser vazio.',
      )
    })

    it('lança erro síncrono se projectId não contiver o separador "/"', async () => {
      await expect(client.getHeroContent('sem-barra')).rejects.toThrow(
        'JanusClient.getHeroContent: projectId deve seguir o formato "companySlug/pageSlug".',
      )
    })
  })
})
