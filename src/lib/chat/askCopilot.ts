import {
  DEFAULT_CHAT_DOMAINS,
  loadChatDomains,
  mergeDomainContext,
} from './domains'
import type { ChatDomainId, ChatDomainSnapshot, ChatMessagePayload } from './types'

export type AskCopilotResult = {
  reply: string
  domains: ChatDomainSnapshot[]
  source: 'openai' | 'local'
}

function localAnswer(question: string, domains: ChatDomainSnapshot[]): string {
  const q = question.toLowerCase()
  const carbon = domains.find((d) => d.id === 'carbon')
  const ctx = carbon?.context ?? ''
  const summary = carbon?.summary ?? ''

  if (!carbon) {
    return 'Aún no tengo datos de monitoreo cargados. Revisa la captura de Huella de Carbono e intenta de nuevo.'
  }

  if (q.includes('hola') || q.includes('buenas') || q.includes('ayuda')) {
    return `Puedo ayudarte con la huella operativa de ${summary}. Pregunta por producción, factor clinker, electricidad, diésel, agua o residuos.`
  }

  const pick = (label: string, patterns: RegExp[]) =>
    patterns.some((p) => p.test(q))
      ? ctx
          .split('\n')
          .filter((line) => patterns.some((p) => p.test(line.toLowerCase())) || line.includes(label))
          .slice(0, 8)
          .join('\n')
      : ''

  if (/producción|cemento|ugc|cfb|clinker/.test(q)) {
    const lines = ctx
      .split('\n')
      .filter((l) =>
        /producción|cemento|ugc|cfb|clinker|factor/i.test(l),
      )
      .slice(0, 12)
    return `Según el monitoreo Alicon en Supabase:\n${lines.join('\n') || summary}`
  }

  if (/electric|kwh|mwh|energ/.test(q)) {
    const lines = ctx
      .split('\n')
      .filter((l) => /electric|kwh|mwh|intensidad/i.test(l))
      .slice(0, 10)
    return `Electricidad del monitoreo:\n${lines.join('\n') || 'Sin datos eléctricos en el periodo.'}`
  }

  if (/di[eé]sel|combustible|gal/.test(q)) {
    const lines = ctx
      .split('\n')
      .filter((l) => /diésel|diesel|gal/i.test(l))
      .slice(0, 10)
    return `Combustible (diésel móvil):\n${lines.join('\n') || 'Sin datos de diésel en el periodo.'}`
  }

  if (/clinker/.test(q)) {
    const ranking = ctx
      .split('\n')
      .filter((l) => /Mayor (producción cemento|consumo de clinker|ingreso de clinker|factor clinker)/i.test(l))
      .join('\n')
    const serie = ctx
      .split('\n')
      .filter((l) => /clinker consumo|SERIE PRODUCCIÓN Y CLINKER|cemento .+ \| clinker/i.test(l))
      .slice(0, 14)
      .join('\n')
    return (
      `Clinker (no confundir con producción de cemento):\n` +
      `${ranking || ''}\n${serie || 'Sin serie de clinker en el contexto.'}`
    )
  }

  if (/agua|pipa|m³|m3/.test(q)) {
    const lines = ctx
      .split('\n')
      .filter((l) => /agua|m³|m3/i.test(l))
      .slice(0, 8)
    return `Agua del monitoreo:\n${lines.join('\n') || 'Sin datos de agua en el periodo.'}`
  }

  if (/residuo|recicl|vertedero|desecho/.test(q)) {
    const lines = ctx
      .split('\n')
      .filter((l) => /residuo|recicl|vertedero|desvío/i.test(l))
      .slice(0, 8)
    return `Residuos del monitoreo:\n${lines.join('\n') || 'Sin datos de residuos en el periodo.'}`
  }

  if (/co2|tco2|alcance|emisi[oó]n|huella/.test(q)) {
    return (
      `Tengo los datos de actividad de ${summary}. ` +
      `Todavía no hay factores de emisión oficiales en la base, así que no puedo dar tCO₂e ni alcances GHG exactos; sí producción, kWh/t, gal/t y factor clinker. ` +
      `¿Qué indicador operativo te interesa?`
    )
  }

  void pick
  return (
    `Contexto cargado: ${summary}.\n` +
    `Pregunta por un indicador concreto (producción, factor clinker, electricidad, diésel, agua, residuos o un mes).`
  )
}

export async function askCopilot(options: {
  question: string
  history?: ChatMessagePayload[]
  domainIds?: ChatDomainId[]
  cachedDomains?: ChatDomainSnapshot[]
}): Promise<AskCopilotResult> {
  const domainIds = options.domainIds ?? DEFAULT_CHAT_DOMAINS
  const domains =
    options.cachedDomains && options.cachedDomains.length > 0
      ? options.cachedDomains
      : await loadChatDomains(domainIds)

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
      const data = (await res.json()) as { reply?: string }
      if (data.reply?.trim()) {
        return { reply: data.reply.trim(), domains, source: 'openai' }
      }
    }
  } catch {
    // Local / sin función serverless: fallback con datos reales
  }

  return {
    reply: localAnswer(options.question, domains),
    domains,
    source: 'local',
  }
}
