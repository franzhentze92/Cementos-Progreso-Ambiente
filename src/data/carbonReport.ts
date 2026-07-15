/**
 * Aggregados y series para el reporte de monitoreo Alicon.
 * Derivados del mismo modelo que el formulario (sin supuestos de tCO₂e).
 */

import {
  MONITORING_MONTHS,
  calcElectricity,
  calcProduction,
  calcSupplies,
  calcWater,
  createInitialMonitoringState,
  parseNum,
  type MonitoringMonth,
  type MonitoringState,
} from './carbonMonitoring'

const SHORT: Record<MonitoringMonth, string> = {
  Enero: 'Ene',
  Febrero: 'Feb',
  Marzo: 'Mar',
  Abril: 'Abr',
  Mayo: 'May',
  Junio: 'Jun',
  Julio: 'Jul',
  Agosto: 'Ago',
  Septiembre: 'Sep',
  Octubre: 'Oct',
  Noviembre: 'Nov',
  Diciembre: 'Dic',
}

export type ReportInsight = {
  id: string
  level: 'Positivo' | 'Atención' | 'Crítico'
  title: string
  text: string
}

export type ReportKpi = {
  id: string
  label: string
  value: string
  unit: string
  hint: string
  delta?: number | null
  deltaLabel?: string
}

/** Ubicación aproximada Alicon (sin coordenada pública exacta en el Excel). */
export const ALICON_SITE = {
  id: 'gt-alicon',
  name: 'Alicon',
  country: 'Guatemala',
  region: 'Guatemala',
  type: 'Planta de molienda / cemento',
  lat: 14.5755,
  lng: -90.5552,
  coordinatesPrecision: 'aproximada' as const,
}

function monthsWithData(state: MonitoringState): MonitoringMonth[] {
  return MONITORING_MONTHS.filter((m) => {
    const p = calcProduction(state.production[m])
    const e = calcElectricity(state.electricity[m])
    const d = parseNum(state.fuel[m].dieselMovil)
    return p.prodTotal != null || e.total != null || d != null
  })
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null
  return ((curr - prev) / prev) * 100
}

export function buildCarbonReport(state: MonitoringState = createInitialMonitoringState()) {
  const activeMonths = monthsWithData(state)
  const year = state.meta.year || '2026'
  const plant = state.meta.plant || 'Alicon'

  const monthlyProduction = activeMonths.map((m) => {
    const row = state.production[m]
    const c = calcProduction(row)
    return {
      month: SHORT[m],
      monthFull: m,
      ugc: parseNum(row.prodUGC) ?? 0,
      cfb: parseNum(row.prodCFB) ?? 0,
      total: c.prodTotal ?? 0,
      clinkerIngreso: parseNum(row.clinkerIngreso) ?? 0,
      clinkerConsumo: parseNum(row.clinkerConsumo) ?? 0,
      factorUGC: c.factorUGC != null ? c.factorUGC * 100 : null,
      factorCFB: c.factorCFB != null ? c.factorCFB * 100 : null,
      factorPlanta: c.factorPlanta != null ? c.factorPlanta * 100 : null,
      caliza: parseNum(row.caliza) ?? 0,
      yeso: parseNum(row.yeso) ?? 0,
      aditivo: parseNum(row.aditivo) ?? 0,
      toba: parseNum(row.toba) ?? 0,
      puzolana: parseNum(row.puzolana) ?? 0,
    }
  })

  const monthlyElectricity = activeMonths.map((m) => {
    const row = state.electricity[m]
    const c = calcElectricity(row)
    const prod = calcProduction(state.production[m]).prodTotal
    const total = c.total ?? 0
    return {
      month: SHORT[m],
      produccion: parseNum(row.produccionCemento) ?? 0,
      servicios: parseNum(row.servicios) ?? 0,
      perdidas: parseNum(row.perdidas) ?? 0,
      red: parseNum(row.redElectrica) ?? 0,
      total,
      kwhPerTon: prod && prod > 0 ? total / prod : null,
    }
  })

  const monthlyFuel = activeMonths.map((m) => {
    const row = state.fuel[m]
    const prod = calcProduction(state.production[m]).prodTotal
    const diesel = parseNum(row.dieselMovil) ?? 0
    return {
      month: SHORT[m],
      dieselMovil: diesel,
      dieselGeneracion: parseNum(row.dieselGeneracion) ?? 0,
      glpControl: parseNum(row.glpControl) ?? 0,
      glpMontacargas: parseNum(row.glpMontacargas) ?? 0,
      galPerTon: prod && prod > 0 ? diesel / prod : null,
    }
  })

  const monthlyWater = activeMonths.map((m) => {
    const row = state.water[m]
    const c = calcWater(row)
    const prod = calcProduction(state.production[m]).prodTotal
    const total = c.consumoTotal ?? 0
    return {
      month: SHORT[m],
      pipas: parseNum(row.pipas) ?? 0,
      total,
      aguaHumana: parseNum(row.aguaHumana) ?? 0,
      m3PerTon: prod && prod > 0 ? total / prod : null,
    }
  })

  const monthlyWaste = activeMonths.map((m) => {
    const row = state.waste[m]
    const ordinarios = parseNum(row.ordinarios) ?? 0
    const peligrosos = parseNum(row.peligrosos) ?? 0
    const vertedero = parseNum(row.vertedero) ?? 0
    const reciclados = parseNum(row.reciclados) ?? 0
    const reutilizados = parseNum(row.reutilizados) ?? 0
    const coprocesamiento = parseNum(row.coprocesamiento) ?? 0
    const otra = parseNum(row.otraDisposicion) ?? 0
    const disposed = vertedero + reciclados + reutilizados + coprocesamiento + otra
    return {
      month: SHORT[m],
      ordinarios,
      peligrosos,
      vertedero,
      reciclados,
      reutilizados,
      coprocesamiento,
      otra,
      diversionPct:
        disposed > 0
          ? ((reciclados + reutilizados + coprocesamiento) / disposed) * 100
          : null,
    }
  })

  const monthlySupplies = activeMonths.map((m) => {
    const row = state.supplies[m]
    const c = calcSupplies(row)
    return {
      month: SHORT[m],
      sacosMillares: parseNum(row.sacosMillares) ?? 0,
      sacosTon: c.sacosTon ?? 0,
      reprocesado: c.cementoReprocesado ?? 0,
      rotos: parseNum(row.sacosRotosEnvasado) ?? 0,
    }
  })

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

  const totalCement = sum(monthlyProduction.map((r) => r.total))
  const totalUGC = sum(monthlyProduction.map((r) => r.ugc))
  const totalCFB = sum(monthlyProduction.map((r) => r.cfb))
  const totalClinkerIn = sum(monthlyProduction.map((r) => r.clinkerIngreso))
  const totalClinkerOut = sum(monthlyProduction.map((r) => r.clinkerConsumo))
  const totalElec = sum(monthlyElectricity.map((r) => r.total))
  const totalDiesel = sum(monthlyFuel.map((r) => r.dieselMovil))
  const totalWater = sum(monthlyWater.map((r) => r.total))
  const totalWasteOrd = sum(monthlyWaste.map((r) => r.ordinarios))
  const totalReciclados = sum(monthlyWaste.map((r) => r.reciclados))
  const totalReutilizados = sum(monthlyWaste.map((r) => r.reutilizados))
  const totalVertedero = sum(monthlyWaste.map((r) => r.vertedero))
  const totalSacos = sum(monthlySupplies.map((r) => r.sacosMillares))
  const totalReproc = sum(monthlySupplies.map((r) => r.reprocesado))

  const avgFactorPlanta = avg(
    monthlyProduction
      .map((r) => r.factorPlanta)
      .filter((n): n is number => n != null),
  )
  const avgKwhPerTon = avg(
    monthlyElectricity
      .map((r) => r.kwhPerTon)
      .filter((n): n is number => n != null),
  )

  const last = monthlyProduction[monthlyProduction.length - 1]
  const prev = monthlyProduction[monthlyProduction.length - 2]
  const lastElec = monthlyElectricity[monthlyElectricity.length - 1]
  const prevElec = monthlyElectricity[monthlyElectricity.length - 2]

  const prodDelta =
    last && prev ? pctChange(last.total, prev.total) : null
  const factorDelta =
    last?.factorPlanta != null && prev?.factorPlanta != null
      ? last.factorPlanta - prev.factorPlanta
      : null
  const kwhDelta =
    lastElec?.kwhPerTon != null && prevElec?.kwhPerTon != null
      ? pctChange(lastElec.kwhPerTon, prevElec.kwhPerTon)
      : null

  const materialMix = [
    { name: 'Clinker consumido', value: totalClinkerOut, fill: '#047935' },
    {
      name: 'Caliza',
      value: sum(monthlyProduction.map((r) => r.caliza)),
      fill: '#5ab64b',
    },
    {
      name: 'TOBA',
      value: sum(monthlyProduction.map((r) => r.toba)),
      fill: '#c2d500',
    },
    {
      name: 'Aditivo molienda',
      value: sum(monthlyProduction.map((r) => r.aditivo)),
      fill: '#5e5f61',
    },
    {
      name: 'Yeso',
      value: sum(monthlyProduction.map((r) => r.yeso)),
      fill: '#8b7355',
    },
    {
      name: 'Puzolana',
      value: sum(monthlyProduction.map((r) => r.puzolana)),
      fill: '#347744',
    },
  ].filter((x) => x.value > 0)

  const cementMix = [
    { name: 'UGC', value: totalUGC, fill: '#047935' },
    { name: 'CFB', value: totalCFB, fill: '#c2d500' },
  ].filter((x) => x.value > 0)

  const wasteDisposition = [
    { name: 'Vertedero', value: totalVertedero, fill: '#5e5f61' },
    { name: 'Reciclados', value: totalReciclados, fill: '#047935' },
    { name: 'Reutilizados', value: totalReutilizados, fill: '#5ab64b' },
    {
      name: 'Coprocesamiento',
      value: sum(monthlyWaste.map((r) => r.coprocesamiento)),
      fill: '#c2d500',
    },
  ].filter((x) => x.value > 0)

  const wasteDisposedTotal = wasteDisposition.reduce((a, b) => a + b.value, 0)
  const diversionRate =
    wasteDisposedTotal > 0
      ? ((totalReciclados + totalReutilizados) / wasteDisposedTotal) * 100
      : null

  const fmt = (n: number | null, d = 0) =>
    n == null
      ? '—'
      : n.toLocaleString('es-GT', {
          maximumFractionDigits: d,
          minimumFractionDigits: 0,
        })

  const periodLabel =
    activeMonths.length > 0
      ? `${SHORT[activeMonths[0]]}–${SHORT[activeMonths[activeMonths.length - 1]]} ${year}`
      : year

  const kpis: ReportKpi[] = [
    {
      id: 'prod',
      label: 'Producción cemento',
      value: fmt(totalCement, 0),
      unit: 'ton',
      hint: `UGC + CFB · ${periodLabel}`,
      delta: prodDelta,
      deltaLabel: last && prev ? `vs ${prev.month}` : undefined,
    },
    {
      id: 'factor',
      label: 'Factor clinker planta',
      value: avgFactorPlanta != null ? fmt(avgFactorPlanta, 1) : '—',
      unit: '%',
      hint: 'Promedio mensual ponderado simple',
      delta: factorDelta,
      deltaLabel:
        factorDelta != null && last && prev
          ? `vs ${prev.month}`
          : undefined,
    },
    {
      id: 'elec',
      label: 'Energía eléctrica',
      value: fmt(totalElec / 1000, 0),
      unit: 'MWh',
      hint: `${fmt(avgKwhPerTon, 0)} kWh/t cemento (prom.)`,
      delta: kwhDelta,
      deltaLabel: kwhDelta != null ? 'kWh/t vs mes previa' : undefined,
    },
    {
      id: 'diesel',
      label: 'Diésel móvil',
      value: fmt(totalDiesel, 0),
      unit: 'gal',
      hint:
        totalCement > 0
          ? `${fmt(totalDiesel / totalCement, 3)} gal/t cemento`
          : 'Flota propia',
      delta: null,
    },
  ]

  const insights: ReportInsight[] = []

  if (avgFactorPlanta != null) {
    insights.push({
      id: 'factor',
      level: avgFactorPlanta > 70 ? 'Atención' : 'Positivo',
      title:
        avgFactorPlanta > 70
          ? 'Factor clinker elevado'
          : 'Factor clinker en rango controlado',
      text: `Promedio ${fmt(avgFactorPlanta, 1)}% en ${periodLabel}. Menor clinker por tonelada suele correlacionar con menor huella de proceso.`,
    })
  }

  const peakElec = [...monthlyElectricity].sort(
    (a, b) => (b.kwhPerTon ?? 0) - (a.kwhPerTon ?? 0),
  )[0]
  if (peakElec?.kwhPerTon != null && avgKwhPerTon != null) {
    insights.push({
      id: 'elec-peak',
      level:
        peakElec.kwhPerTon > avgKwhPerTon * 1.08 ? 'Atención' : 'Positivo',
      title: `Pico de intensidad eléctrica en ${peakElec.month}`,
      text: `${fmt(peakElec.kwhPerTon, 0)} kWh/t vs promedio ${fmt(avgKwhPerTon, 0)} kWh/t. Revisar mix de molienda y servicios.`,
    })
  }

  if (diversionRate != null) {
    insights.push({
      id: 'waste',
      level: diversionRate >= 50 ? 'Positivo' : 'Atención',
      title: `Desvío de residuos ${fmt(diversionRate, 0)}%`,
      text: `De ${fmt(wasteDisposedTotal, 1)} t dispuestas: ${fmt(totalReciclados + totalReutilizados, 1)} t recicladas/reutilizadas vs ${fmt(totalVertedero, 1)} t a vertedero.`,
    })
  }

  if (totalClinkerIn > totalClinkerOut) {
    insights.push({
      id: 'stock',
      level: 'Positivo',
      title: 'Stock de clinker en acumulación neta',
      text: `Ingreso ${fmt(totalClinkerIn, 0)} t vs consumo ${fmt(totalClinkerOut, 0)} t en el periodo (${fmt(totalClinkerIn - totalClinkerOut, 0)} t de balance positivo).`,
    })
  }

  const plantSummary = {
    ...ALICON_SITE,
    plant,
    year,
    periodLabel,
    totalCement,
    avgFactorPlanta,
    avgKwhPerTon,
    totalElec,
    totalDiesel,
    totalWater,
    diversionRate,
    waterConfig: state.waterConfig,
  }

  return {
    meta: {
      plant,
      year,
      periodLabel,
      version: state.meta.version,
      responsible: state.meta.responsible,
      monthsReported: activeMonths.length,
      methodology:
        'Monitoreo operativo Alicon · actividad (sin factores de emisión GHG aún)',
    },
    kpis,
    insights,
    monthlyProduction,
    monthlyElectricity,
    monthlyFuel,
    monthlyWater,
    monthlyWaste,
    monthlySupplies,
    materialMix,
    cementMix,
    wasteDisposition,
    totals: {
      totalCement,
      totalUGC,
      totalCFB,
      totalClinkerIn,
      totalClinkerOut,
      totalElec,
      totalDiesel,
      totalWater,
      totalWasteOrd,
      totalSacos,
      totalReproc,
      avgFactorPlanta,
      avgKwhPerTon,
      diversionRate,
    },
    plantSummary,
  }
}

export type CarbonReport = ReturnType<typeof buildCarbonReport>

/** Snapshot del reporte con datos del Excel precargado. */
export const CARBON_REPORT = buildCarbonReport()
