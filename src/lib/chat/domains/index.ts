import type { ChatDomainId, ChatDomainLoader, ChatDomainSnapshot } from '../types'
import { loadCarbonDomain } from './carbon'

/**
 * Registro de dominios del copiloto.
 * Cada nueva base de datos en Supabase se suma aquí con su loader.
 */
export const CHAT_DOMAIN_LOADERS: Record<ChatDomainId, ChatDomainLoader> = {
  carbon: loadCarbonDomain,
}

/** Dominios activos por defecto (se irán ampliando). */
export const DEFAULT_CHAT_DOMAINS: ChatDomainId[] = ['carbon']

export async function loadChatDomains(
  domainIds: ChatDomainId[] = DEFAULT_CHAT_DOMAINS,
): Promise<ChatDomainSnapshot[]> {
  const snapshots: ChatDomainSnapshot[] = []
  for (const id of domainIds) {
    const loader = CHAT_DOMAIN_LOADERS[id]
    if (!loader) continue
    try {
      snapshots.push(await loader())
    } catch (err) {
      console.error(`No se pudo cargar dominio chat "${id}"`, err)
    }
  }
  return snapshots
}

export function mergeDomainContext(domains: ChatDomainSnapshot[]): string {
  if (!domains.length) {
    return 'No hay dominios de datos cargados todavía.'
  }
  return domains
    .map(
      (d) =>
        `===== ${d.label} =====\nResumen: ${d.summary}\n\n${d.context}`,
    )
    .join('\n\n')
}
