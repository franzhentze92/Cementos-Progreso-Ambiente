import { loadAgroIncidentes } from '../../agroIncidentesApi'
import { countBy, fmt, linesOf } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadAgroIncidentesDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadAgroIncidentes()
    const byEstado = countBy(rows, (r) => r.estado)
    const bySede = countBy(rows, (r) => r.plantaSede)
    const byInstrumento = countBy(rows, (r) => r.instrumento)

    const sample = rows.slice(0, 30).map(
      (r) =>
        `- ${r.fecha} | ${r.plantaSede} | ${r.instrumento || '—'} | valor ${fmt((r.valorIncidente ?? 0) * 100, 0)}% | ${r.estado} | ${r.descripcion.slice(0, 140)}`,
    )

    const context = `
DOMINIO: Incidentes ambientales Agroprogreso
Tabla Supabase: incidentes_ambientales (filtro unidad Agroprogreso)

RESUMEN
- Total: ${rows.length}
- Por estado:
${linesOf(byEstado) || '- Sin datos'}
- Por sede:
${linesOf(bySede) || '- Sin datos'}
- Por instrumento:
${linesOf(byInstrumento) || '- Sin datos'}

DETALLE RECIENTE
${sample.join('\n') || '- Sin incidentes'}
`.trim()

    return {
      id: 'agroIncidentes',
      label: 'Incidentes Agro',
      summary: `Agro incidentes · ${rows.length} registros`,
      context,
    }
  }
