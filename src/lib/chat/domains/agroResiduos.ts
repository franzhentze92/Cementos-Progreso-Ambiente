import { loadAgroResiduos } from '../../agroResiduosApi'
import { countBy, fmt, linesOf, monthKey, sumBy } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadAgroResiduosDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadAgroResiduos()
    const totalLbs = rows.reduce((s, r) => s + (r.cantidadLbs ?? 0), 0)
    const bySede = sumBy(
      rows,
      (r) => r.sede,
      (r) => r.cantidadLbs ?? 0,
    )
    const byTipo = sumBy(
      rows,
      (r) => r.tipoResiduos,
      (r) => r.cantidadLbs ?? 0,
    )
    const byRuta = sumBy(
      rows,
      (r) => r.rutaGestion,
      (r) => r.cantidadLbs ?? 0,
    )
    const byClasif = countBy(rows, (r) => r.clasificacionTecnica)
    const byMonth = sumBy(
      rows,
      (r) => monthKey(r.fecha),
      (r) => r.cantidadLbs ?? 0,
    ).sort((a, b) => a.key.localeCompare(b.key))

    const sample = rows.slice(0, 30).map(
      (r) =>
        `- ${r.fecha} | ${r.sede} | ${r.tipoResiduos} | ${fmt(r.cantidadLbs, 1)} lbs | ruta ${r.rutaGestion || '—'} | ${r.clasificacionTecnica || '—'}`,
    )

    const context = `
DOMINIO: Gestión de residuos fincas Agroprogreso
Tabla Supabase: agro_gestion_residuos

RESUMEN
- Registros: ${rows.length}
- Cantidad total: ${fmt(totalLbs, 1)} lbs (${fmt(totalLbs / 2204.62, 2)} t aprox.)

POR SEDE (lbs)
${linesOf(bySede, { unit: 'lbs', digits: 1 }) || '- Sin datos'}

POR TIPO DE RESIDUO (lbs, top 20)
${linesOf(byTipo, { unit: 'lbs', digits: 1, limit: 20 }) || '- Sin datos'}

POR RUTA DE GESTIÓN (lbs)
${linesOf(byRuta, { unit: 'lbs', digits: 1 }) || '- Sin datos'}

POR CLASIFICACIÓN TÉCNICA (conteo)
${linesOf(byClasif) || '- Sin datos'}

POR MES (lbs)
${linesOf(byMonth, { unit: 'lbs', digits: 1, limit: 36 }) || '- Sin datos'}

DETALLE RECIENTE
${sample.join('\n') || '- Sin registros'}
`.trim()

    return {
      id: 'agroResiduos',
      label: 'Residuos Agro',
      summary: `Agro residuos · ${fmt(totalLbs, 0)} lbs · ${rows.length} registros`,
      context,
    }
  }
