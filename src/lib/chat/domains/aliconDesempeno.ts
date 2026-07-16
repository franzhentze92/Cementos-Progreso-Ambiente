import { loadAliconIncidentes } from '../../aliconIncidentesApi'
import { loadAliconInspecciones } from '../../aliconInspeccionesApi'
import { loadAliconMonitoreos } from '../../aliconMonitoreosApi'
import { countBy, fmt, linesOf } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

/** Incidentes, inspecciones y monitoreos de planta Alicon. */
export const loadAliconDesempenoDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const [incidentes, inspecciones, monitoreos] = await Promise.all([
      loadAliconIncidentes(),
      loadAliconInspecciones(),
      loadAliconMonitoreos(),
    ])

    const incidByEstado = countBy(incidentes, (r) => r.estado)
    const inspByRiesgo = countBy(inspecciones, (r) => r.nivelRiesgo)
    const monByEstado = countBy(monitoreos, (r) => r.estado)
    const monByTipo = countBy(monitoreos, (r) => r.tipoMonitoreo)
    const hallazgos = inspecciones.reduce(
      (s, r) => s + (r.numHallazgos ?? 0),
      0,
    )
    const accionInmediata = inspecciones.filter((r) =>
      /s[ií]/i.test(r.requiereAccionInmediata),
    ).length

    const incidLines = incidentes.slice(0, 25).map(
      (r) =>
        `- ${r.fecha} | ${r.plantaSede} | ${r.instrumento || '—'} | valor ${fmt((r.valorIncidente ?? 0) * 100, 0)}% | ${r.estado} | ${r.descripcion.slice(0, 120)}`,
    )
    const inspLines = inspecciones.slice(0, 25).map(
      (r) =>
        `- ${r.fecha} | ${r.responsable || '—'} | resultado ${fmt(r.resultadoGeneral, 1)} | hallazgos ${r.numHallazgos ?? 0} | riesgo ${r.nivelRiesgo || '—'} | acción inmediata ${r.requiereAccionInmediata || '—'}`,
    )
    const monLines = monitoreos.slice(0, 25).map(
      (r) =>
        `- ${r.fechaInicio} → ${r.fechaFin || r.fechaInicio} | ${r.plantaSede} | ${r.tipoMonitoreo} | ${r.parametro} | puntos ${r.puntos ?? '—'} | ${r.estado} | ${r.comparacion || '—'}`,
    )

    const context = `
DOMINIO: Desempeño ambiental Alicon (plantas Alicon / Subestación Alicon)
Tablas Supabase: incidentes_ambientales, ejecuciones_inspecciones, ejecuciones_monitoreos

INCIDENTES AMBIENTALES (Alicon)
- Total registros: ${incidentes.length}
- Por estado:
${linesOf(incidByEstado) || '- Sin datos'}

Detalle reciente:
${incidLines.join('\n') || '- Sin incidentes'}

INSPECCIONES (Alicon)
- Total registros: ${inspecciones.length}
- Hallazgos totales: ${hallazgos}
- Requieren acción inmediata: ${accionInmediata}
- Por nivel de riesgo:
${linesOf(inspByRiesgo) || '- Sin datos'}

Detalle reciente:
${inspLines.join('\n') || '- Sin inspecciones'}

MONITOREOS / EJECUCIONES MONI (Alicon)
- Total registros: ${monitoreos.length}
- Por estado:
${linesOf(monByEstado) || '- Sin datos'}
- Por tipo:
${linesOf(monByTipo) || '- Sin datos'}

Detalle reciente:
${monLines.join('\n') || '- Sin monitoreos'}
`.trim()

    const summary = `Alicon · ${incidentes.length} incidentes · ${inspecciones.length} inspecciones · ${monitoreos.length} monitoreos`

    return {
      id: 'aliconDesempeno',
      label: 'Desempeño Alicon',
      summary,
      context,
    }
  }
