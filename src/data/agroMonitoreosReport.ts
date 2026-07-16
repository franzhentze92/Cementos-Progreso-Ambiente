/**
 * Analytics / data-science aggregates para Operaciones · Monitoreo ambiental.
 * Solo datos reales de agro_monitoreos_ambientales.
 */

import {
  MONITORING_MONTHS,
  formatNum,
  monthFromFecha,
  yearFromFecha,
  type AgroMonitoreoRecord,
} from './agroMonitoreos'

export type InsightLevel = 'Crítico' | 'Atención' | 'Positivo'

export type MapSite = {
  id: string
  lat: number
  lng: number
  sede: string
  punto: string
  tipoAgua: string
  fechaLatest: string
  params: number
  withValue: number
  cumplePct: number | null
  noCumple: number
}

export type ParamSeriesPoint = {
  fecha: string
  label: string
  value: number | null
  cumple: string
}

export type ParamSeries = {
  parametro: string
  unidad: string
  points: ParamSeriesPoint[]
  n: number
  min: number | null
  max: number | null
  mean: number | null
  latest: number | null
  prev: number | null
  deltaPct: number | null
  latestCumple: string
}

export type AgroMonitoreosReport = {
  meta: {
    years: number[]
    selectedYear: number | 'all'
    periodLabel: string
    totalRows: number
    muestreos: number
    cumpleSi: number
    cumpleNo: number
    uniqueParams: number
    uniqueSites: number
    dateSpanLabel: string
  }
  kpis: Array<{ id: string; label: string; value: string; hint?: string }>
  insights: Array<{
    id: string
    level: InsightLevel
    title: string
    text: string
  }>
  mapSites: MapSite[]
  paramSeries: ParamSeries[]
  monthly: Array<{
    month: string
    short: string
    params: number
    cumpleSi: number
    cumpleNo: number
    muestreos: number
  }>
  campaignTimeline: Array<{
    fecha: string
    sede: string
    punto: string
    tipoAgua: string
    params: number
    withValue: number
    cumplePct: number | null
    noCumple: number
    lat: number | null
    lng: number | null
  }>
  latestProfile: Array<{
    parametro: string
    resultado: number | null
    unidad: string
    limite: string
    cumple: string
  }>
  dboDqo: Array<{ fecha: string; dbo: number; dqo: number; ratio: number }>
  cumpleShare: Array<{ name: string; value: number }>
  dataQuality: {
    withResult: number
    withoutResult: number
    resultCoveragePct: number | null
    withUnit: number
    withCoords: number
    unitCoveragePct: number | null
  }
  detailRows: Array<{
    fecha: string
    mes: string
    sede: string
    punto: string
    tipoAgua: string
    parametro: string
    resultado: number | null
    unidad: string
    limite: string
    cumple: string
    lat: number | null
    lng: number | null
  }>
  totals: {
    compliancePct: number | null
  }
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function deltaPct(latest: number | null, prev: number | null): number | null {
  if (latest == null || prev == null || prev === 0) return null
  return ((latest - prev) / Math.abs(prev)) * 100
}

export function availableYears(records: AgroMonitoreoRecord[]): number[] {
  return [...new Set(records.map((r) => yearFromFecha(r.fecha)))].sort(
    (a, b) => b - a,
  )
}

function campaignKey(r: AgroMonitoreoRecord): string {
  return `${r.fecha}|${r.plantaSede}|${r.puntoMuestreo}`
}

export function buildAgroMonitoreosReport(
  records: AgroMonitoreoRecord[],
  selectedYear: number | 'all',
): AgroMonitoreosReport {
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

  const fechas = [...new Set(scoped.map((r) => r.fecha))].sort()
  const dateSpanLabel =
    fechas.length === 0
      ? 'Sin fechas'
      : fechas.length === 1
        ? fechas[0]
        : `${fechas[0]} → ${fechas[fechas.length - 1]}`

  const cumpleSi = scoped.filter((r) => r.cumple.toLowerCase() === 'si').length
  const cumpleNo = scoped.filter((r) => r.cumple.toLowerCase() === 'no').length
  const muestreos = new Set(scoped.map(campaignKey)).size
  const uniqueParams = new Set(scoped.map((r) => r.parametro)).size
  const uniqueSites = new Set(
    scoped.map((r) => `${r.plantaSede}|${r.puntoMuestreo}`),
  ).size
  const compliancePct =
    scoped.length > 0 ? (cumpleSi / scoped.length) * 100 : null

  const withResult = scoped.filter(
    (r) => r.resultado != null && !Number.isNaN(r.resultado),
  ).length
  const withoutResult = scoped.length - withResult
  const withUnit = scoped.filter((r) => r.unidad.trim()).length
  const withCoords = scoped.filter(
    (r) => r.latitud != null && r.longitud != null,
  ).length

  // —— Map sites ——
  const siteMap = new Map<
    string,
    {
      lat: number
      lng: number
      sede: string
      punto: string
      tipoAgua: string
      fechas: string[]
      rows: AgroMonitoreoRecord[]
    }
  >()
  for (const r of scoped) {
    if (r.latitud == null || r.longitud == null) continue
    const id = `${r.plantaSede}|${r.puntoMuestreo}|${r.latitud}|${r.longitud}`
    const cur = siteMap.get(id) ?? {
      lat: r.latitud,
      lng: r.longitud,
      sede: r.plantaSede,
      punto: r.puntoMuestreo,
      tipoAgua: r.tipoAgua,
      fechas: [],
      rows: [],
    }
    cur.fechas.push(r.fecha)
    cur.rows.push(r)
    if (r.tipoAgua) cur.tipoAgua = r.tipoAgua
    siteMap.set(id, cur)
  }
  const mapSites: MapSite[] = [...siteMap.entries()].map(([id, s]) => {
    const latest = [...s.fechas].sort().at(-1)!
    const latestRows = s.rows.filter((r) => r.fecha === latest)
    const si = latestRows.filter((r) => r.cumple.toLowerCase() === 'si').length
    const no = latestRows.filter((r) => r.cumple.toLowerCase() === 'no').length
    return {
      id,
      lat: s.lat,
      lng: s.lng,
      sede: s.sede,
      punto: s.punto,
      tipoAgua: s.tipoAgua || '—',
      fechaLatest: latest,
      params: latestRows.length,
      withValue: latestRows.filter((r) => r.resultado != null).length,
      cumplePct: latestRows.length ? (si / latestRows.length) * 100 : null,
      noCumple: no,
    }
  })

  // —— Parameter time series ——
  const byParam = new Map<string, AgroMonitoreoRecord[]>()
  for (const r of scoped) {
    const list = byParam.get(r.parametro) ?? []
    list.push(r)
    byParam.set(r.parametro, list)
  }
  const paramSeries: ParamSeries[] = [...byParam.entries()]
    .map(([parametro, rows]) => {
      const sorted = [...rows].sort((a, b) => a.fecha.localeCompare(b.fecha))
      // collapse same fecha (avg if duplicates)
      const byFecha = new Map<string, AgroMonitoreoRecord[]>()
      for (const r of sorted) {
        const list = byFecha.get(r.fecha) ?? []
        list.push(r)
        byFecha.set(r.fecha, list)
      }
      const points: ParamSeriesPoint[] = [...byFecha.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, list]) => {
          const vals = list
            .map((r) => r.resultado)
            .filter((v): v is number => v != null && !Number.isNaN(v))
          return {
            fecha,
            label: fecha.slice(5),
            value: avg(vals),
            cumple: list[list.length - 1]?.cumple ?? '',
          }
        })
      const numeric = points
        .map((p) => p.value)
        .filter((v): v is number => v != null)
      const latest = numeric.at(-1) ?? null
      const prev = numeric.length >= 2 ? numeric[numeric.length - 2]! : null
      const unidad =
        sorted.map((r) => r.unidad).find((u) => u.trim()) ?? ''
      return {
        parametro,
        unidad,
        points,
        n: numeric.length,
        min: numeric.length ? Math.min(...numeric) : null,
        max: numeric.length ? Math.max(...numeric) : null,
        mean: avg(numeric),
        latest,
        prev,
        deltaPct: deltaPct(latest, prev),
        latestCumple: points.at(-1)?.cumple ?? '',
      }
    })
    .sort((a, b) => a.parametro.localeCompare(b.parametro))

  // —— Monthly ——
  const monthly = MONITORING_MONTHS.map((month) => {
    const rows = scoped.filter((r) => monthFromFecha(r.fecha) === month)
    return {
      month,
      short: month.slice(0, 3),
      params: rows.length,
      cumpleSi: rows.filter((r) => r.cumple.toLowerCase() === 'si').length,
      cumpleNo: rows.filter((r) => r.cumple.toLowerCase() === 'no').length,
      muestreos: new Set(rows.map(campaignKey)).size,
    }
  }).filter((m) => (selectedYear === 'all' ? m.params > 0 : true))

  // —— Campaign timeline ——
  const campMap = new Map<string, AgroMonitoreoRecord[]>()
  for (const r of scoped) {
    const k = campaignKey(r)
    const list = campMap.get(k) ?? []
    list.push(r)
    campMap.set(k, list)
  }
  const campaignTimeline = [...campMap.entries()]
    .map(([, rows]) => {
      const sample = rows[0]
      const si = rows.filter((r) => r.cumple.toLowerCase() === 'si').length
      const no = rows.filter((r) => r.cumple.toLowerCase() === 'no').length
      return {
        fecha: sample.fecha,
        sede: sample.plantaSede,
        punto: sample.puntoMuestreo,
        tipoAgua: sample.tipoAgua || '—',
        params: rows.length,
        withValue: rows.filter((r) => r.resultado != null).length,
        cumplePct: rows.length ? (si / rows.length) * 100 : null,
        noCumple: no,
        lat: sample.latitud,
        lng: sample.longitud,
      }
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  const latestCampaign = campaignTimeline[0]
  const latestProfile =
    latestCampaign != null
      ? scoped
          .filter(
            (r) =>
              r.fecha === latestCampaign.fecha &&
              r.plantaSede === latestCampaign.sede &&
              r.puntoMuestreo === latestCampaign.punto,
          )
          .map((r) => ({
            parametro: r.parametro,
            resultado: r.resultado,
            unidad: r.unidad || '—',
            limite: r.limitePermisible || '—',
            cumple: r.cumple || '—',
          }))
          .sort((a, b) => a.parametro.localeCompare(b.parametro))
      : []

  // —— DBO / DQO ——
  const dboDqo: AgroMonitoreosReport['dboDqo'] = []
  for (const [, rows] of campMap) {
    const dbo = rows.find((r) => r.parametro === 'DBO')?.resultado
    const dqo = rows.find((r) => r.parametro === 'DQO')?.resultado
    if (
      dbo != null &&
      dqo != null &&
      !Number.isNaN(dbo) &&
      !Number.isNaN(dqo) &&
      dbo !== 0
    ) {
      dboDqo.push({
        fecha: rows[0].fecha,
        dbo,
        dqo,
        ratio: dqo / dbo,
      })
    }
  }
  dboDqo.sort((a, b) => a.fecha.localeCompare(b.fecha))

  const kpis = [
    {
      id: 'muestreos',
      label: 'Muestreos',
      value: String(muestreos),
      hint: dateSpanLabel,
    },
    {
      id: 'sites',
      label: 'Puntos geo',
      value: String(mapSites.length || uniqueSites),
      hint: `${uniqueParams} parámetros distintos`,
    },
    {
      id: 'compliance',
      label: 'Cumplimiento',
      value:
        compliancePct == null ? '—' : `${formatNum(compliancePct, 0)}%`,
      hint: `${cumpleSi} cumplen · ${cumpleNo} no`,
    },
    {
      id: 'coverage',
      label: 'Cobertura resultado',
      value:
        scoped.length === 0
          ? '—'
          : `${formatNum((withResult / scoped.length) * 100, 0)}%`,
      hint: `${withResult}/${scoped.length} con valor numérico`,
    },
  ]

  const insights: AgroMonitoreosReport['insights'] = []
  if (!scoped.length) {
    insights.push({
      id: 'empty',
      level: 'Atención',
      title: 'Sin monitoreos',
      text: 'No hay registros Agroprogreso en el periodo seleccionado.',
    })
  } else {
    if (muestreos < 2) {
      insights.push({
        id: 'sparse',
        level: 'Atención',
        title: 'Histórico corto',
        text: `Solo ${muestreos} muestreo(s) en el periodo. Las series temporales ganarían señal con más campañas mensuales.`,
      })
    }
    if (cumpleNo === 0) {
      insights.push({
        id: 'ok',
        level: 'Positivo',
        title: 'Cumplimiento completo',
        text: `Los ${scoped.length} registros reportan Cumple = Si.`,
      })
    } else {
      insights.push({
        id: 'fail',
        level: 'Crítico',
        title: 'Parámetros fuera de límite',
        text: `${cumpleNo} registro(s) No cumplen. Revisar perfil del último muestreo.`,
      })
    }
    const missingUnits = scoped.length - withUnit
    if (missingUnits > 0) {
      insights.push({
        id: 'units',
        level: 'Atención',
        title: 'Unidades incompletas',
        text: `${missingUnits} fila(s) sin unidad de medida (columna Unidad vacía en el Excel).`,
      })
    }
    if (dboDqo.length) {
      const last = dboDqo[dboDqo.length - 1]
      insights.push({
        id: 'bod',
        level: 'Positivo',
        title: 'Relación DQO/DBO',
        text: `Último muestreo ${last.fecha}: DQO/DBO = ${formatNum(last.ratio, 2)} (DBO ${formatNum(last.dbo)} · DQO ${formatNum(last.dqo)}).`,
      })
    }
  }

  const cumpleShare = [
    { name: 'Si', value: cumpleSi },
    { name: 'No', value: cumpleNo },
  ].filter((s) => s.value > 0)

  const detailRows = scoped
    .slice()
    .sort((a, b) =>
      a.fecha === b.fecha
        ? a.parametro.localeCompare(b.parametro)
        : b.fecha.localeCompare(a.fecha),
    )
    .map((r) => ({
      fecha: r.fecha,
      mes: monthFromFecha(r.fecha) ?? '—',
      sede: r.plantaSede,
      punto: r.puntoMuestreo,
      tipoAgua: r.tipoAgua || '—',
      parametro: r.parametro,
      resultado: r.resultado,
      unidad: r.unidad || '—',
      limite: r.limitePermisible || '—',
      cumple: r.cumple || '—',
      lat: r.latitud,
      lng: r.longitud,
    }))

  return {
    meta: {
      years,
      selectedYear,
      periodLabel,
      totalRows: scoped.length,
      muestreos,
      cumpleSi,
      cumpleNo,
      uniqueParams,
      uniqueSites,
      dateSpanLabel,
    },
    kpis,
    insights,
    mapSites,
    paramSeries,
    monthly,
    campaignTimeline,
    latestProfile,
    dboDqo,
    cumpleShare,
    dataQuality: {
      withResult,
      withoutResult,
      resultCoveragePct:
        scoped.length > 0 ? (withResult / scoped.length) * 100 : null,
      withUnit,
      withCoords,
      unitCoveragePct:
        scoped.length > 0 ? (withUnit / scoped.length) * 100 : null,
    },
    detailRows,
    totals: { compliancePct },
  }
}

export { formatNum }
