/**
 * Agregados para Operaciones · Agroprogreso · Incidentes ambientales.
 * Solo datos reales de incidentes_ambientales (unidad Agroprogreso).
 */

import {
  MONITORING_MONTHS,
  formatNum,
  formatPctFromValor,
  monthFromFecha,
  yearFromFecha,
  type AgroIncidenteRecord,
} from './agroIncidentes'

export type InsightLevel = 'Crítico' | 'Atención' | 'Positivo'

export type AgroIncidentesReport = {
  meta: {
    years: number[]
    selectedYear: number | 'all'
    periodLabel: string
    totalRows: number
    abiertos: number
    cerrados: number
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
  monthlyCount: Array<{
    month: string
    short: string
    total: number
    abiertos: number
    cerrados: number
    valorSum: number
  }>
  sedeRanking: Array<{ sede: string; count: number; abiertos: number }>
  estadoShare: Array<{ name: string; value: number }>
  detailRows: Array<{
    fecha: string
    mes: string
    sede: string
    instrumento: string
    descripcion: string
    valor: number | null
    estado: string
    responsables: string
    link: string
  }>
  totals: {
    valorAvg: number | null
    abiertos: number
  }
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function availableYears(records: AgroIncidenteRecord[]): number[] {
  return [...new Set(records.map((r) => yearFromFecha(r.fecha)))].sort(
    (a, b) => b - a,
  )
}

export function buildAgroIncidentesReport(
  records: AgroIncidenteRecord[],
  selectedYear: number | 'all',
): AgroIncidentesReport {
  const years = availableYears(records)
  const scoped =
    selectedYear === 'all'
      ? records
      : records.filter((r) => yearFromFecha(r.fecha) === selectedYear)

  const periodLabel =
    selectedYear === 'all'
      ? years.length
        ? `${Math.min(...years)}–${Math.max(...years)}`
        : 'Sin datos'
      : String(selectedYear)

  const abiertos = scoped.filter(
    (r) => r.estado.toLowerCase() === 'abierto',
  ).length
  const cerrados = scoped.filter(
    (r) => r.estado.toLowerCase() === 'cerrado',
  ).length
  const valores = scoped
    .filter((r) => r.valorIncidente != null)
    .map((r) => r.valorIncidente as number)
  const valorAvg = avg(valores)

  const kpis = [
    {
      id: 'total',
      label: 'Incidentes',
      value: String(scoped.length),
      hint: periodLabel,
    },
    {
      id: 'abiertos',
      label: 'Abiertos',
      value: String(abiertos),
      hint: scoped.length
        ? `${((abiertos / scoped.length) * 100).toFixed(0)}% del total`
        : undefined,
    },
    {
      id: 'cerrados',
      label: 'Cerrados',
      value: String(cerrados),
      hint: scoped.length
        ? `${((cerrados / scoped.length) * 100).toFixed(0)}% del total`
        : undefined,
    },
    {
      id: 'valor',
      label: 'Valor promedio',
      value: valorAvg == null ? '—' : formatPctFromValor(valorAvg),
      hint: 'Severidad relativa (Excel)',
    },
  ]

  const insights: AgroIncidentesReport['insights'] = []
  if (!scoped.length) {
    insights.push({
      id: 'empty',
      level: 'Atención',
      title: 'Sin incidentes',
      text: 'No hay registros Agroprogreso en el periodo seleccionado.',
    })
  } else {
    if (abiertos > 0) {
      insights.push({
        id: 'open',
        level: abiertos >= 2 ? 'Crítico' : 'Atención',
        title: 'Incidentes abiertos',
        text: `${abiertos} incidente(s) aún en estado Abierto. Revisar evidencias y cierre.`,
      })
    } else {
      insights.push({
        id: 'closed',
        level: 'Positivo',
        title: 'Todos cerrados',
        text: `Los ${scoped.length} incidente(s) del periodo están cerrados.`,
      })
    }
    if (valorAvg != null && valorAvg >= 0.25) {
      insights.push({
        id: 'valor-alto',
        level: 'Atención',
        title: 'Severidad elevada',
        text: `Valor promedio ${formatPctFromValor(valorAvg)}. Priorizar sedes con mayor impacto.`,
      })
    }
  }

  const monthlyCount = MONITORING_MONTHS.map((month) => {
    const rows = scoped.filter((r) => monthFromFecha(r.fecha) === month)
    return {
      month,
      short: month.slice(0, 3),
      total: rows.length,
      abiertos: rows.filter((r) => r.estado.toLowerCase() === 'abierto').length,
      cerrados: rows.filter((r) => r.estado.toLowerCase() === 'cerrado').length,
      valorSum: rows.reduce((s, r) => s + (r.valorIncidente ?? 0), 0),
    }
  }).filter((m) => selectedYear === 'all' || m.total > 0 || true)

  const monthlyFiltered =
    selectedYear === 'all'
      ? monthlyCount.filter((m) => m.total > 0)
      : monthlyCount

  const unidades = new Set(
    scoped.map((r) => r.unidadNegocio.trim()).filter(Boolean),
  )
  const multiUnidad = unidades.size > 1
  const sedeKey = (r: (typeof scoped)[number]) =>
    multiUnidad
      ? `${r.unidadNegocio || '—'} · ${r.plantaSede}`
      : r.plantaSede

  const sedeMap = new Map<string, { count: number; abiertos: number }>()
  for (const r of scoped) {
    const key = sedeKey(r)
    const cur = sedeMap.get(key) ?? { count: 0, abiertos: 0 }
    cur.count += 1
    if (r.estado.toLowerCase() === 'abierto') cur.abiertos += 1
    sedeMap.set(key, cur)
  }
  const sedeRanking = [...sedeMap.entries()]
    .map(([sede, v]) => ({ sede, ...v }))
    .sort((a, b) => b.count - a.count || a.sede.localeCompare(b.sede))

  const estadoShare = [
    { name: 'Abierto', value: abiertos },
    { name: 'Cerrado', value: cerrados },
  ].filter((s) => s.value > 0)

  const detailRows = scoped
    .slice()
    .sort((a, b) =>
      a.fecha === b.fecha
        ? a.plantaSede.localeCompare(b.plantaSede)
        : b.fecha.localeCompare(a.fecha),
    )
    .map((r) => ({
      fecha: r.fecha,
      mes: monthFromFecha(r.fecha) ?? r.mesTexto,
      sede: r.plantaSede,
      instrumento: r.instrumento || '—',
      descripcion: r.descripcion || '—',
      valor: r.valorIncidente,
      estado: r.estado || '—',
      responsables: r.responsables || '—',
      link: r.link,
    }))

  return {
    meta: {
      years,
      selectedYear,
      periodLabel,
      totalRows: scoped.length,
      abiertos,
      cerrados,
    },
    kpis,
    insights,
    monthlyCount: monthlyFiltered,
    sedeRanking,
    estadoShare,
    detailRows,
    totals: { valorAvg, abiertos },
  }
}

export { formatNum }
