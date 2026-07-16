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
  /** Si la IA falló, mensaje útil para el usuario */
  error?: string
}

function withQuestionAwareKnowledge(
  domains: ChatDomainSnapshot[],
  question: string,
): ChatDomainSnapshot[] {
  const next = domains.filter((d) => d.id !== 'knowledge')
  next.push(knowledgeDomainForQuestion(question))
  return next
}

/** Extrae la sección ### más relevante del dominio knowledge. */
function extractKnowledgeSection(
  knowledge: ChatDomainSnapshot | undefined,
  question: string,
): string | null {
  if (!knowledge?.context) return null
  const parts = knowledge.context.split(/\n### /)
  if (parts.length < 2) return null

  const q = question.toLowerCase()
  const tokens = q
    .split(/[^a-z0-9áéíóúñü-]+/i)
    .filter((t) => t.length >= 3)

  let best = ''
  let bestScore = 0
  for (const part of parts.slice(1)) {
    const title = (part.split('\n')[0] || '').toLowerCase()
    let score = 0
    for (const t of tokens) {
      if (title.includes(t)) score += 5
      if (part.toLowerCase().includes(t)) score += 1
    }
    if (/164-?2021/.test(q) && /164-?2021/.test(title)) score += 50
    if (score > bestScore) {
      bestScore = score
      best = part
    }
  }

  if (bestScore < 3 || !best) return null
  const clipped = best.slice(0, 3500)
  return `Según el documento «${best.split('\n')[0]}»:\n\n${clipped}${best.length > 3500 ? '\n\n…(continúa en el documento completo).' : ''}`
}

function localAnswer(question: string, domains: ChatDomainSnapshot[]): string {
  const q = question.toLowerCase()
  const knowledge = domains.find((d) => d.id === 'knowledge')

  if (!domains.length) {
    return 'Aún no tengo información disponible. Intenta de nuevo en un momento.'
  }

  // Legislación / documentos ANTES que "residuos" operativos
  if (
    /ley|reglamento|acuerdo|legislaci|gubernativo|descarga|pcb|instrumento ambiental|expediente|folio|marn|inab|164-?2021|236-?2006|194-?2018/.test(
      q,
    )
  ) {
    const section = extractKnowledgeSection(knowledge, question)
    if (section) {
      return section
    }
    return 'No encontré ese documento en la información disponible. ¿Puedes indicar el nombre o número del acuerdo o reglamento?'
  }

  if (q.includes('hola') || q.includes('buenas') || q.includes('ayuda')) {
    return (
      'Puedo ayudarte con indicadores ambientales, desempeño de Alicon y Agroprogreso, y normativa. ' +
      'Pregúntame por producción, agua, residuos, licencias, NDA o un acuerdo gubernativo concreto.'
    )
  }

  if (/producción|cemento|ugc|cfb|clinker|huella|di[eé]sel|electric|kwh|mwh/.test(q)) {
    const carbon = domains.find((d) => d.id === 'carbon')
    const totals = (carbon?.context ?? '')
      .split('\n')
      .filter((l) => /TOTALES|RANKINGS|Producción cemento:|Factor clinker/i.test(l))
      .slice(0, 12)
    return (
      `Resumen huella Alicon:\n${totals.join('\n') || carbon?.summary || 'Sin datos'}`
    )
  }

  if (/agua|pipa|m³|m3|consumo de agua/.test(q) && !/reglamento|acuerdo|descargas/.test(q)) {
    const agro = domains.find((d) => d.id === 'agroAgua')
    const lines = (agro?.context ?? '')
      .split('\n')
      .filter((l) => /RESUMEN|Consumo total|POR SEDE|m³/i.test(l))
      .slice(0, 12)
    return `Agua Agro:\n${lines.join('\n') || agro?.summary || 'Sin datos'}`
  }

  if (
    /residuo|recicl|vertedero|desecho|lbs/.test(q) &&
    !/acuerdo|gubernativo|reglamento|164-?2021|legislaci/.test(q)
  ) {
    const agro = domains.find((d) => d.id === 'agroResiduos')
    const lines = (agro?.context ?? '')
      .split('\n')
      .filter((l) => /RESUMEN|Cantidad total|POR SEDE|POR TIPO|POR RUTA/i.test(l))
      .slice(0, 14)
    return `Residuos Agro:\n${lines.join('\n') || agro?.summary || 'Sin datos'}`
  }

  if (/\bnda\b|nota ida|casco verde/.test(q)) {
    const nda = domains.find((d) => d.id === 'agroNda')
    const lines = (nda?.context ?? '')
      .split('\n')
      .filter((l) => /NDA|promedio|Casco Verde|IDA/i.test(l))
      .slice(0, 14)
    return `NDA:\n${lines.join('\n') || nda?.summary || 'Sin datos'}`
  }

  if (/licencia|vigencia/.test(q) && !/instrumento|expediente ambiental/.test(q)) {
    const lic = domains.find((d) => d.id === 'agroLicencias')
    return `Licencias:\n${lic?.context.split('\n').slice(0, 20).join('\n') || lic?.summary || 'Sin datos'}`
  }

  if (/incidente/.test(q)) {
    const a = domains.find((d) => d.id === 'agroIncidentes')
    const b = domains.find((d) => d.id === 'aliconDesempeno')
    return `Incidentes:\n${a?.summary ?? ''}\n${b?.summary ?? ''}`
  }

  return (
    'Puedo ayudarte con indicadores ambientales, desempeño de Alicon y Agroprogreso, y normativa. ' +
    'Prueba preguntar por producción, agua, residuos, NDA, licencias o un acuerdo gubernativo concreto.'
  )
}

export async function askCopilot(options: {
  question: string
  history?: ChatMessagePayload[]
  domainIds?: ChatDomainId[]
  cachedDomains?: ChatDomainSnapshot[]
}): Promise<AskCopilotResult> {
  const domainIds = options.domainIds ?? DEFAULT_CHAT_DOMAINS
  const baseDomains =
    options.cachedDomains && options.cachedDomains.length > 0
      ? options.cachedDomains
      : await loadChatDomains(domainIds)

  const domains = withQuestionAwareKnowledge(baseDomains, options.question)
  const context = mergeDomainContext(domains)
  const history = (options.history ?? []).slice(-8)

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
      return {
        reply: localAnswer(options.question, domains),
        domains: baseDomains,
        source: 'local',
        error: data.error || 'El modelo no devolvió texto.',
      }
    }

    const errBody = (await res.json().catch(() => null)) as {
      error?: string
    } | null
    const error =
      errBody?.error ||
      `El servicio de IA respondió ${res.status}. Uso resumen local.`

    return {
      reply: localAnswer(options.question, domains),
      domains: baseDomains,
      source: 'local',
      error,
    }
  } catch (err) {
    console.error('askCopilot fetch failed', err)
    return {
      reply: localAnswer(options.question, domains),
      domains: baseDomains,
      source: 'local',
      error:
        'No pude contactar al asistente. Intenta de nuevo en un momento.',
    }
  }
}
