import { loadAgroCompostaje } from '../../agroCompostajeApi'
import { fmt, linesOf, monthKey, sumBy } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadAgroCompostajeDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadAgroCompostaje()
    const total = rows.reduce((s, r) => s + (r.toneladas ?? 0), 0)
    const byFinca = sumBy(
      rows,
      (r) => r.finca,
      (r) => r.toneladas ?? 0,
    )
    const byMonth = sumBy(
      rows,
      (r) => monthKey(r.fecha),
      (r) => r.toneladas ?? 0,
    ).sort((a, b) => a.key.localeCompare(b.key))

    const sample = rows
      .slice(0, 40)
      .map((r) => `- ${r.fecha} | ${r.finca} | ${fmt(r.toneladas, 2)} t`)

    const context = `
DOMINIO: Compostaje Agroprogreso
Tabla Supabase: agro_compostaje

RESUMEN
- Registros: ${rows.length}
- Toneladas totales: ${fmt(total, 2)} t

POR FINCA (t)
${linesOf(byFinca, { unit: 't', digits: 2 }) || '- Sin datos'}

POR MES (t)
${linesOf(byMonth, { unit: 't', digits: 2, limit: 36 }) || '- Sin datos'}

DETALLE
${sample.join('\n') || '- Sin registros'}
`.trim()

    return {
      id: 'agroCompostaje',
      label: 'Compostaje Agro',
      summary: `Compostaje · ${fmt(total, 1)} t · ${rows.length} registros`,
      context,
    }
  }
