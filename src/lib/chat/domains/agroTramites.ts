import { loadAgroGestionTramites } from '../../agroGestionTramitesApi'
import { countBy, linesOf } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadAgroTramitesDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadAgroGestionTramites()
    const byEstado = countBy(rows, (r) => r.estado)
    const byPrioridad = countBy(rows, (r) => r.prioridad)
    const bySede = countBy(rows, (r) => r.plantaSede)

    const sample = rows.map(
      (r) =>
        `- ${r.fechaSolicitud} | ${r.plantaSede} | ${r.nombreProyecto} | ${r.estado} | prioridad ${r.prioridad || '—'} | asignado ${r.asignadoA || '—'} | ${r.observaciones.slice(0, 100) || '—'}`,
    )

    const context = `
DOMINIO: Gestión de trámites ambientales Agroprogreso
Tabla Supabase: agro_gestion_tramites

RESUMEN
- Total trámites: ${rows.length}
- Por estado:
${linesOf(byEstado) || '- Sin datos'}
- Por prioridad:
${linesOf(byPrioridad) || '- Sin datos'}
- Por sede:
${linesOf(bySede) || '- Sin datos'}

CATÁLOGO COMPLETO
${sample.join('\n') || '- Sin trámites'}
`.trim()

    return {
      id: 'agroTramites',
      label: 'Trámites Agro',
      summary: `Trámites · ${rows.length} · ${byEstado.map((e) => `${e.key}:${e.count}`).join(', ')}`,
      context,
    }
  }
