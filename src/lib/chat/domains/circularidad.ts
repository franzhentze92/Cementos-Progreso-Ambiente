import { loadCircularidad } from '../../circularidadApi'
import { loadAgroResiduos } from '../../agroResiduosApi'
import { buildCircularidadReport } from '../../../data/circularidadReport'
import { formatNum } from '../../../data/circularidad'
import { linesOf, countBy } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadCircularidadDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const [flujos, agro] = await Promise.all([
      loadCircularidad(),
      loadAgroResiduos().catch(() => []),
    ])
    const report = buildCircularidadReport(flujos, agro)
    const byRuta = countBy(flujos, (f) => f.ruta)
    const bySede = countBy(flujos, (f) => f.sede)

    const context = `
DOMINIO: Circularidad / valorización de residuos
Tabla Supabase: circularidad_flujos (+ referencia agro_gestion_residuos)

RESUMEN
- Flujos: ${report.meta.totalFlujos}
- Lbs totales: ${formatNum(report.meta.lbsTotal, 0)}
- Lbs valorizadas: ${formatNum(report.meta.lbsValorizadas, 0)}
- Tasa valorización: ${report.meta.tasaValorizacionPct ?? '—'}%
- Costo GTQ: ${formatNum(report.meta.costoTotal, 0)}
- Ref. Agro valorización: ${report.meta.agroValorizacionPct ?? '—'}% (${formatNum(report.meta.agroLbs, 0)} lbs)

POR RUTA
${linesOf(byRuta) || '- Sin datos'}

POR SEDE
${linesOf(bySede) || '- Sin datos'}

ALERTAS
${report.insights.map((i) => `- [${i.level}] ${i.title}: ${i.text}`).join('\n') || '- Sin alertas'}

FLUJOS (hasta 40)
${
  report.detailRows
    .slice(0, 40)
    .map(
      (r) =>
        `- ${r.codigo || '—'} | ${r.fecha || '—'} | ${r.sede} | ${r.tipoResiduo} | ${r.ruta} | ${formatNum(r.cantidadLbs, 0)} lbs | gestor ${r.gestor || '—'} | man. ${r.manifiesto || '—'} | ${r.valorizado ? 'valorizado' : 'disposición'} | ${r.estado}`,
    )
    .join('\n') || '- Sin flujos'
}
`.trim()

    return {
      id: 'circularidad',
      label: 'Circularidad',
      summary: `Circularidad · ${report.meta.totalFlujos} flujos · valorización ${report.meta.tasaValorizacionPct ?? '—'}%`,
      context,
    }
  }
