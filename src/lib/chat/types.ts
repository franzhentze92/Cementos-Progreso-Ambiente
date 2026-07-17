export type ChatDomainId =
  | 'carbon'
  | 'aliconDesempeno'
  | 'agroAgua'
  | 'agroResiduos'
  | 'agroCompostaje'
  | 'agroIncidentes'
  | 'agroInspecciones'
  | 'descargaBarcosInspecciones'
  | 'agroMonitoreos'
  | 'agroCapacitaciones'
  | 'agroLicencias'
  | 'agroTramites'
  | 'agroNda'
  | 'cumplimiento'
  | 'capa'
  | 'metas'
  | 'umbrales'
  | 'intensidad'
  | 'circularidad'
  | 'expedientes'
  | 'analista'
  | 'knowledge'

export type ChatMessagePayload = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type ChatDomainSnapshot = {
  id: ChatDomainId
  label: string
  summary: string
  /** Texto largo con datos estructurados para el modelo */
  context: string
}

export type ChatDomainLoader = () => Promise<ChatDomainSnapshot>
