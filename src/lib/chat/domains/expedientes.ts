import { loadExpedientes } from '../../expedientesApi'
import { buildExpedientesReport } from '../../../data/expedientesReport'
import { formatIsoDate, formatNum } from '../../../data/expedientes'
import { linesOf, countBy } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadExpedientesDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadExpedientes()
    const report = buildExpedientesReport(rows)
    const byTema = countBy(rows, (r) => r.tema)
    const bySitio = countBy(rows, (r) => r.sitio)

    const context = `
DOMINIO: Expedientes documentales ambientales
Tabla Supabase: expedientes_ambientales

RESUMEN
- Total: ${report.meta.total}
- Vigentes: ${report.meta.vigentes}
- Con archivo URL: ${report.meta.conArchivo}
- Ligados a módulos: ${report.meta.ligados}
- Obsoletos: ${report.meta.obsoletos} · Borradores: ${report.meta.borradores}

POR TEMA
${linesOf(byTema) || '- Sin datos'}

POR SITIO
${linesOf(bySitio) || '- Sin datos'}

ALERTAS
${report.insights.map((i) => `- [${i.level}] ${i.title}: ${i.text}`).join('\n') || '- Sin alertas'}

EXPEDIENTES (hasta 40)
${
  report.detailRows
    .slice(0, 40)
    .map(
      (r) =>
        `- ${r.codigo || '—'} | ${r.titulo} | ${r.sitio} | ${r.tema} | ${r.tipoDocumento} v${r.version} | ${formatIsoDate(r.fechaDocumento)} | ${r.estado} | módulo ${r.moduloLigado || '—'} | URL ${r.archivoUrl ? 'sí' : 'no'}`,
    )
    .join('\n') || '- Sin expedientes'
}
`.trim()

    return {
      id: 'expedientes',
      label: 'Expedientes',
      summary: `Expedientes · ${formatNum(report.meta.total)} · vigentes ${formatNum(report.meta.vigentes)} · con archivo ${formatNum(report.meta.conArchivo)}`,
      context,
    }
  }
