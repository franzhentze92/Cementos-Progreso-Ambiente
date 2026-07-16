/**
 * Agregados para Operaciones · Planta Alicón · Monitoreo ambiental.
 * Fuente: ejecuciones_monitoreos (hoja Ejecuciones Moni · sedes Alicon).
 */

import {
  MONITORING_MONTHS,
  formatNum,
  monthFromFecha,
  yearFromFecha,
  type AliconMonitoreoRecord,
} from './aliconMonitoreos'

export type InsightLevel = 'Crítico' | 'Atención' | 'Positivo'

export type AliconMonitoreoReport = {
  meta: {
    years: number[]
    selectedYear: number | 'all'
    periodLabel: string
    totalRows: number
    ejecutados: number
    programados: number
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
    ejecutados: number
    programados: number
    puntos: number
  }>
  sedeRanking: Array<{ sede: string; count: number; ejecutados: number }>
  tipoShare: Array<{ name: string; value: number }>
  parametroShare: Array<{ name: string; value: number }>
  detailRows: Array<{
    fechaInicio: string
    fechaFin: string
    mes: string
    sede: string
    tipo: string
    parametro: string
    puntos: number | null
    referencia: string
    estado: string
    comentarios: string
  }>
  totals: {
    puntos: number
    programados: number
  }
}

export function availableYears(records: AliconMonitoreoRecord[]): number[] {
  return [...new Set(records.map((r) => yearFromFecha(r.fechaInicio)))].sort(
    (a, b) => b - a,
  )
}

export function buildAliconMonitoreoReport(
  records: AliconMonitoreoRecord[],
  selectedYear: number | 'all',
): AliconMonitoreoReport {
  const years = availableYears(records)
  const scoped =
    selectedYear === 'all'
      ? records
      : records.filter((r) => yearFromFecha(r.fechaInicio) === selectedYear)

  const periodLabel =
    selectedYear === 'all'
      ? years.length
        ? `${Math.min(...years)}–${Math.max(...years)}`
        : 'Sin datos'
      : String(selectedYear)

  const ejecutados = scoped.filter(
    (r) => r.estado.toLowerCase() === 'ejecutado',
  ).length
  const programados = scoped.filter(
    (r) => r.estado.toLowerCase() === 'programado',
  ).length
  const puntos = scoped.reduce((s, r) => s + (r.puntos ?? 0), 0)
  const internos = scoped.filter((r) =>
    r.tipoMonitoreo.toLowerCase().includes('interno'),
  ).length
  const externos = scoped.filter((r) =>
    r.tipoMonitoreo.toLowerCase().includes('externo'),
  ).length

  const monthlyCount = MONITORING_MONTHS.map((month) => {
    const rows = scoped.filter((r) => monthFromFecha(r.fechaInicio) === month)
    return {
      month,
      short: month.slice(0, 3),
      total: rows.length,
      ejecutados: rows.filter((r) => r.estado.toLowerCase() === 'ejecutado')
        .length,
      programados: rows.filter((r) => r.estado.toLowerCase() === 'programado')
        .length,
      puntos: rows.reduce((s, r) => s + (r.puntos ?? 0), 0),
    }
  })

  const sedeMap = new Map<string, { count: number; ejecutados: number }>()
  for (const r of scoped) {
    const cur = sedeMap.get(r.plantaSede) ?? { count: 0, ejecutados: 0 }
    cur.count += 1
    if (r.estado.toLowerCase() === 'ejecutado') cur.ejecutados += 1
    sedeMap.set(r.plantaSede, cur)
  }
  const sedeRanking = [...sedeMap.entries()]
    .map(([sede, v]) => ({ sede, ...v }))
    .sort((a, b) => b.count - a.count)

  const tipoShare = [
    { name: 'Interno', value: internos },
    { name: 'Externo', value: externos },
  ].filter((x) => x.value > 0)

  const paramMap = new Map<string, number>()
  for (const r of scoped) {
    const key = r.parametro || '(sin dato)'
    paramMap.set(key, (paramMap.get(key) ?? 0) + 1)
  }
  const parametroShare = [...paramMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const insights: AliconMonitoreoReport['insights'] = []
  if (!scoped.length) {
    insights.push({
      id: 'empty',
      level: 'Atención',
      title: 'Sin monitoreos',
      text: 'No hay ejecuciones de monitoreo en el periodo seleccionado.',
    })
  } else {
    if (programados > 0) {
      insights.push({
        id: 'prog',
        level: 'Atención',
        title: 'Monitoreos programados',
        text: `Hay ${programados} monitoreo(s) en estado Programado pendientes de ejecución.`,
      })
    }
    if (ejecutados > 0 && programados === 0) {
      insights.push({
        id: 'ok',
        level: 'Positivo',
        title: 'Periodo ejecutado',
        text: `Los ${ejecutados} monitoreos del periodo están en estado Ejecutado.`,
      })
    }
    const topParam = parametroShare[0]
    if (topParam) {
      insights.push({
        id: 'param',
        level: 'Atención',
        title: 'Parámetro más frecuente',
        text: `${topParam.name} concentra ${topParam.value} de ${scoped.length} ejecuciones.`,
      })
    }
  }

  return {
    meta: {
      years,
      selectedYear,
      periodLabel,
      totalRows: scoped.length,
      ejecutados,
      programados,
    },
    kpis: [
      {
        id: 'total',
        label: 'Ejecuciones',
        value: formatNum(scoped.length),
        hint: 'Filas en el periodo',
      },
      {
        id: 'ejec',
        label: 'Ejecutados',
        value: formatNum(ejecutados),
        hint: programados
          ? `${programados} programado(s)`
          : 'Sin pendientes',
      },
      {
        id: 'puntos',
        label: 'Puntos',
        value: formatNum(puntos),
        hint: 'Suma de puntos monitoreados',
      },
      {
        id: 'tipo',
        label: 'Interno / Externo',
        value: `${internos}/${externos}`,
        hint: 'Tipo de monitoreo',
      },
    ],
    insights,
    monthlyCount,
    sedeRanking,
    tipoShare,
    parametroShare,
    detailRows: [...scoped]
      .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))
      .map((r) => ({
        fechaInicio: r.fechaInicio,
        fechaFin: r.fechaFin ?? '—',
        mes: monthFromFecha(r.fechaInicio) ?? '—',
        sede: r.plantaSede,
        tipo: r.tipoMonitoreo,
        parametro: r.parametro,
        puntos: r.puntos,
        referencia: r.referencia || '—',
        estado: r.estado,
        comentarios: r.comentarios || '—',
      })),
    totals: { puntos, programados },
  }
}
