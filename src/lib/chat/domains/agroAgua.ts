import { loadAgroConsumoAgua } from '../../agroConsumoAguaApi'
import { countBy, fmt, linesOf, monthKey, sumBy } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadAgroAguaDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadAgroConsumoAgua()
    const total = rows.reduce((s, r) => s + (r.consumoM3 ?? 0), 0)
    const bySede = sumBy(
      rows,
      (r) => r.sede,
      (r) => r.consumoM3 ?? 0,
    )
    const bySitio = sumBy(
      rows,
      (r) => `${r.sede} / ${r.sitioConsumo}`,
      (r) => r.consumoM3 ?? 0,
    )
    const byMonth = sumBy(
      rows,
      (r) => monthKey(r.fecha),
      (r) => r.consumoM3 ?? 0,
    ).sort((a, b) => a.key.localeCompare(b.key))
    const sedes = countBy(rows, (r) => r.sede)

    const sample = rows.slice(0, 30).map(
      (r) =>
        `- ${r.fecha} | ${r.sede} | ${r.sitioConsumo} | ${fmt(r.consumoM3, 2)} m³`,
    )

    const context = `
DOMINIO: Consumo de agua Agroprogreso
Tabla Supabase: agro_consumo_agua

RESUMEN
- Registros: ${rows.length}
- Consumo total: ${fmt(total, 1)} m³
- Sedes con dato: ${sedes.length}

POR SEDE (m³)
${linesOf(bySede, { unit: 'm³', digits: 1 }) || '- Sin datos'}

POR SITIO DE CONSUMO (top 25, m³)
${linesOf(bySitio, { unit: 'm³', digits: 1, limit: 25 }) || '- Sin datos'}

POR MES (m³)
${linesOf(byMonth, { unit: 'm³', digits: 1, limit: 36 }) || '- Sin datos'}

DETALLE RECIENTE (hasta 30 filas)
${sample.join('\n') || '- Sin registros'}
`.trim()

    return {
      id: 'agroAgua',
      label: 'Agua Agro',
      summary: `Agro agua · ${fmt(total, 0)} m³ · ${rows.length} registros`,
      context,
    }
  }
