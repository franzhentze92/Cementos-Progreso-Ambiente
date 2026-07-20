import type { ChatDomainId, ChatDomainLoader, ChatDomainSnapshot } from '../types'
import { loadAgroAguaDomain } from './agroAgua'
import { loadAgroCapacitacionesDomain } from './agroCapacitaciones'
import { loadAgroCompostajeDomain } from './agroCompostaje'
import { loadAgroIncidentesDomain } from './agroIncidentes'
import { loadAgroInspeccionesDomain } from './agroInspecciones'
import { loadDescargaBarcosInspeccionesDomain } from './descargaBarcosInspecciones'
import { loadAgroLicenciasDomain } from './agroLicencias'
import { loadAgroMonitoreosDomain } from './agroMonitoreos'
import { loadAgroNdaDomain } from './agroNda'
import { loadAgroResiduosDomain } from './agroResiduos'
import { loadAgroTramitesDomain } from './agroTramites'
import { loadAliconDesempenoDomain } from './aliconDesempeno'
import { loadCarbonDomain } from './carbon'
import { loadCumplimientoDomain } from './cumplimiento'
import { loadCompromisosDomain } from './compromisos'
import { loadCapaDomain } from './capa'
import { loadMetasDomain } from './metas'
import { loadUmbralesDomain } from './umbrales'
import { loadIntensidadDomain } from './intensidad'
import { loadCircularidadDomain } from './circularidad'
import { loadExpedientesDomain } from './expedientes'
import { loadAnalistaDomain } from './analista'
import { loadKnowledgeDomain } from './knowledge'

/**
 * Registro de dominios del copiloto.
 * Cubre las tablas públicas de Supabase + documentos de Contexto Chatbot.
 */
export const CHAT_DOMAIN_LOADERS: Record<ChatDomainId, ChatDomainLoader> = {
  carbon: loadCarbonDomain,
  aliconDesempeno: loadAliconDesempenoDomain,
  agroAgua: loadAgroAguaDomain,
  agroResiduos: loadAgroResiduosDomain,
  agroCompostaje: loadAgroCompostajeDomain,
  agroIncidentes: loadAgroIncidentesDomain,
  agroInspecciones: loadAgroInspeccionesDomain,
  descargaBarcosInspecciones: loadDescargaBarcosInspeccionesDomain,
  agroMonitoreos: loadAgroMonitoreosDomain,
  agroCapacitaciones: loadAgroCapacitacionesDomain,
  agroLicencias: loadAgroLicenciasDomain,
  agroTramites: loadAgroTramitesDomain,
  agroNda: loadAgroNdaDomain,
  cumplimiento: loadCumplimientoDomain,
  compromisos: loadCompromisosDomain,
  capa: loadCapaDomain,
  metas: loadMetasDomain,
  umbrales: loadUmbralesDomain,
  intensidad: loadIntensidadDomain,
  circularidad: loadCircularidadDomain,
  expedientes: loadExpedientesDomain,
  analista: loadAnalistaDomain,
  knowledge: loadKnowledgeDomain,
}

/** Todos los dominios activos (bases de datos + documentos). */
export const DEFAULT_CHAT_DOMAINS: ChatDomainId[] = [
  'carbon',
  'aliconDesempeno',
  'agroAgua',
  'agroResiduos',
  'agroCompostaje',
  'agroIncidentes',
  'agroInspecciones',
  'descargaBarcosInspecciones',
  'agroMonitoreos',
  'agroCapacitaciones',
  'agroLicencias',
  'agroTramites',
  'agroNda',
  'cumplimiento',
  'compromisos',
  'capa',
  'metas',
  'umbrales',
  'intensidad',
  'circularidad',
  'expedientes',
  'analista',
  'knowledge',
]

export async function loadChatDomains(
  domainIds: ChatDomainId[] = DEFAULT_CHAT_DOMAINS,
): Promise<ChatDomainSnapshot[]> {
  const results = await Promise.allSettled(
    domainIds.map(async (id) => {
      const loader = CHAT_DOMAIN_LOADERS[id]
      if (!loader) throw new Error(`Dominio desconocido: ${id}`)
      return loader()
    }),
  )

  const snapshots: ChatDomainSnapshot[] = []
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      snapshots.push(result.value)
    } else {
      console.error(
        `No se pudo cargar dominio chat "${domainIds[i]}"`,
        result.reason,
      )
    }
  })
  return snapshots
}

export function mergeDomainContext(domains: ChatDomainSnapshot[]): string {
  if (!domains.length) {
    return 'No hay dominios de datos cargados todavía.'
  }
  const catalog = domains
    .map((d) => `- ${d.label}: ${d.summary}`)
    .join('\n')
  const bodies = domains
    .map(
      (d) =>
        `===== ${d.label} =====\nResumen: ${d.summary}\n\n${d.context}`,
    )
    .join('\n\n')
  return `CATÁLOGO DE DOMINIOS CONECTADOS (${domains.length}):\n${catalog}\n\n${bodies}`
}
