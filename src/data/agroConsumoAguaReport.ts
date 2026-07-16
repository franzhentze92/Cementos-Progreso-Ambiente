/**
 * Agregados y series para el reporte Operaciones · Agroprogreso · Consumo de agua.
 * Solo datos reales de agro_consumo_agua (sin supuestos).
 */

import {
  AGRO_SEDES,
  MONITORING_MONTHS,
  fechaFromYearMonth,
  formatNum,
  monthFromFecha,
  yearFromFecha,
  type AgroConsumoAguaRecord,
  type AgroSede,
  type MonitoringMonth,
} from './agroConsumoAgua'

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

const SITE_COLORS = [
  '#047935',
  '#5ab64b',
  '#c2d500',
  '#1f3d2a',
  '#8b7355',
  '#3d7ea6',
  '#d4a017',
  '#6b8e6b',
  '#2a5238',
]

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

export type AgroAguaReport = {
  meta: {
    years: number[]
    selectedYear: number | 'all'
    periodLabel: string
    sedeCount: number
    sitioCount: number
    recordsWithValue: number
    totalRecords: number
    coveragePct: number
  }
  kpis: ReportKpi[]
  insights: ReportInsight[]
  monthlyBySede: Array<{
    month: string
    monthFull: MonitoringMonth
    year: number
    fecha: string
    pilar: number
    sanMiguel: number
    total: number
  }>
  monthlyTotal: Array<{
    month: string
    label: string
    total: number
    sitiosActivos: number
  }>
  sedeShare: Array<{ name: string; value: number; fill: string }>
  sitioRanking: Array<{
    name: string
    sede: string
    value: number
    fill: string
    share: number
  }>
  sitioMonthly: Array<Record<string, string | number>>
  sitioKeys: Array<{ key: string; label: string; fill: string }>
  completeness: Array<{
    sede: string
    sitio: string
    monthsWithData: number
    monthsTotal: number
    coveragePct: number
    total: number
  }>
  detailRows: Array<{
    fecha: string
    mes: string
    sede: string
    sitio: string
    consumo: number
  }>
  totals: {
    totalM3: number
    avgMonthly: number | null
    topSitio: string | null
    topSede: string | null
  }
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null
  return ((curr - prev) / prev) * 100
}

function valued(records: AgroConsumoAguaRecord[]) {
  return records.filter((r) => r.consumoM3 != null && !Number.isNaN(r.consumoM3))
}

export function availableYears(records: AgroConsumoAguaRecord[]): number[] {
  const set = new Set(valued(records).map((r) => yearFromFecha(r.fecha)))
  return [...set].sort((a, b) => a - b)
}

export function buildAgroAguaReport(
  records: AgroConsumoAguaRecord[],
  selectedYear: number | 'all' = 'all',
): AgroAguaReport {
  const years = availableYears(records)
  const yearFilter =
    selectedYear === 'all'
      ? records
      : records.filter((r) => yearFromFecha(r.fecha) === selectedYear)

  const withValue = valued(yearFilter)
  const totalM3 = withValue.reduce((a, r) => a + (r.consumoM3 as number), 0)

  const periodDates = [...new Set(withValue.map((r) => r.fecha))].sort()
  const periodLabel =
    !periodDates.length
      ? 'Sin datos'
      : selectedYear === 'all'
        ? `${periodDates[0].slice(0, 7)} → ${periodDates.at(-1)!.slice(0, 7)}`
        : `Año ${selectedYear}`

  type MonthBucket = {
    fecha: string
    year: number
    month: MonitoringMonth
    pilar: number
    sanMiguel: number
    sitios: Set<string>
  }

  const monthlyMap = new Map<string, MonthBucket>()

  for (const r of withValue) {
    const month = monthFromFecha(r.fecha)
    if (!month) continue
    let bucket = monthlyMap.get(r.fecha)
    if (!bucket) {
      bucket = {
        fecha: r.fecha,
        year: yearFromFecha(r.fecha),
        month,
        pilar: 0,
        sanMiguel: 0,
        sitios: new Set<string>(),
      }
      monthlyMap.set(r.fecha, bucket)
    }
    if (r.sede === 'Finca El Pilar') bucket.pilar += r.consumoM3 as number
    else bucket.sanMiguel += r.consumoM3 as number
    bucket.sitios.add(`${r.sede}::${r.sitioConsumo}`)
  }

  const monthlyBySede = [...monthlyMap.values()]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((b) => ({
      month: SHORT[b.month],
      monthFull: b.month,
      year: b.year,
      fecha: b.fecha,
      pilar: Math.round(b.pilar * 100) / 100,
      sanMiguel: Math.round(b.sanMiguel * 100) / 100,
      total: Math.round((b.pilar + b.sanMiguel) * 100) / 100,
    }))

  const monthlyTotal = monthlyBySede.map((b) => ({
    month: b.month,
    label: selectedYear === 'all' ? `${b.month} ${String(b.year).slice(2)}` : b.month,
    total: b.total,
    sitiosActivos: monthlyMap.get(b.fecha)?.sitios.size ?? 0,
  }))

  // Sede share
  const sedeTotals: Record<AgroSede, number> = {
    'Finca El Pilar': 0,
    'Finca San Miguel': 0,
  }
  for (const r of withValue) {
    sedeTotals[r.sede] += r.consumoM3 as number
  }
  const sedeShare = (Object.entries(sedeTotals) as [AgroSede, number][])
    .filter(([, v]) => v > 0)
    .map(([name, value], i) => ({
      name,
      value: Math.round(value * 100) / 100,
      fill: i === 0 ? '#047935' : '#5ab64b',
    }))

  // Sitio ranking
  const sitioTotals = new Map<string, { sede: string; sitio: string; value: number }>()
  for (const r of withValue) {
    const key = `${r.sede}::${r.sitioConsumo}`
    const prev = sitioTotals.get(key) ?? {
      sede: r.sede,
      sitio: r.sitioConsumo,
      value: 0,
    }
    prev.value += r.consumoM3 as number
    sitioTotals.set(key, prev)
  }
  const sitioRanking = [...sitioTotals.values()]
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({
      name: s.sitio,
      sede: s.sede,
      value: Math.round(s.value * 100) / 100,
      fill: SITE_COLORS[i % SITE_COLORS.length],
      share: totalM3 > 0 ? (s.value / totalM3) * 100 : 0,
    }))

  // Sitio monthly stacked series (top sitios + rest)
  const sitioKeys = sitioRanking.slice(0, 6).map((s, i) => ({
    key: `${s.sede}::${s.name}`,
    label: s.name,
    fill: SITE_COLORS[i % SITE_COLORS.length],
  }))

  const sitioMonthly = monthlyBySede.map((m) => {
    const row: Record<string, string | number> = {
      month: selectedYear === 'all' ? `${m.month} ${String(m.year).slice(2)}` : m.month,
      fecha: m.fecha,
    }
    for (const sk of sitioKeys) {
      const [sede, sitio] = sk.key.split('::')
      const hit = withValue.find(
        (r) =>
          r.fecha === m.fecha &&
          r.sede === sede &&
          r.sitioConsumo === sitio,
      )
      row[sk.key] = hit?.consumoM3 ?? 0
    }
    return row
  })

  // Completeness per sitio across selected period months
  const monthsInScope =
    selectedYear === 'all'
      ? periodDates
      : MONITORING_MONTHS.map((mo) =>
          fechaFromYearMonth(selectedYear, mo),
        )

  const completeness = (Object.entries(AGRO_SEDES) as [AgroSede, readonly string[]][])
    .flatMap(([sede, sitios]) =>
      sitios.map((sitio) => {
        const monthsWithData = monthsInScope.filter((fecha) =>
          withValue.some(
            (r) =>
              r.fecha === fecha &&
              r.sede === sede &&
              r.sitioConsumo === sitio,
          ),
        ).length
        const total = withValue
          .filter((r) => r.sede === sede && r.sitioConsumo === sitio)
          .reduce((a, r) => a + (r.consumoM3 as number), 0)
        const monthsTotal = monthsInScope.length || 1
        return {
          sede,
          sitio,
          monthsWithData,
          monthsTotal,
          coveragePct: (monthsWithData / monthsTotal) * 100,
          total: Math.round(total * 100) / 100,
        }
      }),
    )
    .sort((a, b) => b.total - a.total)

  const coveragePct =
    yearFilter.length > 0
      ? (withValue.length / yearFilter.length) * 100
      : 0

  const monthlyTotalsOnly = monthlyBySede.map((m) => m.total)
  const avgMonthly = avg(monthlyTotalsOnly)

  const last = monthlyBySede.at(-1)
  const prev = monthlyBySede.at(-2)
  const momDelta =
    last && prev ? pctChange(last.total, prev.total) : null

  const topSitio = sitioRanking[0] ?? null
  const topSede =
    sedeShare.slice().sort((a, b) => b.value - a.value)[0]?.name ?? null

  const pilarTotal = sedeTotals['Finca El Pilar']
  const smTotal = sedeTotals['Finca San Miguel']

  const kpis: ReportKpi[] = [
    {
      id: 'total',
      label: 'Consumo total',
      value: formatNum(totalM3, 0),
      unit: 'm³',
      hint: periodLabel,
      delta: momDelta,
      deltaLabel: last && prev ? `vs ${prev.month}` : undefined,
    },
    {
      id: 'avg',
      label: 'Promedio mensual',
      value: formatNum(avgMonthly, 0),
      unit: 'm³ / mes',
      hint: `${monthlyBySede.length} mes(es) con lectura`,
    },
    {
      id: 'sede',
      label: 'Sede dominante',
      value: topSede?.replace('Finca ', '') ?? '—',
      unit: topSede
        ? `${formatNum(
            topSede === 'Finca El Pilar' ? pilarTotal : smTotal,
            0,
          )} m³`
        : '',
      hint:
        topSede && totalM3
          ? `${(((topSede === 'Finca El Pilar' ? pilarTotal : smTotal) / totalM3) * 100).toFixed(0)}% del total`
          : 'Sin datos',
    },
    {
      id: 'sitio',
      label: 'Sitio de mayor consumo',
      value: topSitio?.name ?? '—',
      unit: topSitio ? `${formatNum(topSitio.value, 0)} m³` : '',
      hint: topSitio
        ? `${topSitio.sede} · ${topSitio.share.toFixed(0)}% del total`
        : 'Sin datos',
    },
  ]

  const insights: ReportInsight[] = []

  if (momDelta != null && last && prev) {
    if (momDelta >= 50) {
      insights.push({
        id: 'mom-up',
        level: 'Atención',
        title: 'Salto mensual de consumo',
        text: `El consumo pasó de ${formatNum(prev.total)} m³ (${prev.monthFull}) a ${formatNum(last.total)} m³ (${last.monthFull}), un ${momDelta.toFixed(0)}% más.`,
      })
    } else if (momDelta <= -20) {
      insights.push({
        id: 'mom-down',
        level: 'Positivo',
        title: 'Reducción mensual',
        text: `El consumo bajó ${Math.abs(momDelta).toFixed(0)}% entre ${prev.monthFull} y ${last.monthFull} (${formatNum(prev.total)} → ${formatNum(last.total)} m³).`,
      })
    }
  }

  if (topSitio && topSitio.share >= 40) {
    insights.push({
      id: 'concentration',
      level: topSitio.share >= 70 ? 'Crítico' : 'Atención',
      title: 'Concentración en un sitio',
      text: `${topSitio.name} (${topSitio.sede}) concentra ${topSitio.share.toFixed(0)}% del consumo del periodo (${formatNum(topSitio.value)} m³).`,
    })
  }

  const lowCoverage = completeness.filter((c) => c.coveragePct < 40 && c.monthsTotal >= 6)
  if (lowCoverage.length) {
    const sample = lowCoverage.slice(0, 3).map((c) => c.sitio).join(', ')
    insights.push({
      id: 'coverage',
      level: 'Atención',
      title: 'Sitios con poca captura',
      text: `${lowCoverage.length} sitio(s) tienen coberturas bajas de registro (${sample}${lowCoverage.length > 3 ? '…' : ''}).`,
    })
  }

  if (pilarTotal > 0 && smTotal > 0) {
    const ratio = smTotal / pilarTotal
    insights.push({
      id: 'sede-ratio',
      level: 'Positivo',
      title: 'Comparativo entre fincas',
      text: `Finca San Miguel registra ${formatNum(smTotal)} m³ vs ${formatNum(pilarTotal)} m³ en Finca El Pilar (factor ${ratio.toFixed(1)}×).`,
    })
  }

  if (!withValue.length) {
    insights.push({
      id: 'empty',
      level: 'Atención',
      title: 'Sin lecturas numéricas',
      text: 'Hay filas en la base, pero ninguna con consumo_m3 en el periodo seleccionado.',
    })
  }

  const detailRows = withValue
    .slice()
    .sort((a, b) =>
      a.fecha === b.fecha
        ? a.sede.localeCompare(b.sede) ||
          a.sitioConsumo.localeCompare(b.sitioConsumo)
        : b.fecha.localeCompare(a.fecha),
    )
    .map((r) => ({
      fecha: r.fecha,
      mes: monthFromFecha(r.fecha) ?? '—',
      sede: r.sede,
      sitio: r.sitioConsumo,
      consumo: r.consumoM3 as number,
    }))

  return {
    meta: {
      years,
      selectedYear,
      periodLabel,
      sedeCount: Object.keys(AGRO_SEDES).length,
      sitioCount: Object.values(AGRO_SEDES).reduce((a, s) => a + s.length, 0),
      recordsWithValue: withValue.length,
      totalRecords: yearFilter.length,
      coveragePct,
    },
    kpis,
    insights,
    monthlyBySede,
    monthlyTotal,
    sedeShare,
    sitioRanking,
    sitioMonthly,
    sitioKeys,
    completeness,
    detailRows,
    totals: {
      totalM3,
      avgMonthly,
      topSitio: topSitio?.name ?? null,
      topSede,
    },
  }
}
