/**
 * Analytics NDA Casco Verde · Agroprogreso.
 */
import {
  MONITORING_MONTHS,
  formatNum,
  monthFromFecha,
  yearFromFecha,
  type AgroNdaCascoVerdeRecord,
  type MonitoringMonth,
} from './agroNdaCascoVerde'

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

export type CascoMapSite = {
  id: string
  sede: string
  lat: number
  lng: number
  count: number
  avgNota: number | null
  hallazgos: number
}

export type AgroNdaCascoVerdeReport = {
  meta: {
    years: number[]
    selectedYear: number | 'all'
    periodLabel: string
    totalRows: number
    withScore: number
    withHallazgos: number
  }
  kpis: { id: string; label: string; value: string; hint: string }[]
  insights: {
    id: string
    level: 'Crítico' | 'Atención' | 'Positivo'
    title: string
    text: string
  }[]
  monthlyAvg: {
    label: string
    avgNota: number | null
    count: number
    hallazgos: number
  }[]
  bySede: {
    sede: string
    count: number
    avgNota: number | null
    hallazgos: number
  }[]
  byInspector: { name: string; count: number; avgNota: number | null }[]
  mapSites: CascoMapSite[]
  detailRows: {
    id: string
    fecha: string
    semana: number | null
    mes: string
    sede: string
    noInspeccion: number | null
    inspector: string
    nota: number | null
    hallazgos: number
    observaciones: string
    link: string
  }[]
  totals: { avgNota: number | null; totalHallazgos: number }
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function buildAgroNdaCascoVerdeReport(
  records: AgroNdaCascoVerdeRecord[],
  selectedYear: number | 'all' = 'all',
): AgroNdaCascoVerdeReport {
  const years = [
    ...new Set(records.map((r) => yearFromFecha(r.fecha))),
  ].sort((a, b) => b - a)

  const scoped =
    selectedYear === 'all'
      ? records
      : records.filter((r) => yearFromFecha(r.fecha) === selectedYear)

  const scores = scoped
    .filter((r) => r.nota != null)
    .map((r) => r.nota as number)
  const avgNota = avg(scores)
  const totalHallazgos = scoped.reduce(
    (s, r) => s + (r.hallazgosCriticos ?? 0),
    0,
  )
  const withHallazgos = scoped.filter((r) => (r.hallazgosCriticos ?? 0) > 0)
    .length

  const monthMap = new Map<
    string,
    { scores: number[]; count: number; hallazgos: number; month: MonitoringMonth; year: number }
  >()
  for (const r of scoped) {
    const month = monthFromFecha(r.fecha)
    if (!month) continue
    const year = yearFromFecha(r.fecha)
    const key = `${year}-${month}`
    const cur = monthMap.get(key) ?? {
      scores: [],
      count: 0,
      hallazgos: 0,
      month,
      year,
    }
    cur.count += 1
    cur.hallazgos += r.hallazgosCriticos ?? 0
    if (r.nota != null) cur.scores.push(r.nota)
    monthMap.set(key, cur)
  }

  const monthlyAvg = [...monthMap.values()]
    .sort(
      (a, b) =>
        a.year - b.year ||
        MONITORING_MONTHS.indexOf(a.month) -
          MONITORING_MONTHS.indexOf(b.month),
    )
    .map((m) => ({
      label: `${SHORT[m.month]} ${String(m.year).slice(2)}`,
      avgNota: avg(m.scores),
      count: m.count,
      hallazgos: m.hallazgos,
    }))

  const sedeMap = new Map<
    string,
    {
      scores: number[]
      count: number
      hallazgos: number
      lat: number | null
      lng: number | null
    }
  >()
  for (const r of scoped) {
    const cur = sedeMap.get(r.plantaSede) ?? {
      scores: [],
      count: 0,
      hallazgos: 0,
      lat: r.latitud,
      lng: r.longitud,
    }
    cur.count += 1
    cur.hallazgos += r.hallazgosCriticos ?? 0
    if (r.nota != null) cur.scores.push(r.nota)
    if (cur.lat == null && r.latitud != null) {
      cur.lat = r.latitud
      cur.lng = r.longitud
    }
    sedeMap.set(r.plantaSede, cur)
  }

  const bySede = [...sedeMap.entries()]
    .map(([sede, v]) => ({
      sede,
      count: v.count,
      avgNota: avg(v.scores),
      hallazgos: v.hallazgos,
    }))
    .sort((a, b) => b.count - a.count || a.sede.localeCompare(b.sede))

  const mapSites: CascoMapSite[] = [...sedeMap.entries()]
    .filter(([, v]) => v.lat != null && v.lng != null)
    .map(([sede, v]) => ({
      id: sede,
      sede,
      lat: v.lat as number,
      lng: v.lng as number,
      count: v.count,
      avgNota: avg(v.scores),
      hallazgos: v.hallazgos,
    }))

  const inspMap = new Map<string, { scores: number[]; count: number }>()
  for (const r of scoped) {
    const name = r.inspector || 'Sin inspector'
    const cur = inspMap.get(name) ?? { scores: [], count: 0 }
    cur.count += 1
    if (r.nota != null) cur.scores.push(r.nota)
    inspMap.set(name, cur)
  }
  const byInspector = [...inspMap.entries()]
    .map(([name, v]) => ({
      name,
      count: v.count,
      avgNota: avg(v.scores),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  const detailRows = scoped
    .slice()
    .sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        (b.noInspeccion ?? 0) - (a.noInspeccion ?? 0),
    )
    .map((r) => ({
      id: r.id,
      fecha: r.fecha,
      semana: r.semana,
      mes: monthFromFecha(r.fecha) ?? '—',
      sede: r.plantaSede,
      noInspeccion: r.noInspeccion,
      inspector: r.inspector,
      nota: r.nota,
      hallazgos: r.hallazgosCriticos,
      observaciones: r.observaciones,
      link: r.link,
    }))

  const periodLabel =
    selectedYear === 'all' ? 'Todos los años' : String(selectedYear)

  const kpis = [
    {
      id: 'insp',
      label: 'Inspecciones',
      value: formatNum(scoped.length),
      hint: `${formatNum(bySede.length)} sede(s)`,
    },
    {
      id: 'nota',
      label: 'Nota promedio',
      value: avgNota == null ? '—' : formatNum(avgNota, 1),
      hint: 'Escala 0–100',
    },
    {
      id: 'hall',
      label: 'Hallazgos críticos',
      value: formatNum(totalHallazgos),
      hint: `${formatNum(withHallazgos)} inspección(es) con hallazgos`,
    },
    {
      id: 'low',
      label: 'Notas < 95',
      value: formatNum(scores.filter((n) => n < 95).length),
      hint: 'Revisar observaciones',
    },
  ]

  const insights: AgroNdaCascoVerdeReport['insights'] = []
  if (!scoped.length) {
    insights.push({
      id: 'empty',
      level: 'Atención',
      title: 'Sin inspecciones',
      text: 'Capture Casco Verde en Entrada de Datos.',
    })
  } else {
    if (avgNota != null && avgNota >= 95) {
      insights.push({
        id: 'ok',
        level: 'Positivo',
        title: 'Desempeño sólido',
        text: `Nota promedio ${formatNum(avgNota, 1)} en el periodo.`,
      })
    }
    if (avgNota != null && avgNota < 95) {
      insights.push({
        id: 'score',
        level: 'Atención',
        title: 'Nota bajo 95',
        text: `Promedio actual: ${formatNum(avgNota, 1)}. Revisar hallazgos y observaciones.`,
      })
    }
    if (totalHallazgos > 0) {
      insights.push({
        id: 'hall',
        level: 'Crítico',
        title: 'Hallazgos críticos',
        text: `${formatNum(totalHallazgos)} hallazgo(s) registrado(s) en el periodo.`,
      })
    }
    const worst = [...bySede]
      .filter((s) => s.avgNota != null)
      .sort((a, b) => (a.avgNota ?? 100) - (b.avgNota ?? 100))[0]
    if (worst && worst.avgNota != null && worst.avgNota < 95) {
      insights.push({
        id: 'sede',
        level: 'Atención',
        title: 'Sede a reforzar',
        text: `${worst.sede} con nota promedio ${formatNum(worst.avgNota, 1)}.`,
      })
    }
  }

  return {
    meta: {
      years,
      selectedYear,
      periodLabel,
      totalRows: scoped.length,
      withScore: scores.length,
      withHallazgos,
    },
    kpis,
    insights,
    monthlyAvg,
    bySede,
    byInspector,
    mapSites,
    detailRows,
    totals: { avgNota, totalHallazgos },
  }
}
