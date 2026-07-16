export type ChatDomainId =
  | 'carbon'
  | 'aliconDesempeno'
  | 'agroAgua'
  | 'agroResiduos'
  | 'agroCompostaje'
  | 'agroIncidentes'
  | 'agroInspecciones'
  | 'agroMonitoreos'
  | 'agroCapacitaciones'
  | 'agroLicencias'
  | 'agroTramites'
  | 'agroNda'
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
