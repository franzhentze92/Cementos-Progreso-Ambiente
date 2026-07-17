/**
 * Agregados para Operaciones · Agroprogreso · Inspección ambiental.
 * Solo datos reales de ejecuciones_inspecciones (unidad Agroprogreso).
 */

import {
  MONITORING_MONTHS,
  formatNum,
  monthFromFecha,
  type AgroInspeccionRecord,
} from './agroInspecciones'

export type InsightLevel = 'Crítico' | 'Atención' | 'Positivo'

export type AgroInspeccionReport = {
  meta: {
    years: number[]
    selectedYear: number | 'all'
    periodLabel: string
    totalRows: number
    withScore: number
    withHallazgos: number
    accionInmediata: number
  }
  kpis: Array<{
    id: string
    label: string
    value: string
    hint?: string
  }>
  insights: Array<{
    id: string
    level: InsightLevel
    title: string
    text: string
  }>
  monthlyAvg: Array<{
    month: string
    short: string
    avgScore: number | null
    count: number
    hallazgos: number
  }>
  sedeRanking: Array<{ sede: string; count: number; avgScore: number | null }>
  riesgoShare: Array<{ name: string; value: number }>
  detailRows: Array<{
    fecha: string
    mes: string
    sede: string
    responsable: string
    material: string
    resultado: number | null
    hallazgos: number | null
    riesgo: string
    accion: string
    observaciones: string
    link: string
  }>
  totals: {
    avgScore: number | null
    totalHallazgos: number
  }
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function availableYears(records: AgroInspeccionRecord[]): number[] {
  return [...new Set(records.map((r) => r.anio))].sort((a, b) => b - a)
}

export function buildAgroInspeccionReport(
  records: AgroInspeccionRecord[],
  selectedYear: number | 'all',
): AgroInspeccionReport {
  const years = availableYears(records)
  const scoped =
    selectedYear === 'all'
      ? records
      : records.filter((r) => r.anio === selectedYear)

  const periodLabel =
    selectedYear === 'all'
      ? years.length
        ? `${Math.min(...years)}–${Math.max(...years)}`
        : 'Sin datos'
      : String(selectedYear)

  const withScore = scoped.filter(
    (r) => r.resultadoGeneral != null && !Number.isNaN(r.resultadoGeneral),
  )
  const scores = withScore.map((r) => r.resultadoGeneral as number)
  const avgScore = avg(scores)
  const withHallazgos = scoped.filter(
    (r) => (r.numHallazgos ?? 0) > 0,
  ).length
  const totalHallazgos = scoped.reduce(
    (s, r) => s + (r.numHallazgos ?? 0),
    0,
  )
  const accionInmediata = scoped.filter(
    (r) => r.requiereAccionInmediata.toLowerCase() === 'si',
  ).length
  const altoRiesgo = scoped.filter(
    (r) => r.nivelRiesgo.toLowerCase() === 'alto',
  ).length

  const kpis = [
    {
      id: 'count',
      label: 'Inspecciones',
      value: String(scoped.length),
      hint: periodLabel,
    },
    {
      id: 'avg',
      label: 'Resultado promedio',
      value: avgScore == null ? '—' : formatNum(avgScore, 1),
      hint: 'Escala 0–100',
    },
    {
      id: 'hallazgos',
      label: 'Hallazgos totales',
      value: String(totalHallazgos),
      hint: `${withHallazgos} inspección(es) con hallazgo`,
    },
    {
      id: 'accion',
      label: 'Acción inmediata',
      value: String(accionInmediata),
      hint: altoRiesgo ? `${altoRiesgo} en riesgo Alto` : 'Ninguna en riesgo Alto',
    },
  ]

  const insights: AgroInspeccionReport['insights'] = []
  if (!scoped.length) {
    insights.push({
      id: 'empty',
      level: 'Atención',
      title: 'Sin inspecciones',
      text: 'No hay registros Agroprogreso en el periodo seleccionado.',
    })
  } else {
    if (avgScore != null && avgScore >= 95) {
      insights.push({
        id: 'score-ok',
        level: 'Positivo',
        title: 'Buen resultado general',
        text: `Promedio ${formatNum(avgScore, 1)} en ${scoped.length} inspección(es).`,
      })
    } else if (avgScore != null && avgScore < 85) {
      insights.push({
        id: 'score-low',
        level: 'Atención',
        title: 'Resultado por debajo de 85',
        text: `Promedio ${formatNum(avgScore, 1)}. Revisar sedes con menor puntaje.`,
      })
    }
    if (accionInmediata > 0) {
      insights.push({
        id: 'accion',
        level: altoRiesgo > 0 ? 'Crítico' : 'Atención',
        title: 'Requieren acción inmediata',
        text: `${accionInmediata} inspección(es) marcadas con acción inmediata.`,
      })
    } else {
      insights.push({
        id: 'sin-accion',
        level: 'Positivo',
        title: 'Sin acción inmediata',
        text: 'Ninguna inspección del periodo exige acción inmediata.',
      })
    }
  }

  const months =
    selectedYear === 'all'
      ? [...new Set(scoped.map((r) => r.mes))]
      : [...MONITORING_MONTHS]

  const monthlyAvg = (
    selectedYear === 'all'
      ? MONITORING_MONTHS.filter((m) => months.includes(m))
      : [...MONITORING_MONTHS]
  ).map((month) => {
    const rows = scoped.filter((r) => r.mes === month)
    const vals = rows
      .filter((r) => r.resultadoGeneral != null)
      .map((r) => r.resultadoGeneral as number)
    return {
      month,
      short: month.slice(0, 3),
      avgScore: avg(vals),
      count: rows.length,
      hallazgos: rows.reduce((s, r) => s + (r.numHallazgos ?? 0), 0),
    }
  })

  const sedeMap = new Map<string, { scores: number[]; count: number }>()
  for (const r of scoped) {
    const cur = sedeMap.get(r.plantaSede) ?? { scores: [], count: 0 }
    cur.count += 1
    if (r.resultadoGeneral != null) cur.scores.push(r.resultadoGeneral)
    sedeMap.set(r.plantaSede, cur)
  }
  const sedeRanking = [...sedeMap.entries()]
    .map(([sede, v]) => ({
      sede,
      count: v.count,
      avgScore: avg(v.scores),
    }))
    .sort((a, b) => b.count - a.count || a.sede.localeCompare(b.sede))

  const riesgoMap = new Map<string, number>()
  for (const r of scoped) {
    const k = r.nivelRiesgo.trim() || '(sin dato)'
    riesgoMap.set(k, (riesgoMap.get(k) ?? 0) + 1)
  }
  const riesgoShare = [...riesgoMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const detailRows = scoped
    .slice()
    .sort((a, b) =>
      a.fecha === b.fecha
        ? a.plantaSede.localeCompare(b.plantaSede)
        : b.fecha.localeCompare(a.fecha),
    )
    .map((r) => ({
      fecha: r.fecha,
      mes: monthFromFecha(r.fecha) ?? r.mes,
      sede: r.plantaSede,
      responsable: r.responsable || '—',
      material: r.materialDescarga || '—',
      resultado: r.resultadoGeneral,
      hallazgos: r.numHallazgos,
      riesgo: r.nivelRiesgo || '—',
      accion: r.requiereAccionInmediata || '—',
      observaciones: r.observaciones || '—',
      link: r.link,
    }))

  return {
    meta: {
      years,
      selectedYear,
      periodLabel,
      totalRows: scoped.length,
      withScore: withScore.length,
      withHallazgos,
      accionInmediata,
    },
    kpis,
    insights,
    monthlyAvg,
    sedeRanking,
    riesgoShare,
    detailRows,
    totals: { avgScore, totalHallazgos },
  }
}

