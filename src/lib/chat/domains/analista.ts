import { loadBriefings, computeLiveAnalistaReport } from '../../analistaApi'
import { CATEGORY_LABEL, formatNum } from '../../../data/analista'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadAnalistaDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const [live, briefings] = await Promise.all([
      computeLiveAnalistaReport().catch(() => null),
      loadBriefings().catch(() => []),
    ])

    const latest = briefings[0]
    const signals = latest?.signals?.length
      ? latest.signals
      : live?.signals ?? []
    const kpis = latest?.kpis ?? live?.kpis

    const byCat = Object.entries(
      signals.reduce<Record<string, number>>((acc, s) => {
        acc[s.category] = (acc[s.category] ?? 0) + 1
        return acc
      }, {}),
    )
      .map(
        ([cat, n]) =>
          `- ${CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL] ?? cat}: ${n}`,
      )
      .join('\n')

    const context = `
DOMINIO: Analista semanal (predictivo / briefing)
Tabla Supabase: briefings_semanales

SEMANA VIVA
- Ventana: ${live?.weekLabel ?? '—'} (${live?.semanaInicio ?? '—'} → ${live?.semanaFin ?? '—'})
- Briefings guardados: ${briefings.length}
- Último código: ${latest?.codigo ?? '—'} · estado ${latest?.estado ?? '—'}

KPIs
- Críticos: ${formatNum(kpis?.criticos)}
- Atención: ${formatNum(kpis?.atencion)}
- Positivos: ${formatNum(kpis?.positivos)}
- Vencimientos: ${formatNum(kpis?.vencimientos)}
- Anomalías: ${formatNum(kpis?.anomalias)}
- Metas en riesgo: ${formatNum(kpis?.metasRiesgo)}
- Sitios críticos: ${formatNum(kpis?.sitiosCriticos)}

POR CATEGORÍA
${byCat || '- Sin señales'}

RESUMEN
${latest?.resumen || live?.resumen || 'Sin resumen'}

FORECAST
${(live?.forecastLines ?? []).map((l) => `- ${l}`).join('\n') || '- Sin forecast'}

SEÑALES (hasta 25)
${
  signals
    .slice(0, 25)
    .map(
      (s) =>
        `- [${s.level}/${s.category}] ${s.title}: ${s.text}${s.href ? ` → ${s.href}` : ''}`,
    )
    .join('\n') || '- Sin señales'
}

BORRADOR GUARDADO (extracto)
${(latest?.borradorMd || '').slice(0, 1200) || '- Sin borrador'}
`.trim()

    return {
      id: 'analista',
      label: 'Analista semanal',
      summary: `Analista · ${formatNum(signals.length)} señales · ${formatNum(kpis?.criticos)} críticos · semana ${live?.weekLabel ?? '—'}`,
      context,
    }
  }
