import { loadUmbrales } from '../../umbralesApi'
import { loadAgroMonitoreos } from '../../agroMonitoreosApi'
import { buildUmbralesReport } from '../../../data/umbralesReport'
import { umbralLabel, formatNum } from '../../../data/umbrales'
import { linesOf, countBy } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadUmbralesDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const [umbrales, monitoreos] = await Promise.all([
      loadUmbrales(),
      loadAgroMonitoreos(),
    ])
    const report = buildUmbralesReport(umbrales, monitoreos)
    const byCrit = countBy(umbrales, (u) => u.criticidad)

    const context = `
DOMINIO: Umbrales de monitoreo ambiental
Tabla Supabase: monitoreo_umbrales (+ evaluación vs agro_monitoreos)

RESUMEN
- Umbrales en catálogo: ${report.meta.totalUmbrales} (${report.meta.activos} activos)
- Mediciones evaluadas: ${report.meta.evaluaciones}
- Cumple: ${report.meta.cumple} · Excede: ${report.meta.excede}
- Sin umbral: ${report.meta.sinUmbral} · Sin dato: ${report.meta.sinDato}
- % cumplimiento automático: ${report.meta.cumplePct ?? '—'}%

CRITICIDAD CATÁLOGO
${linesOf(byCrit) || '- Sin datos'}

ALERTAS
${report.insights.map((i) => `- [${i.level}] ${i.title}: ${i.text}`).join('\n') || '- Sin alertas'}

EXCEDENCIAS (hasta 30)
${
  report.excedencias
    .slice(0, 30)
    .map(
      (e) =>
        `- ${e.fecha} | ${e.sede} | ${e.parametro}: ${formatNum(e.resultado, 3)} vs ${e.umbral} | ${e.criticidad}`,
    )
    .join('\n') || '- Sin excedencias'
}

CATÁLOGO (hasta 25)
${
  umbrales
    .slice(0, 25)
    .map(
      (u) =>
        `- ${u.parametro} (${u.tipoAgua || '—'}) | ${umbralLabel(u)} | ${u.criticidad} | ${u.activo ? 'activo' : 'inactivo'}`,
    )
    .join('\n') || '- Sin umbrales'
}
`.trim()

    return {
      id: 'umbrales',
      label: 'Umbrales',
      summary: `Umbrales · ${report.meta.activos} activos · excedencias ${report.meta.excede} · cumple ${report.meta.cumplePct ?? '—'}%`,
      context,
    }
  }
