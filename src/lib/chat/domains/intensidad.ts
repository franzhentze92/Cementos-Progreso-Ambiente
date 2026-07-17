import { loadEscenarios } from '../../intensidadApi'
import { loadCarbonCampaign } from '../../carbonApi'
import { buildCarbonReport } from '../../../data/carbonReport'
import { buildIntensidadReport } from '../../../data/intensidadReport'
import { formatNum } from '../../../data/intensidad'
import { linesOf, countBy } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadIntensidadDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const escenarios = await loadEscenarios()
    let carbon = null
    try {
      const camp = await loadCarbonCampaign()
      carbon = buildCarbonReport(camp.state)
    } catch {
      carbon = null
    }
    const report = buildIntensidadReport(carbon, escenarios)
    const byEstado = countBy(escenarios, (e) => e.estado)

    const context = `
DOMINIO: Intensidad de carbono Alicón + escenarios
Tablas: carbon_campaigns (monitoreo) + carbon_escenarios

NOTA METODOLÓGICA
- Intensidad kg CO2e/t es un PROXY operativo: (kWh×EF_elec + gal diesel×EF_diesel) / t cemento.
- Factores editables por escenario (default 0.45 kg/kWh y 10.21 kg/gal). No sustituye inventario GHG oficial.

LÍNEA BASE
- Planta: ${report.baseline.plant} · Año: ${report.baseline.year}
- Producción: ${formatNum(report.baseline.totalCementT, 1)} t
- Electricidad: ${formatNum(report.baseline.totalElecKwh, 0)} kWh · ${formatNum(report.baseline.avgKwhPerTon, 1)} kWh/t
- Diesel: ${formatNum(report.baseline.totalDieselGal, 1)} gal · ${formatNum(report.baseline.avgGalPerTon, 3)} gal/t
- Factor clinker: ${formatNum(report.baseline.avgClinkerFactorPct, 1)}%
- Intensidad proxy: ${formatNum(report.baseline.intensidadKgT, 1)} kg CO2e/t

ESCENARIOS (${escenarios.length})
${linesOf(byEstado) || '- Sin escenarios'}

PROYECCIONES
${
  report.scenarios
    .slice(0, 20)
    .map(
      (s) =>
        `- ${s.codigo || '—'} | ${s.escenarioNombre} | ${formatNum(s.intensidadKgT, 1)} kg/t | delta ${formatNum(s.deltaVsBasePct, 1)}% | meta ${s.cumpleMeta == null ? '—' : s.cumpleMeta ? 'cumple' : 'no'} | ${s.estado}`,
    )
    .join('\n') || '- Sin escenarios'
}

ALERTAS
${report.insights.map((i) => `- [${i.level}] ${i.title}: ${i.text}`).join('\n') || '- Sin alertas'}
`.trim()

    return {
      id: 'intensidad',
      label: 'Intensidad / escenarios',
      summary: `Intensidad · base ${formatNum(report.baseline.intensidadKgT, 1)} kg/t · ${escenarios.length} escenarios`,
      context,
    }
  }
