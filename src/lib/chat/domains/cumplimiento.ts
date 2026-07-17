import { loadCumplimiento } from '../../cumplimientoApi'
import { buildCumplimientoReport } from '../../../data/cumplimientoReport'
import { formatIsoDate } from '../../../data/cumplimiento'
import { linesOf, countBy } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadCumplimientoDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadCumplimiento()
    const report = buildCumplimientoReport(rows)
    const byEstado = countBy(rows, (r) => r.estado)
    const byUnidad = countBy(rows, (r) => r.unidadNegocio)

    const context = `
DOMINIO: Cumplimiento legal ambiental (Compliance Hub)
Tabla Supabase: cumplimiento_obligaciones

RESUMEN
- Total obligaciones: ${report.meta.total}
- Vencidas: ${report.meta.vencidos}
- Por vencer (ventana alerta): ${report.meta.porVencer}
- En trámite: ${report.meta.enTramite}
- Cumplidas: ${report.meta.cumplidos}
- Criticidad alta: ${report.meta.altaCriticidad}

POR ESTADO
${linesOf(byEstado) || '- Sin datos'}

POR UNIDAD
${linesOf(byUnidad) || '- Sin datos'}

CALENDARIO (próximos 120 días)
${
  report.calendar
    .map(
      (c) =>
        `- ${formatIsoDate(c.fecha)} | ${c.titulo} | ${c.sitio} | ${c.days}d | ${c.estado}`,
    )
    .join('\n') || '- Sin vencimientos próximos'
}

ALERTAS
${report.insights.map((i) => `- [${i.level}] ${i.title}: ${i.text}`).join('\n') || '- Sin alertas'}

DETALLE (hasta 40)
${
  report.detailRows
    .slice(0, 40)
    .map(
      (r) =>
        `- ${r.codigo || '—'} | ${r.titulo} | ${r.unidadNegocio}/${r.sitio} | ${r.tipoObligacion} | vence ${formatIsoDate(r.fechaVencimiento)} | ${r.estadoDerivado} | riesgo ${r.risk}`,
    )
    .join('\n') || '- Sin obligaciones'
}
`.trim()

    return {
      id: 'cumplimiento',
      label: 'Cumplimiento legal',
      summary: `Obligaciones · ${report.meta.total} · vencidas ${report.meta.vencidos} · por vencer ${report.meta.porVencer}`,
      context,
    }
  }
