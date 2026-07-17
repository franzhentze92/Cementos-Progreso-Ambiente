import { loadDescargaBarcosInspecciones } from '../../descargaBarcosInspeccionesApi'
import { countBy, fmt, linesOf } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadDescargaBarcosInspeccionesDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadDescargaBarcosInspecciones()
    const bySede = countBy(rows, (r) => r.plantaSede)
    const byMaterial = countBy(rows, (r) => r.materialDescarga || '(sin material)')
    const byRiesgo = countBy(rows, (r) => r.nivelRiesgo)
    const hallazgos = rows.reduce((s, r) => s + (r.numHallazgos ?? 0), 0)
    const accion = rows.filter((r) =>
      /s[ií]/i.test(r.requiereAccionInmediata),
    ).length
    const avgResult =
      rows.filter((r) => r.resultadoGeneral != null).length > 0
        ? rows.reduce((s, r) => s + (r.resultadoGeneral ?? 0), 0) /
          rows.filter((r) => r.resultadoGeneral != null).length
        : null

    const sample = rows.slice(0, 30).map(
      (r) =>
        `- ${r.fecha} | material ${r.materialDescarga || '—'} | ${r.plantaSede} | resp. ${r.responsable || '—'} | resultado ${fmt(r.resultadoGeneral, 1)} | hallazgos ${r.numHallazgos ?? 0} | riesgo ${r.nivelRiesgo || '—'} | acción inmediata ${r.requiereAccionInmediata || '—'}`,
    )

    const context = `
DOMINIO: Ejecuciones de inspecciones Descarga Barcos
Tabla Supabase: ejecuciones_inspecciones (filtro sede Descarga Barcos)
Campo clave: material_descarga = Clinker | Coque

RESUMEN
- Total: ${rows.length}
- Hallazgos totales: ${hallazgos}
- Requieren acción inmediata: ${accion}
- Resultado general promedio: ${fmt(avgResult, 1)}
- Por material (Clinker / Coque):
${linesOf(byMaterial) || '- Sin datos'}
- Por sede:
${linesOf(bySede) || '- Sin datos'}
- Por nivel de riesgo:
${linesOf(byRiesgo) || '- Sin datos'}

DETALLE RECIENTE
${sample.join('\n') || '- Sin inspecciones'}
`.trim()

    return {
      id: 'descargaBarcosInspecciones',
      label: 'Inspecciones Descarga Barcos',
      summary: `Descarga Barcos · ${rows.length} insp. · Clinker/Coque · hallazgos ${hallazgos}`,
      context,
    }
  }
