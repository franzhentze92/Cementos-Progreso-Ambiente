import { loadCapas } from '../../capaApi'
import { buildCapaReport } from '../../../data/capaReport'
import { formatIsoDate } from '../../../data/capa'
import { linesOf, countBy } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadCapaDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadCapas()
    const report = buildCapaReport(rows)
    const byEstado = countBy(rows, (r) => r.estado)
    const byOrigen = countBy(rows, (r) => r.origenTipo)

    const context = `
DOMINIO: CAPA ambiental (acciones correctivas / preventivas)
Tabla Supabase: capa_acciones

RESUMEN
- Total CAPA: ${report.meta.total}
- Abiertas / en curso: ${report.meta.abiertas}
- Compromiso vencido: ${report.meta.vencidas}
- Cerradas: ${report.meta.cerradas}
- Prioridad alta abiertas: ${report.meta.altaPrioridad}
- Tasa de cierre: ${report.meta.pctCierre ?? '—'}%

POR ESTADO
${linesOf(byEstado) || '- Sin datos'}

POR ORIGEN
${linesOf(byOrigen) || '- Sin datos'}

ALERTAS
${report.insights.map((i) => `- [${i.level}] ${i.title}: ${i.text}`).join('\n') || '- Sin alertas'}

REGISTRO (hasta 40)
${
  report.detailRows
    .slice(0, 40)
    .map(
      (r) =>
        `- ${r.codigo || '—'} | ${r.tipoAccion} | ${r.origenTipo} | ${r.hallazgo.slice(0, 80)} | acción: ${r.accion.slice(0, 60)} | resp. ${r.responsable || '—'} | compromiso ${formatIsoDate(r.fechaCompromiso)} | ${r.estado} | riesgo ${r.risk}`,
    )
    .join('\n') || '- Sin CAPA'
}
`.trim()

    return {
      id: 'capa',
      label: 'CAPA',
      summary: `CAPA · ${report.meta.total} · abiertas ${report.meta.abiertas} · vencidas ${report.meta.vencidas}`,
      context,
    }
  }
