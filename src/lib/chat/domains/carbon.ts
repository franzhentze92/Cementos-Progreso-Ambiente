import { buildCarbonReport } from '../../../data/carbonReport'
import {
  BIODIVERSITY_ROWS,
  BIODIVERSITY_YEARS,
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

function argMax<T>(
  items: T[],
  value: (item: T) => number,
): T | undefined {
  if (!items.length) return undefined
  return items.reduce((best, item) =>
    value(item) > value(best) ? item : best,
  )
}

/** Carga datos vivos de huella Alicon y arma contexto para el copiloto. */
export const loadCarbonDomain: ChatDomainLoader = async (): Promise<ChatDomainSnapshot> => {
  const { state, ref } = await loadCarbonCampaign()
  const report = buildCarbonReport(state)
  const { meta, totals, insights, monthlyProduction, monthlyElectricity, monthlyFuel } =
    report

  const monthlyRows = MONITORING_MONTHS.filter((m) => {
    const p = calcProduction(state.production[m])
    return p.prodTotal != null && p.prodTotal > 0
  }).map((m) => {
    const prod = calcProduction(state.production[m])
    const elec = calcElectricity(state.electricity[m])
    const diesel = parseNum(state.fuel[m].dieselMovil) ?? 0
    const water = calcWater(state.water[m])
    const supplies = calcSupplies(state.supplies[m])
    const waste = state.waste[m]
    const clinkerIn = parseNum(state.production[m].clinkerIngreso) ?? 0
    const clinkerOut = parseNum(state.production[m].clinkerConsumo) ?? 0
    return {
      month: m,
      cemento: prod.prodTotal ?? 0,
      ugc: parseNum(state.production[m].prodUGC) ?? 0,
      cfb: parseNum(state.production[m].prodCFB) ?? 0,
      clinkerIn,
      clinkerOut,
      factorPct: prod.factorPlanta != null ? prod.factorPlanta * 100 : null,
      elec: elec.total ?? 0,
      diesel,
      water: water.consumoTotal ?? 0,
      sacos: parseNum(state.supplies[m].sacosMillares) ?? 0,
      reproc: supplies.cementoReprocesado ?? 0,
      wasteOrd: parseNum(waste.ordinarios) ?? 0,
      wasteHaz: parseNum(waste.peligrosos) ?? 0,
    }
  })

  const monthlyLines = monthlyRows.map((r) =>
    [
      `- ${r.month}:`,
      `producción cemento ${fmt(r.cemento, 0)} t (UGC ${fmt(r.ugc, 0)} / CFB ${fmt(r.cfb, 0)})`,
      `clinker ingreso ${fmt(r.clinkerIn, 0)} t`,
      `clinker consumo ${fmt(r.clinkerOut, 0)} t`,
      `factor clinker planta ${r.factorPct != null ? fmt(r.factorPct, 1) + '%' : '—'}`,
      `electricidad ${fmt(r.elec, 0)} kWh`,
      `diésel móvil ${fmt(r.diesel, 0)} gal`,
      `agua ${fmt(r.water, 1)} m³`,
      `sacos ${fmt(r.sacos, 1)} millares`,
      `reprocesado ${fmt(r.reproc, 1)} t`,
      `residuos ordinarios ${fmt(r.wasteOrd, 2)} t`,
      `peligrosos ${fmt(r.wasteHaz, 2)} t`,
    ].join(' | '),
  )

  const topCement = argMax(monthlyRows, (r) => r.cemento)
  const topClinkerOut = argMax(monthlyRows, (r) => r.clinkerOut)
  const topClinkerIn = argMax(monthlyRows, (r) => r.clinkerIn)
  const topFactor = argMax(monthlyRows, (r) => r.factorPct ?? -1)
  const topDiesel = argMax(monthlyRows, (r) => r.diesel)
  const topElec = argMax(monthlyRows, (r) => r.elec)

  const bioLines = BIODIVERSITY_ROWS.map((row) => {
    const vals = BIODIVERSITY_YEARS.map((y) => {
      const v = state.biodiversity[row.key]?.[y]
      return `${y}=${v?.trim() || '—'}`
    }).join(', ')
    return `- [${row.group}] ${row.label}: ${vals}`
  })
  const wc = state.waterConfig

  const context = `
DOMINIO: Huella de carbono / monitoreo operativo
Tablas Supabase: carbon_plants, carbon_campaigns, carbon_production_monthly, carbon_fuel_monthly, carbon_electricity_monthly, carbon_supplies_monthly, carbon_water_monthly, carbon_water_config, carbon_waste_monthly, carbon_biodiversity
Planta: ${meta.plant}
Año campaña: ${meta.year}
Periodo con datos: ${meta.periodLabel}
Campaign ID: ${ref.campaignId}
Plant ID: ${ref.plantId}
Versión planilla: ${meta.version || '—'}
Responsable: ${meta.responsible || 'no indicado'}
Metodología: ${meta.methodology}

DEFINICIONES (OBLIGATORIO RESPETAR)
- "Producción de cemento" = toneladas de cemento (UGC+CFB+otro). NO es clinker.
- "Consumo de clinker" / "clinker consumo" = toneladas de clinker consumidas ese mes. Métrica distinta.
- "Ingreso de clinker" / "clinker ingreso" = toneladas de clinker que entraron ese mes.
- "Factor clinker" = % (clinker consumo / producción cemento). NO es una cantidad en toneladas.
- Nunca respondas "mayor consumo de clinker" citando producción de cemento ni solo el factor %.
- Si hay sección RANKINGS PRECALCULADOS, úsala; no recalcules a ojo.

RANKINGS PRECALCULADOS (fuente de verdad para máximos/mínimos)
- Mayor producción cemento: ${topCement ? `${topCement.month} con ${fmt(topCement.cemento, 0)} t cemento` : '—'}
- Mayor consumo de clinker: ${topClinkerOut ? `${topClinkerOut.month} con ${fmt(topClinkerOut.clinkerOut, 0)} t clinker consumido (cemento ese mes: ${fmt(topClinkerOut.cemento, 0)} t)` : '—'}
- Mayor ingreso de clinker: ${topClinkerIn ? `${topClinkerIn.month} con ${fmt(topClinkerIn.clinkerIn, 0)} t` : '—'}
- Mayor factor clinker (%): ${topFactor && topFactor.factorPct != null ? `${topFactor.month} con ${fmt(topFactor.factorPct, 1)}%` : '—'}
- Mayor diésel móvil: ${topDiesel ? `${topDiesel.month} con ${fmt(topDiesel.diesel, 0)} gal` : '—'}
- Mayor electricidad: ${topElec ? `${topElec.month} con ${fmt(topElec.elec, 0)} kWh` : '—'}

TOTALES DEL PERIODO
- Producción cemento: ${fmt(totals.totalCement, 0)} t
- UGC: ${fmt(totals.totalUGC, 0)} t · CFB: ${fmt(totals.totalCFB, 0)} t
- Clinker ingreso: ${fmt(totals.totalClinkerIn, 0)} t · clinker consumo: ${fmt(totals.totalClinkerOut, 0)} t
- Factor clinker promedio: ${fmt(totals.avgFactorPlanta, 1)} %
- Electricidad: ${fmt(totals.totalElec / 1000, 0)} MWh · intensidad ${fmt(totals.avgKwhPerTon, 0)} kWh/t
- Diésel móvil: ${fmt(totals.totalDiesel, 0)} gal
- Agua (abastecimiento): ${fmt(totals.totalWater, 0)} m³
- Sacos: ${fmt(totals.totalSacos, 0)} millares · cemento reprocesado ${fmt(totals.totalReproc, 1)} t
- Desvío residuos (reciclado+reutilizado): ${fmt(totals.diversionRate, 0)} %
- Residuos ordinarios: ${fmt(totals.totalWasteOrd, 1)} t

CONFIG AGUA
- Disposición residual: ${wc.disposicionResidual || '—'}
- Puntos de descarga: ${wc.puntosDescarga || '—'}
- Métodos de tratamiento: ${wc.metodosTratamiento || '—'}

BIODIVERSIDAD (UICN / CITES / LEA)
${bioLines.join('\n') || '- Sin datos de biodiversidad'}

KPIs
${report.kpis.map((k) => `- ${k.label}: ${k.value} ${k.unit}${k.hint ? ` (${k.hint})` : ''}`).join('\n')}

INSIGHTS
${insights.map((i) => `- [${i.level}] ${i.title}: ${i.text}`).join('\n') || '- Sin insights'}

DETALLE MENSUAL
${monthlyLines.join('\n') || '- Sin meses con datos'}

SERIE PRODUCCIÓN Y CLINKER
${monthlyProduction
  .map(
    (r) =>
      `- ${r.monthFull ?? r.month}: cemento ${fmt(r.total, 0)} t | clinker ingreso ${fmt(r.clinkerIngreso, 0)} t | clinker consumo ${fmt(r.clinkerConsumo, 0)} t | factor ${fmt(r.factorPlanta, 1)}%`,
  )
  .join('\n')}

SERIE ELECTRICIDAD
${monthlyElectricity.map((r) => `- ${r.month}: ${fmt(r.total, 0)} kWh, ${fmt(r.kwhPerTon, 0)} kWh/t`).join('\n')}

SERIE DIÉSEL MÓVIL
${monthlyFuel.map((r) => `- ${r.month}: ${fmt(r.dieselMovil, 0)} gal, ${fmt(r.galPerTon, 3)} gal/t`).join('\n')}

Notas:
- Estos datos son actividad operativa real (monitoreo Alicon).
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
