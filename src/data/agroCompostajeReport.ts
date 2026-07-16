/**
 * Analytics Compostaje desechos orgánicos · Agroprogreso.
 */
import {
  AGRO_COMPOSTAJE_FINCAS,
  MONITORING_MONTHS,
  fechaFromYearMonth,
  formatNum,
  monthFromFecha,
  yearFromFecha,
  type AgroCompostajeRecord,
  type MonitoringMonth,
} from './agroCompostaje'

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

export type AgroCompostajeReport = {
  meta: {
    years: number[]
    selectedYear: number | 'all'
    periodLabel: string
    monthsWithData: number
    recordsWithValue: number
  }
  kpis: { id: string; label: string; value: string; hint: string }[]
  insights: {
    id: string
    level: 'Crítico' | 'Atención' | 'Positivo'
    title: string
    text: string
  }[]
  monthly: Array<{
    label: string
    monthFull: MonitoringMonth
    year: number
    fecha: string
    pilar: number
    sanMiguel: number
    total: number
  }>
  byFinca: { name: string; value: number }[]
  detailRows: {
    id: string
    fecha: string
    mes: string
    year: number
    finca: string
    toneladas: number | null
  }[]
  totals: {
    total: number
    pilar: number
    sanMiguel: number
    avgMonth: number | null
    peakMonth: { label: string; total: number } | null
  }
}

export function buildAgroCompostajeReport(
  records: AgroCompostajeRecord[],
  selectedYear: number | 'all' = 'all',
): AgroCompostajeReport {
  const years = [
    ...new Set(records.map((r) => yearFromFecha(r.fecha))),
  ].sort((a, b) => b - a)

  const scoped =
    selectedYear === 'all'
      ? records
      : records.filter((r) => yearFromFecha(r.fecha) === selectedYear)

  const withValue = scoped.filter((r) => r.toneladas != null)
  const byFecha = new Map<
    string,
    { pilar: number; sanMiguel: number; total: number }
  >()

  for (const r of withValue) {
    const cur = byFecha.get(r.fecha) ?? {
      pilar: 0,
      sanMiguel: 0,
      total: 0,
    }
    const ton = r.toneladas ?? 0
    if (r.finca === 'Finca El Pilar') cur.pilar += ton
    else if (r.finca === 'Finca San Miguel') cur.sanMiguel += ton
    cur.total += ton
    byFecha.set(r.fecha, cur)
  }

  const fechas = [...byFecha.keys()].sort()
  const monthly = fechas.map((fecha) => {
    const month = monthFromFecha(fecha) ?? 'Enero'
    const year = yearFromFecha(fecha)
    const v = byFecha.get(fecha)!
    return {
      label: `${SHORT[month]} ${String(year).slice(2)}`,
      monthFull: month,
      year,
      fecha,
      pilar: v.pilar,
      sanMiguel: v.sanMiguel,
      total: v.total,
    }
  })

  const pilar = withValue
    .filter((r) => r.finca === 'Finca El Pilar')
    .reduce((s, r) => s + (r.toneladas ?? 0), 0)
  const sanMiguel = withValue
    .filter((r) => r.finca === 'Finca San Miguel')
    .reduce((s, r) => s + (r.toneladas ?? 0), 0)
  const total = pilar + sanMiguel
  const monthsWithData = monthly.filter((m) => m.total > 0).length
  const avgMonth = monthsWithData ? total / monthsWithData : null
  const peakMonth =
    monthly.length === 0
      ? null
      : monthly.reduce((best, m) =>
          m.total > best.total ? m : best,
          monthly[0],
        )

  const byFinca = AGRO_COMPOSTAJE_FINCAS.map((name) => ({
    name,
    value:
      name === 'Finca El Pilar'
        ? pilar
        : name === 'Finca San Miguel'
          ? sanMiguel
          : 0,
  })).filter((x) => x.value > 0)

  const detailRows = scoped
    .slice()
    .sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) || a.finca.localeCompare(b.finca),
    )
    .map((r) => {
      const month = monthFromFecha(r.fecha)
      return {
        id: r.id,
        fecha: r.fecha,
        mes: month ?? '—',
        year: yearFromFecha(r.fecha),
        finca: r.finca,
        toneladas: r.toneladas,
      }
    })

  const periodLabel =
    selectedYear === 'all' ? 'Todos los años' : String(selectedYear)

  const sharePilar = total > 0 ? (pilar / total) * 100 : null

  const kpis: AgroCompostajeReport['kpis'] = [
    {
      id: 'total',
      label: 'Total compostado',
      value: formatNum(total, 2),
      hint: 't · periodo seleccionado',
    },
    {
      id: 'pilar',
      label: 'Finca El Pilar',
      value: formatNum(pilar, 2),
      hint:
        sharePilar == null ? 't' : `${formatNum(sharePilar, 0)}% del total`,
    },
    {
      id: 'sm',
      label: 'Finca San Miguel',
      value: formatNum(sanMiguel, 2),
      hint:
        sharePilar == null
          ? 't'
          : `${formatNum(100 - sharePilar, 0)}% del total`,
    },
    {
      id: 'avg',
      label: 'Promedio mensual',
      value: avgMonth == null ? '—' : formatNum(avgMonth, 2),
      hint: `${formatNum(monthsWithData)} mes(es) con dato`,
    },
  ]

  const insights: AgroCompostajeReport['insights'] = []
  if (!withValue.length) {
    insights.push({
      id: 'empty',
      level: 'Atención',
      title: 'Sin compostaje',
      text: 'Capture toneladas por mes en Entrada de Datos.',
    })
  } else {
    if (peakMonth && peakMonth.total > 0) {
      insights.push({
        id: 'peak',
        level: 'Positivo',
        title: 'Mes pico',
        text: `${peakMonth.label} concentró ${formatNum(peakMonth.total, 2)} t.`,
      })
    }
    if (pilar > 0 && sanMiguel > 0 && Math.abs(pilar - sanMiguel) / total > 0.35) {
      const leader =
        pilar > sanMiguel ? 'Finca El Pilar' : 'Finca San Miguel'
      insights.push({
        id: 'share',
        level: 'Atención',
        title: 'Desbalance entre fincas',
        text: `${leader} aporta la mayor parte del compostaje en el periodo.`,
      })
    }
    const last = monthly[monthly.length - 1]
    const prev = monthly[monthly.length - 2]
    if (last && prev && prev.total > 0) {
      const delta = ((last.total - prev.total) / prev.total) * 100
      if (delta <= -25) {
        insights.push({
          id: 'drop',
          level: 'Crítico',
          title: 'Caída reciente',
          text: `${last.label} bajó ${formatNum(Math.abs(delta), 0)}% vs ${prev.label}.`,
        })
      } else if (delta >= 25) {
        insights.push({
          id: 'rise',
          level: 'Positivo',
          title: 'Alza reciente',
          text: `${last.label} subió ${formatNum(delta, 0)}% vs ${prev.label}.`,
        })
      }
    }
  }

  // Ensure months appear in calendar order for chart when filtering a year
  if (selectedYear !== 'all') {
    const year = selectedYear
    const filled = new Map(monthly.map((m) => [m.fecha, m]))
    const fullYear = MONITORING_MONTHS.map((month) => {
      const fecha = fechaFromYearMonth(year, month)
      return (
        filled.get(fecha) ?? {
          label: `${SHORT[month]} ${String(year).slice(2)}`,
          monthFull: month,
          year,
          fecha,
          pilar: 0,
          sanMiguel: 0,
          total: 0,
        }
      )
    })
    return {
      meta: {
        years,
        selectedYear,
        periodLabel,
        monthsWithData,
        recordsWithValue: withValue.length,
      },
      kpis,
      insights,
      monthly: fullYear,
      byFinca,
      detailRows,
      totals: {
        total,
        pilar,
        sanMiguel,
        avgMonth,
        peakMonth: peakMonth
          ? { label: peakMonth.label, total: peakMonth.total }
          : null,
      },
    }
  }

  return {
    meta: {
      years,
      selectedYear,
      periodLabel,
      monthsWithData,
      recordsWithValue: withValue.length,
    },
    kpis,
    insights,
    monthly,
    byFinca,
    detailRows,
    totals: {
      total,
      pilar,
      sanMiguel,
      avgMonth,
      peakMonth: peakMonth
        ? { label: peakMonth.label, total: peakMonth.total }
        : null,
    },
  }
}
