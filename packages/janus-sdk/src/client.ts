import type { JanusPageResponse } from './types'
import { JanusNetworkError, JanusNotFoundError } from './types'

interface JanusClientOptions {
  baseUrl: string
}

export class JanusClient {
  readonly baseUrl: string

  constructor({ baseUrl }: JanusClientOptions) {
    if (!baseUrl) {
      throw new Error('JanusClient: baseUrl não pode ser vazio.')
    }
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  async getHeroContent<T>(projectId: string): Promise<T[]> {
    if (!projectId) {
      throw new Error('JanusClient.getHeroContent: projectId não pode ser vazio.')
    }
    if (!projectId.includes('/')) {
      throw new Error(
        'JanusClient.getHeroContent: projectId deve seguir o formato "companySlug/pageSlug".',
      )
    }

    const url = `${this.baseUrl}/api/v1/content/${projectId}`

    let response: Response
    try {
      response = await fetch(url, { method: 'GET' })
    } catch (cause) {
      throw new JanusNetworkError(
        `unable to reach Janus API at "${url}"`,
        cause,
      )
    }

    if (!response.ok) {
      throw new JanusNotFoundError(projectId)
    }

    const page: JanusPageResponse = await response.json()

    if (!Array.isArray(page.content)) {
      return []
    }

    return page.content as T[]
  }
}
