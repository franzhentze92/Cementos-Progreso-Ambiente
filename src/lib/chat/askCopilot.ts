import {
  DEFAULT_CHAT_DOMAINS,
  loadChatDomains,
  mergeDomainContext,
} from './domains'
import { knowledgeDomainForQuestion } from './domains/knowledge'
import type { ChatDomainId, ChatDomainSnapshot, ChatMessagePayload } from './types'

export type AskCopilotResult = {
  reply: string
  domains: ChatDomainSnapshot[]
  source: 'openai' | 'local'
  error?: string
}

/** Elige dominios relevantes para no saturar /api/chat ni perder la conversación. */
export function selectDomainsForQuestion(
  question: string,
  history: ChatMessagePayload[] = [],
): ChatDomainId[] {
  const q = question.toLowerCase()
  const hist = history.map((h) => h.content).join('\n').toLowerCase()
  const blob = `${q}\n${hist}`
  const picked = new Set<ChatDomainId>()

  const add = (...ids: ChatDomainId[]) => ids.forEach((id) => picked.add(id))

  if (/producción|cemento|ugc|cfb|clinker|huella|di[eé]sel|electric|kwh|mwh|carbono/.test(blob)) {
    add('carbon')
  }
  if (/agua|m³|m3|consumo de agua|finca|tanque|bunker|pozo/.test(blob)) {
    add('agroAgua')
  }
  if (/residuo|recicl|lbs|desecho|vertedero/.test(blob) && !/acuerdo|gubernativo|164-?2021/.test(q)) {
    add('agroResiduos')
    add('carbon')
  }
  if (/compost/.test(blob)) add('agroCompostaje')
  if (/incidente/.test(blob)) {
    add('agroIncidentes')
    add('aliconDesempeno')
  }
  if (/inspecci|hallazgo|casco verde/.test(blob)) {
    add('agroInspecciones')
    add('aliconDesempeno')
    add('agroNda')
  }
  if (/monitoreo|par[aá]metro|muestreo/.test(blob)) {
    add('agroMonitoreos')
    add('aliconDesempeno')
  }
  if (/capacitaci|taller/.test(blob)) add('agroCapacitaciones')
  if (/licencia|vencer|vencid|vigencia|expediente/.test(blob)) add('agroLicencias')
  if (/tr[aá]mite|prioridad/.test(blob)) add('agroTramites')
  if (/\bnda\b|nota ida|desempeño/.test(blob)) {
    add('agroNda')
    add('aliconDesempeno')
  }
  if (
    /ley|reglamento|acuerdo|gubernativo|legislaci|descarga|pcb|marn|137-?2016|164-?2021|236-?2006/.test(
      blob,
    )
  ) {
    add('knowledge')
  }

  // Seguimientos cortos ("resúmelo", "optimizar", "y eso?") → heredar del historial
  if (
    picked.size === 0 ||
    /resum|optimiz|explica|detalle|eso|eso mismo|y eso|contin[uú]a|basado en|recomend/.test(q)
  ) {
    if (/agua|m³|finca san miguel|el pilar|tanque|bunker/.test(hist)) add('agroAgua')
    if (/licencia|vigencia|vencer/.test(hist)) add('agroLicencias')
    if (/cemento|clinker|huella|alicon/.test(hist)) add('carbon')
    if (/nda|casco/.test(hist)) add('agroNda')
    if (/residuo/.test(hist)) add('agroResiduos')
    if (/acuerdo|reglamento|legislaci/.test(hist)) add('knowledge')
  }

  if (picked.size === 0) {
    return DEFAULT_CHAT_DOMAINS
  }

  return [...picked]
}

function withQuestionAwareKnowledge(
  domains: ChatDomainSnapshot[],
  question: string,
): ChatDomainSnapshot[] {
  const next = domains.filter((d) => d.id !== 'knowledge')
  const needsKnowledge =
    /ley|reglamento|acuerdo|gubernativo|legislaci|descarga|pcb|marn|137-?2016|164-?2021|236-?2006|instrumento|expediente/.test(
      question.toLowerCase(),
    ) || domains.some((d) => d.id === 'knowledge')
  if (needsKnowledge) {
    next.push(knowledgeDomainForQuestion(question))
  }
  return next
}

function conversationalFallback(
  question: string,
  domains: ChatDomainSnapshot[],
  history: ChatMessagePayload[],
): string {
  const q = question.toLowerCase()
  const lastAssistant = [...history]
    .reverse()
    .find((h) => h.role === 'assistant')?.content

  if (/resum|breve|corto|damelo|dámelo/.test(q) && lastAssistant) {
    const lines = lastAssistant
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !/^DOMINIO:|^Tabla |^=====|^RESUMEN$/i.test(l))
      .slice(0, 8)
    if (lines.length) {
      return `Resumen rápido:\n${lines.map((l) => (l.startsWith('-') ? l : `· ${l}`)).join('\n')}`
    }
  }

  if (/optimiz|recomend|mejorar|reducir/.test(q)) {
    const agua = domains.find((d) => d.id === 'agroAgua')
    if (agua || /agua/.test(history.map((h) => h.content).join(' ').toLowerCase())) {
      const ctx = agua?.context ?? ''
      const top = ctx
        .split('\n')
        .filter((l) => /Finca San Miguel|Finca El Pilar|Tanque|Bunker|total/i.test(l))
        .slice(0, 6)
      return (
        `Con los datos de agua disponibles, priorizaría:\n` +
        `1. Auditar el mayor consumidor (en los datos suele destacar San Miguel / Tanque Casa Patronal).\n` +
        `2. Medir fugas y pérdidas en tanques y bunkers.\n` +
        `3. Separar consumo doméstico vs operativo y fijar metas mensuales por sede.\n` +
        (top.length ? `\nReferencia:\n${top.join('\n')}` : '')
      )
    }
  }

  const catalog = domains.map((d) => `· ${d.label}: ${d.summary}`).join('\n')
  if (/agua/.test(q)) {
    const agua = domains.find((d) => d.id === 'agroAgua')
    const lines = (agua?.context ?? '')
      .split('\n')
      .filter((l) => /RESUMEN|Consumo total|POR SEDE|San Miguel|El Pilar/i.test(l))
      .slice(0, 10)
    return lines.length
      ? `Según el consumo de agua Agro:\n${lines.join('\n')}`
      : agua?.summary || 'No tengo el detalle de agua a la mano.'
  }

  if (/licencia|vencer|vencid/.test(q)) {
    const lic = domains.find((d) => d.id === 'agroLicencias')
    const body = lic?.context ?? ''
    const catalogLines = body
      .split('\n')
      .filter((l) => /^- /.test(l) && /vigencia|VIGENTE|EN PROCESO|DESISTIDO/i.test(l))
      .slice(0, 12)
    if (catalogLines.length) {
      return `Licencias en el catálogo:\n${catalogLines.join('\n')}`
    }
    return lic?.summary
      ? `Tengo ${lic.summary}. ¿Quieres que detalle por sede o por estado?`
      : 'No tengo el catálogo de licencias cargado ahora.'
  }

  return (
    'Puedo ayudarte a interpretar esos indicadores o a profundizar en un punto. ' +
    '¿Quieres un resumen, una comparación por sede o recomendaciones?\n\n' +
    (catalog ? `Tengo a mano:\n${catalog}` : '')
  )
}

export async function askCopilot(options: {
  question: string
  history?: ChatMessagePayload[]
  domainIds?: ChatDomainId[]
  cachedDomains?: ChatDomainSnapshot[]
}): Promise<AskCopilotResult> {
  const history = (options.history ?? []).slice(-8)
  const domainIds =
    options.domainIds ?? selectDomainsForQuestion(options.question, history)

  let baseDomains =
    options.cachedDomains && options.cachedDomains.length > 0
      ? options.cachedDomains.filter((d) => domainIds.includes(d.id))
      : []

  const missing = domainIds.filter((id) => !baseDomains.some((d) => d.id === id))
  if (missing.length) {
    const loaded = await loadChatDomains(missing)
    baseDomains = [...baseDomains, ...loaded]
  }
  if (!baseDomains.length) {
    baseDomains = await loadChatDomains(domainIds)
  }

  const domains = withQuestionAwareKnowledge(baseDomains, options.question)
  const context = mergeDomainContext(domains)

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: options.question,
        history,
        context,
        domainIds,
      }),
    })

    if (res.ok) {
      const data = (await res.json()) as { reply?: string; error?: string }
      if (data.reply?.trim()) {
        return { reply: data.reply.trim(), domains: baseDomains, source: 'openai' }
      }
    } else {
      const errBody = (await res.json().catch(() => null)) as {
        error?: string
      } | null
      console.warn('[chat] API', res.status, errBody?.error)
    }
  } catch (err) {
    console.error('askCopilot fetch failed', err)
  }

  // Fallback conversacional (sin volcar tablas crudas)
  return {
    reply: conversationalFallback(options.question, domains, history),
    domains: baseDomains,
    source: 'local',
    error: 'Asistente en modo reducido',
  }
}
