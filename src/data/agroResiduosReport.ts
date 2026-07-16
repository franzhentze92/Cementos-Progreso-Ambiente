/**
 * Agregados para Operaciones · Agroprogreso · Gestión de residuos.
 * Solo datos reales de agro_gestion_residuos.
 */

import {
  MONITORING_MONTHS,
  fechaFromYearMonth,
  formatNum,
  monthFromFecha,
  yearFromFecha,
  type AgroResiduosRecord,
  type MonitoringMonth,
} from './agroResiduos'

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

const COLORS = [
  '#047935',
  '#5ab64b',
  '#c2d500',
  '#1f3d2a',
  '#8b7355',
  '#3d7ea6',
  '#d4a017',
  '#6b8e6b',
  '#2a5238',
  '#a35d3a',
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

export type AgroResiduosReport = {
  meta: {
    years: number[]
    selectedYear: number | 'all'
    periodLabel: string
    totalRows: number
    rowsWithQty: number
    rowsPositiveQty: number
    coveragePct: number
  }
  kpis: ReportKpi[]
  insights: ReportInsight[]
  monthlyTonsLike: Array<{
    month: string
    label: string
    fecha: string
    totalLbs: number
    filas: number
    filasConCantidad: number
  }>
  rutaShare: Array<{ name: string; value: number; fill: string; rows: number }>
  tecnicaShare: Array<{ name: string; value: number; fill: string; rows: number }>
  operativaShare: Array<{ name: string; value: number; fill: string; rows: number }>
  sedeShare: Array<{ name: string; value: number; fill: string; rows: number }>
  tipoRanking: Array<{
    name: string
    value: number
    fill: string
    share: number
    rows: number
  }>
  gestorRanking: Array<{ name: string; value: number; fill: string; rows: number }>
  completeness: Array<{
    fecha: string
    month: string
    filas: number
    conCantidad: number
    positivas: number
    totalLbs: number
  }>
  detailRows: Array<{
    fecha: string
    mes: string
    sede: string
    tipo: string
    tecnica: string
    operativa: string
    ruta: string
    gestor: string
    cantidad: number | null
  }>
  totals: {
    totalLbs: number
    positiveLbs: number
  }
}

function sumMap(
  records: AgroResiduosRecord[],
  keyFn: (r: AgroResiduosRecord) => string,
  onlyPositive = false,
) {
  const map = new Map<string, { value: number; rows: number }>()
  for (const r of records) {
    const k = keyFn(r).trim() || '(sin dato)'
    const qty = r.cantidadLbs
    if (onlyPositive && (qty == null || qty <= 0)) continue
    const prev = map.get(k) ?? { value: 0, rows: 0 }
    prev.rows += 1
    if (qty != null && !Number.isNaN(qty)) prev.value += qty
    map.set(k, prev)
  }
  return map
}

function toShare(
  map: Map<string, { value: number; rows: number }>,
  mode: 'value' | 'rows' = 'value',
) {
  const entries = [...map.entries()].sort((a, b) =>
    mode === 'value' ? b[1].value - a[1].value : b[1].rows - a[1].rows,
  )
  return entries.map(([name, v], i) => ({
    name,
    value: Math.round((mode === 'value' ? v.value : v.rows) * 100) / 100,
    fill: COLORS[i % COLORS.length],
    rows: v.rows,
  }))
}

export function availableYears(records: AgroResiduosRecord[]): number[] {
  const set = new Set(records.map((r) => yearFromFecha(r.fecha)))
  return [...set].sort((a, b) => a - b)
}

export function buildAgroResiduosReport(
  records: AgroResiduosRecord[],
  selectedYear: number | 'all' = 'all',
): AgroResiduosReport {
  const years = availableYears(records)
  const scoped =
    selectedYear === 'all'
      ? records
      : records.filter((r) => yearFromFecha(r.fecha) === selectedYear)

  const withQty = scoped.filter((r) => r.cantidadLbs != null)
  const positive = scoped.filter(
    (r) => r.cantidadLbs != null && r.cantidadLbs > 0,
  )
  const totalLbs = withQty.reduce((a, r) => a + (r.cantidadLbs as number), 0)
  const positiveLbs = positive.reduce((a, r) => a + (r.cantidadLbs as number), 0)

  const dates = [...new Set(scoped.map((r) => r.fecha))].sort()
  const periodLabel =
    !dates.length
      ? 'Sin datos'
      : selectedYear === 'all'
        ? `${dates[0].slice(0, 7)} → ${dates.at(-1)!.slice(0, 7)}`
        : `Año ${selectedYear}`

  const monthlyMap = new Map<
    string,
    {
      fecha: string
      month: MonitoringMonth
      year: number
      totalLbs: number
      filas: number
      filasConCantidad: number
    }
  >()

  for (const r of scoped) {
    const month = monthFromFecha(r.fecha)
    if (!month) continue
    let b = monthlyMap.get(r.fecha)
    if (!b) {
      b = {
        fecha: r.fecha,
        month,
        year: yearFromFecha(r.fecha),
        totalLbs: 0,
        filas: 0,
        filasConCantidad: 0,
      }
      monthlyMap.set(r.fecha, b)
    }
    b.filas += 1
    if (r.cantidadLbs != null) {
      b.filasConCantidad += 1
      b.totalLbs += r.cantidadLbs
    }
  }

  const monthlyTonsLike = [...monthlyMap.values()]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((b) => ({
      month: SHORT[b.month],
      label:
        selectedYear === 'all'
          ? `${SHORT[b.month]} ${String(b.year).slice(2)}`
          : SHORT[b.month],
      fecha: b.fecha,
      totalLbs: Math.round(b.totalLbs * 100) / 100,
      filas: b.filas,
      filasConCantidad: b.filasConCantidad,
    }))

  const rutaShare = toShare(sumMap(scoped, (r) => r.rutaGestion, true))
  const tecnicaShare = toShare(
    sumMap(scoped, (r) => r.clasificacionTecnica, false),
    'rows',
  )
  const operativaShare = toShare(
    sumMap(scoped, (r) => r.clasificacionOperativa, false),
    'rows',
  )
  const sedeShare = toShare(sumMap(scoped, (r) => r.sede, true))

  const tipoMap = sumMap(scoped, (r) => r.tipoResiduos, true)
  const tipoRanking = [...tipoMap.entries()]
    .map(([name, v]) => ({
      name,
      value: Math.round(v.value * 100) / 100,
      rows: v.rows,
      share: positiveLbs > 0 ? (v.value / positiveLbs) * 100 : 0,
      fill: '',
    }))
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, fill: COLORS[i % COLORS.length] }))

  const gestorRanking = toShare(sumMap(scoped, (r) => r.gestorPlanta, true))

  const monthsInScope =
    selectedYear === 'all'
      ? dates
      : MONITORING_MONTHS.map((m) => fechaFromYearMonth(selectedYear, m))

  const completeness = monthsInScope.map((fecha) => {
    const rows = scoped.filter((r) => r.fecha === fecha)
    const conCantidad = rows.filter((r) => r.cantidadLbs != null).length
    const positivas = rows.filter(
      (r) => r.cantidadLbs != null && r.cantidadLbs > 0,
    ).length
    const total = rows.reduce((a, r) => a + (r.cantidadLbs ?? 0), 0)
    const month = monthFromFecha(fecha)
    return {
      fecha,
      month: month ? SHORT[month] : fecha.slice(5, 7),
      filas: rows.length,
      conCantidad,
      positivas,
      totalLbs: Math.round(total * 100) / 100,
    }
  })

  const lastWithQty = [...monthlyTonsLike].reverse().find((m) => m.totalLbs > 0)
  const prevWithQty = [...monthlyTonsLike]
    .reverse()
    .filter((m) => m.totalLbs > 0)[1]
  const momDelta =
    lastWithQty && prevWithQty && prevWithQty.totalLbs
      ? ((lastWithQty.totalLbs - prevWithQty.totalLbs) / prevWithQty.totalLbs) *
        100
      : null

  const topTipo = tipoRanking[0]
  const topRuta = rutaShare[0]
  const monthsWithPositive = monthlyTonsLike.filter((m) => m.totalLbs > 0).length

  const kpis: ReportKpi[] = [
    {
      id: 'total',
      label: 'Cantidad total registrada',
      value: formatNum(positiveLbs, 0),
      unit: 'lbs',
      hint: periodLabel,
      delta: momDelta,
      deltaLabel:
        lastWithQty && prevWithQty
          ? `vs ${prevWithQty.month}`
          : undefined,
    },
    {
      id: 'meses',
      label: 'Meses con cantidad > 0',
      value: String(monthsWithPositive),
      unit: `/ ${monthlyTonsLike.length || 0}`,
      hint: 'Solo meses con libras positivas',
    },
    {
      id: 'ruta',
      label: 'Ruta dominante',
      value: topRuta?.name ?? '—',
      unit: topRuta ? `${formatNum(topRuta.value, 0)} lbs` : '',
      hint: topRuta
        ? `${topRuta.rows} fila(s) con cantidad > 0`
        : 'Sin cantidades positivas',
    },
    {
      id: 'tipo',
      label: 'Tipo de mayor volumen',
      value: topTipo?.name ?? '—',
      unit: topTipo ? `${formatNum(topTipo.value, 0)} lbs` : '',
      hint: topTipo ? `${topTipo.share.toFixed(0)}% del volumen positivo` : '—',
    },
  ]

  const insights: ReportInsight[] = []

  if (positive.length === 0 && scoped.length > 0) {
    insights.push({
      id: 'all-zero',
      level: 'Atención',
      title: 'Plantilla sin cantidades positivas',
      text: `Hay ${scoped.length} filas registradas, pero ninguna con cantidad > 0 lbs en el periodo. El Excel suele traer 0 como placeholder.`,
    })
  }

  if (monthsWithPositive === 1 && lastWithQty) {
    insights.push({
      id: 'single-month',
      level: 'Atención',
      title: 'Volumen concentrado en un solo mes',
      text: `El único mes con libras positivas es ${lastWithQty.label} (${formatNum(lastWithQty.totalLbs)} lbs).`,
    })
  }

  if (topTipo && topTipo.share >= 30) {
    insights.push({
      id: 'tipo-conc',
      level: 'Positivo',
      title: 'Principal corriente de residuos',
      text: `${topTipo.name} concentra ${topTipo.share.toFixed(0)}% del volumen positivo (${formatNum(topTipo.value)} lbs).`,
    })
  }

  const zeroHeavy = completeness.filter((c) => c.filas > 0 && c.positivas === 0)
  if (zeroHeavy.length >= 3) {
    insights.push({
      id: 'zero-months',
      level: 'Atención',
      title: 'Meses sin descarga cuantificada',
      text: `${zeroHeavy.length} mes(es) tienen filas de gestión pero cantidad 0 o vacía. Conviene completar mediciones en captura.`,
    })
  }

  const reciclajeRows = scoped.filter((r) => r.rutaGestion === 'Reciclaje').length
  if (reciclajeRows > 0) {
    insights.push({
      id: 'reciclaje',
      level: 'Positivo',
      title: 'Presencia de reciclaje',
      text: `${reciclajeRows} fila(s) clasificadas en ruta Reciclaje en el periodo.`,
    })
  }

  const detailRows = scoped
    .slice()
    .sort((a, b) =>
      a.fecha === b.fecha
        ? a.sede.localeCompare(b.sede) ||
          a.tipoResiduos.localeCompare(b.tipoResiduos)
        : b.fecha.localeCompare(a.fecha),
    )
    .map((r) => ({
      fecha: r.fecha,
      mes: monthFromFecha(r.fecha) ?? '—',
      sede: r.sede,
      tipo: r.tipoResiduos || '—',
      tecnica: r.clasificacionTecnica || '—',
      operativa: r.clasificacionOperativa || '—',
      ruta: r.rutaGestion || '—',
      gestor: r.gestorPlanta || '—',
      cantidad: r.cantidadLbs,
    }))

  return {
    meta: {
      years,
      selectedYear,
      periodLabel,
      totalRows: scoped.length,
      rowsWithQty: withQty.length,
      rowsPositiveQty: positive.length,
      coveragePct:
        scoped.length > 0 ? (withQty.length / scoped.length) * 100 : 0,
    },
    kpis,
    insights,
    monthlyTonsLike,
    rutaShare,
    tecnicaShare,
    operativaShare,
    sedeShare,
    tipoRanking,
    gestorRanking,
    completeness,
    detailRows,
    totals: { totalLbs, positiveLbs },
  }
}
