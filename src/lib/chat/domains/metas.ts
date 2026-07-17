import { loadMetas } from '../../metasApi'
import { buildMetasReport } from '../../../data/metasReport'
import { formatNum } from '../../../data/metas'
import { linesOf, countBy } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadMetasDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadMetas()
    const report = buildMetasReport(rows)
    const byCat = countBy(rows, (r) => r.categoria)
    const byUnidad = countBy(rows, (r) => r.unidadNegocio)

    const context = `
DOMINIO: Metas y KPIs ambientales
Tabla Supabase: metas_ambientales

RESUMEN
- Total metas: ${report.meta.total}
- Cumplidas: ${report.meta.cumplidas}
- En curso: ${report.meta.enCurso}
- En riesgo: ${report.meta.enRiesgo}
- No cumplidas / críticas: ${report.meta.noCumplidas}
- Avance promedio: ${report.meta.avgProgress ?? '—'}%

POR CATEGORÍA
${linesOf(byCat) || '- Sin datos'}

POR UNIDAD
${linesOf(byUnidad) || '- Sin datos'}

ALERTAS
${report.insights.map((i) => `- [${i.level}] ${i.title}: ${i.text}`).join('\n') || '- Sin alertas'}

REGISTRO (hasta 40)
${
  report.detailRows
    .slice(0, 40)
    .map(
      (r) =>
        `- ${r.codigo || '—'} | ${r.indicador} | meta ${formatNum(r.metaValor, 2)} ${r.unidadMedida} | actual ${r.valorActual == null ? '—' : formatNum(r.valorActual, 2)} | avance ${r.progress ?? '—'}% | ${r.estadoDerivado} | riesgo ${r.risk} | ${r.sitio || '—'}`,
    )
    .join('\n') || '- Sin metas'
}
`.trim()

    return {
      id: 'metas',
      label: 'Metas / KPIs',
      summary: `Metas · ${report.meta.total} · riesgo ${report.meta.enRiesgo + report.meta.noCumplidas} · avance ${report.meta.avgProgress ?? '—'}%`,
      context,
    }
  }
