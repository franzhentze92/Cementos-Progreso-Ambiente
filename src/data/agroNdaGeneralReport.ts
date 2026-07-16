/**
 * Analytics NDA General · AGRO NDA · Agroprogreso.
 */
import {
  MONITORING_MONTHS,
  computeNda,
  formatNum,
  monthFromFecha,
  yearFromFecha,
  type AgroNdaGeneralRecord,
  type MonitoringMonth,
} from './agroNdaGeneral'

export { formatNum }

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

export type NdaMapSite = {
  id: string
  sede: string
  lat: number
  lng: number
  count: number
  avgNda: number | null
}

export type AgroNdaGeneralReport = {
  meta: {
    years: number[]
    selectedYear: number | 'all'
    periodLabel: string
    totalRows: number
  }
  kpis: { id: string; label: string; value: string; hint: string }[]
  insights: {
    id: string
    level: 'Crítico' | 'Atención' | 'Positivo'
    title: string
    text: string
  }[]
  monthly: {
    label: string
    avgNda: number | null
    avgIda: number | null
    avgCasco: number | null
    avgIncidentes: number | null
    avgCompromisos: number | null
    count: number
  }[]
  bySede: {
    sede: string
    count: number
    avgNda: number | null
    avgIda: number | null
    avgCasco: number | null
  }[]
  mapSites: NdaMapSite[]
  componentShare: { name: string; weight: number; avg: number | null }[]
  detailRows: {
    id: string
    fecha: string
    mes: string
    sede: string
    proyecto: string
    ida: number | null
    casco: number | null
    incidentes: number | null
    compromisos: number | null
    nda: number | null
  }[]
  totals: {
    avgNda: number | null
    avgIda: number | null
    avgCasco: number | null
    avgIncidentes: number | null
    avgCompromisos: number | null
  }
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function effectiveNda(r: AgroNdaGeneralRecord): number | null {
  if (r.nda != null) return r.nda
  return computeNda(r.notaIda, r.cascoVerde, r.incidentes, r.compromisos)
}

export function buildAgroNdaGeneralReport(
  records: AgroNdaGeneralRecord[],
  selectedYear: number | 'all' = 'all',
): AgroNdaGeneralReport {
  const years = [
    ...new Set(records.map((r) => yearFromFecha(r.fecha))),
  ].sort((a, b) => b - a)

  const scoped =
    selectedYear === 'all'
      ? records
      : records.filter((r) => yearFromFecha(r.fecha) === selectedYear)

  const ndas = scoped
    .map(effectiveNda)
    .filter((n): n is number => n != null)
  const idas = scoped
    .map((r) => r.notaIda)
    .filter((n): n is number => n != null)
  const cascos = scoped
    .map((r) => r.cascoVerde)
    .filter((n): n is number => n != null)
  const incidents = scoped
    .map((r) => r.incidentes)
    .filter((n): n is number => n != null)
  const comps = scoped
    .map((r) => r.compromisos)
    .filter((n): n is number => n != null)

  const avgNda = avg(ndas)
  const avgIda = avg(idas)
  const avgCasco = avg(cascos)
  const avgIncidentes = avg(incidents)
  const avgCompromisos = avg(comps)

  const monthMap = new Map<
    string,
    {
      nda: number[]
      ida: number[]
      casco: number[]
      incidentes: number[]
      compromisos: number[]
      month: MonitoringMonth
      year: number
    }
  >()
  for (const r of scoped) {
    const month = monthFromFecha(r.fecha)
    if (!month) continue
    const year = yearFromFecha(r.fecha)
    const key = `${year}-${month}`
    const cur = monthMap.get(key) ?? {
      nda: [],
      ida: [],
      casco: [],
      incidentes: [],
      compromisos: [],
      month,
      year,
    }
    const n = effectiveNda(r)
    if (n != null) cur.nda.push(n)
    if (r.notaIda != null) cur.ida.push(r.notaIda)
    if (r.cascoVerde != null) cur.casco.push(r.cascoVerde)
    if (r.incidentes != null) cur.incidentes.push(r.incidentes)
    if (r.compromisos != null) cur.compromisos.push(r.compromisos)
    monthMap.set(key, cur)
  }

  const monthly = [...monthMap.values()]
    .sort(
      (a, b) =>
        a.year - b.year ||
        MONITORING_MONTHS.indexOf(a.month) -
          MONITORING_MONTHS.indexOf(b.month),
    )
    .map((m) => ({
      label: `${SHORT[m.month]} ${String(m.year).slice(2)}`,
      avgNda: avg(m.nda),
      avgIda: avg(m.ida),
      avgCasco: avg(m.casco),
      avgIncidentes: avg(m.incidentes),
      avgCompromisos: avg(m.compromisos),
      count: m.nda.length,
    }))

  const sedeMap = new Map<
    string,
    {
      nda: number[]
      ida: number[]
      casco: number[]
      lat: number | null
      lng: number | null
    }
  >()
  for (const r of scoped) {
    const cur = sedeMap.get(r.plantaSede) ?? {
      nda: [],
      ida: [],
      casco: [],
      lat: r.latitud,
      lng: r.longitud,
    }
    const n = effectiveNda(r)
    if (n != null) cur.nda.push(n)
    if (r.notaIda != null) cur.ida.push(r.notaIda)
    if (r.cascoVerde != null) cur.casco.push(r.cascoVerde)
    if (cur.lat == null && r.latitud != null) {
      cur.lat = r.latitud
      cur.lng = r.longitud
    }
    sedeMap.set(r.plantaSede, cur)
  }

  const bySede = [...sedeMap.entries()]
    .map(([sede, v]) => ({
      sede,
      count: v.nda.length,
      avgNda: avg(v.nda),
      avgIda: avg(v.ida),
      avgCasco: avg(v.casco),
    }))
    .sort((a, b) => (b.avgNda ?? 0) - (a.avgNda ?? 0) || a.sede.localeCompare(b.sede))

  const mapSites: NdaMapSite[] = [...sedeMap.entries()]
    .filter(([, v]) => v.lat != null && v.lng != null)
    .map(([sede, v]) => ({
      id: sede,
      sede,
      lat: v.lat as number,
      lng: v.lng as number,
      count: v.nda.length,
      avgNda: avg(v.nda),
    }))

  const detailRows = scoped
    .slice()
    .sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        a.plantaSede.localeCompare(b.plantaSede),
    )
    .map((r) => ({
      id: r.id,
      fecha: r.fecha,
      mes: monthFromFecha(r.fecha) ?? '—',
      sede: r.plantaSede,
      proyecto: r.proyectoMatriz || '—',
      ida: r.notaIda,
      casco: r.cascoVerde,
      incidentes: r.incidentes,
      compromisos: r.compromisos,
      nda: effectiveNda(r),
    }))

  const periodLabel =
    selectedYear === 'all' ? 'Todos los años' : String(selectedYear)

  const kpis = [
    {
      id: 'nda',
      label: 'NDA promedio',
      value: avgNda == null ? '—' : formatNum(avgNda, 1),
      hint: `${formatNum(scoped.length)} registro(s)`,
    },
    {
      id: 'ida',
      label: 'IDA (40%)',
      value: avgIda == null ? '—' : formatNum(avgIda, 1),
      hint: 'Nota legal ajustada',
    },
    {
      id: 'casco',
      label: 'Casco verde (30%)',
      value: avgCasco == null ? '—' : formatNum(avgCasco, 1),
      hint: 'Componente de inspecciones',
    },
    {
      id: 'ops',
      label: 'Inc. + Comp. (30%)',
      value:
        avgIncidentes == null && avgCompromisos == null
          ? '—'
          : formatNum(
              ((avgIncidentes ?? 0) + (avgCompromisos ?? 0)) / 2,
              1,
            ),
      hint: '15% + 15%',
    },
  ]

  const insights: AgroNdaGeneralReport['insights'] = []
  if (!scoped.length) {
    insights.push({
      id: 'empty',
      level: 'Atención',
      title: 'Sin NDA',
      text: 'Capture puntajes en Entrada de Datos.',
    })
  } else {
    if (avgNda != null && avgNda >= 98) {
      insights.push({
        id: 'ok',
        level: 'Positivo',
        title: 'NDA alto',
        text: `Promedio ${formatNum(avgNda, 1)} en el periodo.`,
      })
    }
    if (avgNda != null && avgNda < 95) {
      insights.push({
        id: 'low',
        level: 'Atención',
        title: 'NDA bajo 95',
        text: `Promedio actual: ${formatNum(avgNda, 1)}. Revisar componentes.`,
      })
    }
    if (avgCasco != null && avgIda != null && avgCasco < avgIda - 3) {
      insights.push({
        id: 'casco',
        level: 'Atención',
        title: 'Casco verde por debajo de IDA',
        text: `Casco ${formatNum(avgCasco, 1)} vs IDA ${formatNum(avgIda, 1)}.`,
      })
    }
    const worst = bySede.filter((s) => s.avgNda != null).at(-1)
    if (worst && worst.avgNda != null && bySede.length > 1) {
      insights.push({
        id: 'sede',
        level: 'Atención',
        title: 'Sede a reforzar',
        text: `${worst.sede} con NDA ${formatNum(worst.avgNda, 1)}.`,
      })
    }
  }

  return {
    meta: {
      years,
      selectedYear,
      periodLabel,
      totalRows: scoped.length,
    },
    kpis,
    insights,
    monthly,
    bySede,
    mapSites,
    componentShare: [
      { name: 'IDA', weight: 40, avg: avgIda },
      { name: 'Casco verde', weight: 30, avg: avgCasco },
      { name: 'Incidentes', weight: 15, avg: avgIncidentes },
      { name: 'Compromisos', weight: 15, avg: avgCompromisos },
    ],
    detailRows,
    totals: {
      avgNda,
      avgIda,
      avgCasco,
      avgIncidentes,
      avgCompromisos,
    },
  }
}
