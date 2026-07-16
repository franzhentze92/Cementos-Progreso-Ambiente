import { loadAgroCapacitaciones } from '../../agroCapacitacionesApi'
import { countBy, linesOf } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadAgroCapacitacionesDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadAgroCapacitaciones()
    const byEstado = countBy(rows, (r) => r.estado)
    const bySede = countBy(rows, (r) => r.plantaSede)
    const byAnio = countBy(rows, (r) => String(r.anio))

    const sample = rows.slice(0, 30).map(
      (r) =>
        `- ${r.fechaInicio} → ${r.fechaFin} | ${r.plantaSede} | ${r.detalle.slice(0, 100) || '—'} | público ${r.publicoObjetivo || '—'} | ${r.estado}`,
    )

    const context = `
DOMINIO: Capacitaciones ambientales Agroprogreso
Tabla Supabase: agro_capacitaciones

RESUMEN
- Total: ${rows.length}
- Por estado:
${linesOf(byEstado) || '- Sin datos'}
- Por sede:
${linesOf(bySede) || '- Sin datos'}
- Por año:
${linesOf(byAnio) || '- Sin datos'}

DETALLE RECIENTE
${sample.join('\n') || '- Sin capacitaciones'}
`.trim()

    return {
      id: 'agroCapacitaciones',
      label: 'Capacitaciones Agro',
      summary: `Capacitaciones · ${rows.length} registros`,
      context,
    }
  }
