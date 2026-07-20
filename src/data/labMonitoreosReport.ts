/**
 * Agregados visuales para resultados de laboratorio
 * (tabla agro_monitoreos_ambientales · Alicón / Agro).
 */

import {
  formatNum,
  yearFromFecha,
  type AgroMonitoreoRecord,
} from './agroMonitoreos'

export type LabMonitoreosVisual = {
  meta: {
    years: number[]
    selectedYear: number | 'all'
    periodLabel: string
    totalRows: number
    muestreos: number
    puntos: number
    medios: number
  }
  kpis: Array<{ id: string; label: string; value: string; hint: string }>
  compliance: { si: number; no: number; sinDato: number; pct: number | null }
  byMedio: Array<{ name: string; value: number; si: number; no: number }>
  byPunto: Array<{
    punto: string
    medio: string
    fechaLatest: string
    params: number
    noCumple: number
  }>
  monthly: Array<{
    short: string
    month: string
    params: number
    noCumple: number
  }>
  detailRows: AgroMonitoreoRecord[]
  insights: Array<{
    id: string
    level: 'Crítico' | 'Atención' | 'Positivo'
    title: string
    text: string
  }>
}

const MONTH_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

function medioOf(r: AgroMonitoreoRecord) {
  return r.medio?.trim() || r.tipoAgua?.trim() || 'Sin medio'
}

function muestreoKey(r: AgroMonitoreoRecord) {
  return `${r.fecha}|${r.plantaSede}|${r.puntoMuestreo}|${medioOf(r)}`
}

export function buildLabMonitoreosVisual(
  records: AgroMonitoreoRecord[],
  selectedYear: number | 'all' = 'all',
): LabMonitoreosVisual {
  const years = [
    ...new Set(
      records
        .map((r) => yearFromFecha(r.fecha))
        .filter((y) => Number.isFinite(y) && y > 1900),
    ),
  ].sort((a, b) => b - a)

  const filtered =
    selectedYear === 'all'
      ? records
      : records.filter((r) => yearFromFecha(r.fecha) === selectedYear)

  const periodLabel =
    selectedYear === 'all' ? 'Todos los años' : String(selectedYear)

  const muestreoIds = new Set(filtered.map(muestreoKey))
  const puntos = new Set(filtered.map((r) => r.puntoMuestreo))
  const medios = new Set(filtered.map((r) => medioOf(r)))

  let si = 0
  let no = 0
  let sinDato = 0
  for (const r of filtered) {
    const c = r.cumple.trim().toLowerCase()
    if (c === 'si' || c === 'sí') si += 1
    else if (c === 'no') no += 1
    else sinDato += 1
  }
  const evaluados = si + no
  const pct = evaluados ? (si / evaluados) * 100 : null

  const medioMap = new Map<
    string,
    { value: number; si: number; no: number }
  >()
  for (const r of filtered) {
    const name = medioOf(r)
    const cur = medioMap.get(name) ?? { value: 0, si: 0, no: 0 }
    cur.value += 1
    const c = r.cumple.trim().toLowerCase()
    if (c === 'si' || c === 'sí') cur.si += 1
    if (c === 'no') cur.no += 1
    medioMap.set(name, cur)
  }
  const byMedio = [...medioMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.value - a.value)

  const puntoMap = new Map<
    string,
    {
      punto: string
      medio: string
      fechaLatest: string
      params: number
      noCumple: number
    }
  >()
  for (const r of filtered) {
    const medio = medioOf(r)
    const key = `${r.puntoMuestreo}|${medio}`
    const cur = puntoMap.get(key) ?? {
      punto: r.puntoMuestreo,
      medio,
      fechaLatest: r.fecha,
      params: 0,
      noCumple: 0,
    }
    cur.params += 1
    if (r.fecha > cur.fechaLatest) cur.fechaLatest = r.fecha
    if (r.cumple.trim().toLowerCase() === 'no') cur.noCumple += 1
    puntoMap.set(key, cur)
  }
  const byPunto = [...puntoMap.values()].sort((a, b) =>
    b.fechaLatest.localeCompare(a.fechaLatest),
  )

  const monthMap = new Map<string, { params: number; noCumple: number }>()
  for (const r of filtered) {
    const ym = r.fecha.slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(ym)) continue
    const cur = monthMap.get(ym) ?? { params: 0, noCumple: 0 }
    cur.params += 1
    if (r.cumple.trim().toLowerCase() === 'no') cur.noCumple += 1
    monthMap.set(ym, cur)
  }
  const monthly = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, v]) => {
      const mi = Number(ym.slice(5, 7)) - 1
      return {
        month: ym,
        short: MONTH_SHORT[mi] ?? ym,
        params: v.params,
        noCumple: v.noCumple,
      }
    })

  const insights: LabMonitoreosVisual['insights'] = []
  if (no > 0) {
    insights.push({
      id: 'no-cumple',
      level: no >= 3 ? 'Crítico' : 'Atención',
      title: `${no} parámetro(s) fuera de límite`,
      text: 'Revisa el detalle por punto y medio. Prioriza los “No” en el último informe.',
    })
  } else if (evaluados > 0) {
    insights.push({
      id: 'ok',
      level: 'Positivo',
      title: 'Cumplimiento en parámetros evaluados',
      text: `Los ${evaluados} parámetros con veredicto cumplen el límite reportado.`,
    })
  }
  if (filtered.length === 0) {
    insights.push({
      id: 'empty',
      level: 'Atención',
      title: 'Sin resultados de laboratorio',
      text: 'Carga un PDF o captura manual en Entrada de datos.',
    })
  }

  const kpis = [
    {
      id: 'params',
      label: 'Parámetros',
      value: formatNum(filtered.length, 0),
      hint: 'Filas de resultado guardadas',
    },
    {
      id: 'muestreos',
      label: 'Muestreos',
      value: formatNum(muestreoIds.size, 0),
      hint: 'Combinaciones fecha · punto · medio',
    },
    {
      id: 'puntos',
      label: 'Puntos',
      value: formatNum(puntos.size, 0),
      hint: 'Sitios de muestreo distintos',
    },
    {
      id: 'cumple',
      label: 'Cumplimiento',
      value: pct == null ? '—' : `${formatNum(pct, 0)}%`,
      hint:
        evaluados === 0
          ? 'Sin veredicto Si/No en el informe'
          : `${si} cumplen · ${no} no cumplen`,
    },
  ]

  return {
    meta: {
      years,
      selectedYear,
      periodLabel,
      totalRows: filtered.length,
      muestreos: muestreoIds.size,
      puntos: puntos.size,
      medios: medios.size,
    },
    kpis,
    compliance: { si, no, sinDato, pct },
    byMedio,
    byPunto,
    monthly,
    detailRows: [...filtered].sort((a, b) => {
      const byFecha = b.fecha.localeCompare(a.fecha)
      if (byFecha) return byFecha
      const byPunto = a.puntoMuestreo.localeCompare(b.puntoMuestreo)
      if (byPunto) return byPunto
      return a.parametro.localeCompare(b.parametro)
    }),
    insights,
  }
}
