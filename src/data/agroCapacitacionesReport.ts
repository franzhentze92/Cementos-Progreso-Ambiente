/**
 * Analytics Capacitaciones · Operaciones Agroprogreso.
 * Fuente: agro_capacitaciones (hoja Ejecuciones).
 */

import {
  MONITORING_MONTHS,
  formatNum,
  monthFromFecha,
  yearFromFecha,
  type AgroCapacitacionRecord,
} from './agroCapacitaciones'

export type InsightLevel = 'Crítico' | 'Atención' | 'Positivo'

export type CapMapSite = {
  id: string
  lat: number
  lng: number
  sede: string
  total: number
  ejecutado: number
  programado: number
  reprogramado: number
}

export type AgroCapacitacionesReport = {
  meta: {
    years: number[]
    selectedYear: number | 'all'
    periodLabel: string
    totalRows: number
    ejecutado: number
    programado: number
    reprogramado: number
    dateSpanLabel: string
  }
  kpis: Array<{ id: string; label: string; value: string; hint?: string }>
  insights: Array<{
    id: string
    level: InsightLevel
    title: string
    text: string
  }>
  mapSites: CapMapSite[]
  monthly: Array<{
    month: string
    short: string
    total: number
    ejecutado: number
    programado: number
    reprogramado: number
  }>
  detalleShare: Array<{ name: string; value: number }>
  publicoShare: Array<{ name: string; value: number }>
  estadoShare: Array<{ name: string; value: number }>
  timeline: Array<{
    fecha: string
    sede: string
    detalle: string
    publico: string
    estado: string
    comentarios: string
  }>
  detailRows: Array<{
    anio: number
    mes: string
    sede: string
    detalle: string
    publico: string
    inicio: string
    fin: string
    estado: string
    comentarios: string
    lat: number | null
    lng: number | null
  }>
  totals: {
    executionRate: number | null
  }
}

function countBy(
  records: AgroCapacitacionRecord[],
  keyFn: (r: AgroCapacitacionRecord) => string,
) {
  const map = new Map<string, number>()
  for (const r of records) {
    const k = keyFn(r).trim() || '(sin dato)'
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
}

export function availableYears(records: AgroCapacitacionRecord[]): number[] {
  return [...new Set(records.map((r) => yearFromFecha(r.fechaInicio)))].sort(
    (a, b) => b - a,
  )
}

export function buildAgroCapacitacionesReport(
  records: AgroCapacitacionRecord[],
  selectedYear: number | 'all',
): AgroCapacitacionesReport {
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

  const fechas = [...new Set(scoped.map((r) => r.fechaInicio))].sort()
  const dateSpanLabel =
    fechas.length === 0
      ? 'Sin fechas'
      : fechas.length === 1
        ? fechas[0]
        : `${fechas[0]} → ${fechas[fechas.length - 1]}`

  const ejecutado = scoped.filter(
    (r) => r.estado.toLowerCase() === 'ejecutado',
  ).length
  const programado = scoped.filter(
    (r) => r.estado.toLowerCase() === 'programado',
  ).length
  const reprogramado = scoped.filter(
    (r) => r.estado.toLowerCase() === 'reprogramado',
  ).length
  const executionRate =
    scoped.length > 0 ? (ejecutado / scoped.length) * 100 : null

  const siteMap = new Map<
    string,
    {
      lat: number
      lng: number
      sede: string
      total: number
      ejecutado: number
      programado: number
      reprogramado: number
    }
  >()
  for (const r of scoped) {
    if (r.latitud == null || r.longitud == null) continue
    const id = `${r.plantaSede}|${r.latitud}|${r.longitud}`
    const cur = siteMap.get(id) ?? {
      lat: r.latitud,
      lng: r.longitud,
      sede: r.plantaSede,
      total: 0,
      ejecutado: 0,
      programado: 0,
      reprogramado: 0,
    }
    cur.total += 1
    const e = r.estado.toLowerCase()
    if (e === 'ejecutado') cur.ejecutado += 1
    else if (e === 'programado') cur.programado += 1
    else if (e === 'reprogramado') cur.reprogramado += 1
    siteMap.set(id, cur)
  }
  const mapSites: CapMapSite[] = [...siteMap.entries()].map(([id, s]) => ({
    id,
    ...s,
  }))

  const monthly = MONITORING_MONTHS.map((month) => {
    const rows = scoped.filter((r) => monthFromFecha(r.fechaInicio) === month)
    return {
      month,
      short: month.slice(0, 3),
      total: rows.length,
      ejecutado: rows.filter((r) => r.estado.toLowerCase() === 'ejecutado')
        .length,
      programado: rows.filter((r) => r.estado.toLowerCase() === 'programado')
        .length,
      reprogramado: rows.filter(
        (r) => r.estado.toLowerCase() === 'reprogramado',
      ).length,
    }
  }).filter((m) => (selectedYear === 'all' ? m.total > 0 : true))

  const detalleShare = countBy(scoped, (r) => r.detalle)
  const publicoShare = countBy(scoped, (r) => r.publicoObjetivo)
  const estadoShare = [
    { name: 'Ejecutado', value: ejecutado },
    { name: 'Programado', value: programado },
    { name: 'Reprogramado', value: reprogramado },
  ].filter((s) => s.value > 0)

  const kpis = [
    {
      id: 'total',
      label: 'Capacitaciones',
      value: String(scoped.length),
      hint: dateSpanLabel,
    },
    {
      id: 'ejecutado',
      label: 'Ejecutadas',
      value: String(ejecutado),
      hint:
        executionRate == null
          ? undefined
          : `${formatNum(executionRate, 0)}% del total`,
    },
    {
      id: 'programado',
      label: 'Programadas',
      value: String(programado),
      hint: reprogramado ? `${reprogramado} reprogramada(s)` : 'Sin reprogramar',
    },
    {
      id: 'sedes',
      label: 'Sedes en mapa',
      value: String(mapSites.length),
      hint: `${detalleShare.length} tema(s)`,
    },
  ]

  const insights: AgroCapacitacionesReport['insights'] = []
  if (!scoped.length) {
    insights.push({
      id: 'empty',
      level: 'Atención',
      title: 'Sin capacitaciones',
      text: 'No hay registros Agroprogreso en el periodo.',
    })
  } else {
    if (executionRate != null && executionRate >= 50) {
      insights.push({
        id: 'exec-ok',
        level: 'Positivo',
        title: 'Buena ejecución',
        text: `${formatNum(executionRate, 0)}% de las capacitaciones ya están Ejecutadas.`,
      })
    } else if (programado > ejecutado) {
      insights.push({
        id: 'pending',
        level: 'Atención',
        title: 'Pipeline pendiente',
        text: `${programado} Programada(s) vs ${ejecutado} Ejecutada(s). Revisar calendario H2.`,
      })
    }
    if (reprogramado > 0) {
      insights.push({
        id: 'reprog',
        level: 'Atención',
        title: 'Reprogramaciones',
        text: `${reprogramado} capacitación(es) en estado Reprogramado.`,
      })
    }
    const top = detalleShare[0]
    if (top) {
      insights.push({
        id: 'tema',
        level: 'Positivo',
        title: 'Tema dominante',
        text: `«${top.name}» concentra ${top.value} de ${scoped.length} eventos.`,
      })
    }
  }

  const timeline = scoped
    .slice()
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
    .map((r) => ({
      fecha: r.fechaInicio,
      sede: r.plantaSede,
      detalle: r.detalle,
      publico: r.publicoObjetivo,
      estado: r.estado,
      comentarios: r.comentarios || '—',
    }))

  const detailRows = scoped
    .slice()
    .sort((a, b) =>
      a.fechaInicio === b.fechaInicio
        ? a.plantaSede.localeCompare(b.plantaSede)
        : b.fechaInicio.localeCompare(a.fechaInicio),
    )
    .map((r) => ({
      anio: r.anio,
      mes: monthFromFecha(r.fechaInicio) ?? '—',
      sede: r.plantaSede,
      detalle: r.detalle,
      publico: r.publicoObjetivo,
      inicio: r.fechaInicio,
      fin: r.fechaFin,
      estado: r.estado,
      comentarios: r.comentarios || '—',
      lat: r.latitud,
      lng: r.longitud,
    }))

  return {
    meta: {
      years,
      selectedYear,
      periodLabel,
      totalRows: scoped.length,
      ejecutado,
      programado,
      reprogramado,
      dateSpanLabel,
    },
    kpis,
    insights,
    mapSites,
    monthly,
    detalleShare,
    publicoShare,
    estadoShare,
    timeline,
    detailRows,
    totals: { executionRate },
  }
}

export { formatNum }
