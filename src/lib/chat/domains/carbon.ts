import { buildCarbonReport } from '../../../data/carbonReport'
import {
  MONITORING_MONTHS,
  calcElectricity,
  calcProduction,
  calcSupplies,
  calcWater,
  parseNum,
} from '../../../data/carbonMonitoring'
import { loadCarbonCampaign } from '../../carbonApi'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

function fmt(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('es-GT', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

/** Carga datos vivos de huella Alicon y arma contexto para el copiloto. */
export const loadCarbonDomain: ChatDomainLoader = async (): Promise<ChatDomainSnapshot> => {
  const { state, ref } = await loadCarbonCampaign()
  const report = buildCarbonReport(state)
  const { meta, totals, insights, monthlyProduction, monthlyElectricity, monthlyFuel } =
    report

  const monthlyLines = MONITORING_MONTHS.filter((m) => {
    const p = calcProduction(state.production[m])
    return p.prodTotal != null && p.prodTotal > 0
  }).map((m) => {
    const prod = calcProduction(state.production[m])
    const elec = calcElectricity(state.electricity[m])
    const diesel = parseNum(state.fuel[m].dieselMovil)
    const water = calcWater(state.water[m])
    const supplies = calcSupplies(state.supplies[m])
    const waste = state.waste[m]
    return [
      `- ${m}:`,
      `cemento ${fmt(prod.prodTotal, 0)} t (UGC ${fmt(parseNum(state.production[m].prodUGC), 0)} / CFB ${fmt(parseNum(state.production[m].prodCFB), 0)})`,
      `factor clinker planta ${prod.factorPlanta != null ? fmt(prod.factorPlanta * 100, 1) + '%' : '—'}`,
      `electricidad ${fmt(elec.total, 0)} kWh`,
      `diésel móvil ${fmt(diesel, 0)} gal`,
      `agua ${fmt(water.consumoTotal, 1)} m³`,
      `sacos ${fmt(parseNum(state.supplies[m].sacosMillares), 1)} millares`,
      `reprocesado ${fmt(supplies.cementoReprocesado, 1)} t`,
      `residuos ordinarios ${fmt(parseNum(waste.ordinarios), 2)} t`,
    ].join(' | ')
  })

  const context = `
DOMINIO: Huella de carbono / monitoreo operativo
Planta: ${meta.plant}
Año campaña: ${meta.year}
Periodo con datos: ${meta.periodLabel}
Campaign ID: ${ref.campaignId}
Plant ID: ${ref.plantId}
Versión planilla: ${meta.version || '—'}
Responsable: ${meta.responsible || 'no indicado'}
Metodología: ${meta.methodology}

TOTALES DEL PERIODO
- Producción cemento: ${fmt(totals.totalCement, 0)} t
- UGC: ${fmt(totals.totalUGC, 0)} t · CFB: ${fmt(totals.totalCFB, 0)} t
- Clinker ingreso: ${fmt(totals.totalClinkerIn, 0)} t · consumo: ${fmt(totals.totalClinkerOut, 0)} t
- Factor clinker promedio: ${fmt(totals.avgFactorPlanta, 1)} %
- Electricidad: ${fmt(totals.totalElec / 1000, 0)} MWh · intensidad ${fmt(totals.avgKwhPerTon, 0)} kWh/t
- Diésel móvil: ${fmt(totals.totalDiesel, 0)} gal
- Agua (abastecimiento): ${fmt(totals.totalWater, 0)} m³
- Sacos: ${fmt(totals.totalSacos, 0)} millares · cemento reprocesado ${fmt(totals.totalReproc, 1)} t
- Desvío residuos (reciclado+reutilizado): ${fmt(totals.diversionRate, 0)} %
- Residuos ordinarios: ${fmt(totals.totalWasteOrd, 1)} t

KPIs
${report.kpis.map((k) => `- ${k.label}: ${k.value} ${k.unit}${k.hint ? ` (${k.hint})` : ''}`).join('\n')}

INSIGHTS
${insights.map((i) => `- [${i.level}] ${i.title}: ${i.text}`).join('\n') || '- Sin insights'}

DETALLE MENSUAL
${monthlyLines.join('\n') || '- Sin meses con datos'}

SERIE PRODUCCIÓN (resumen)
${monthlyProduction.map((r) => `- ${r.month}: total ${fmt(r.total, 0)} t, factor planta ${fmt(r.factorPlanta, 1)}%`).join('\n')}

SERIE ELECTRICIDAD
${monthlyElectricity.map((r) => `- ${r.month}: ${fmt(r.total, 0)} kWh, ${fmt(r.kwhPerTon, 0)} kWh/t`).join('\n')}

SERIE DIÉSEL MÓVIL
${monthlyFuel.map((r) => `- ${r.month}: ${fmt(r.dieselMovil, 0)} gal, ${fmt(r.galPerTon, 3)} gal/t`).join('\n')}

Notas:
- Estos datos son actividad operativa real en Supabase (tabla de monitoreo Alicon).
- Aún NO hay factores de emisión oficiales; no inventes tCO₂e ni alcances GHG exactos.
- Si el usuario pide un mes sin datos, dilo claramente.
`.trim()

  const summary = `${meta.plant} · ${meta.periodLabel} · ${fmt(totals.totalCement, 0)} t cemento · factor clinker ${fmt(totals.avgFactorPlanta, 1)}% · ${fmt(totals.totalElec / 1000, 0)} MWh`

  return {
    id: 'carbon',
    label: 'Huella de carbono (Alicon)',
    summary,
    context,
  }
}
