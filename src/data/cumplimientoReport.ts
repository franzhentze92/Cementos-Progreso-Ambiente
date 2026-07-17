import {
  daysUntil,
  derivedEstado,
  formatNum,
  riskForObligacion,
  type CumplimientoRecord,
  type CumplimientoRisk,
} from './cumplimiento'

export type InsightLevel = 'Crítico' | 'Atención' | 'Positivo'

export type CumplimientoInsight = {
  id: string
  level: InsightLevel
  title: string
  text: string
}

export type CumplimientoReport = {
  meta: {
    total: number
    vigentes: number
    porVencer: number
    vencidos: number
    enTramite: number
    cumplidos: number
    altaCriticidad: number
  }
  kpis: Array<{
    id: string
    label: string
    value: string
    hint: string
    tone: 'default' | 'warn' | 'ok' | 'dark'
  }>
  byEstado: Array<{ name: string; value: number }>
  byTipo: Array<{ name: string; value: number }>
  byUnidad: Array<{ name: string; value: number; vencidos: number; porVencer: number }>
  byCriticidad: Array<{ name: string; value: number }>
  calendar: Array<{
    id: string
    titulo: string
    sitio: string
    fecha: string
    days: number
    risk: CumplimientoRisk
    criticidad: string
    estado: string
  }>
  detailRows: Array<
    CumplimientoRecord & {
      days: number | null
      risk: CumplimientoRisk
      estadoDerivado: string
    }
  >
  insights: CumplimientoInsight[]
}

function countBy<T>(rows: T[], key: (r: T) => string) {
  const map = new Map<string, number>()
  for (const r of rows) {
    const k = key(r).trim() || 'Sin dato'
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
}

export function buildCumplimientoReport(
  records: CumplimientoRecord[],
): CumplimientoReport {
  const detailRows = records
    .map((r) => {
      const risk = riskForObligacion(r)
      return {
        ...r,
        days: daysUntil(r.fechaVencimiento),
        risk,
        estadoDerivado: derivedEstado(r),
      }
    })
    .sort((a, b) => {
      const da = a.days ?? 9999
      const db = b.days ?? 9999
      return da - db
    })

  const vencidos = detailRows.filter((r) => r.risk === 'vencido').length
  const porVencer = detailRows.filter(
    (r) => r.risk === 'critico' || r.risk === 'atencion',
  ).length
  const enTramite = detailRows.filter((r) =>
    /tr[aá]mite/i.test(r.estado),
  ).length
  const cumplidos = detailRows.filter((r) => /cumplido/i.test(r.estado)).length
  const vigentes = detailRows.filter(
    (r) => r.risk === 'ok' || r.risk === 'sin-fecha',
  ).length
  const altaCriticidad = detailRows.filter((r) =>
    /alta/i.test(r.criticidad),
  ).length

  const byUnidadMap = new Map<
    string,
    { value: number; vencidos: number; porVencer: number }
  >()
  for (const r of detailRows) {
    const name = r.unidadNegocio || 'Sin unidad'
    const cur = byUnidadMap.get(name) ?? {
      value: 0,
      vencidos: 0,
      porVencer: 0,
    }
    cur.value += 1
    if (r.risk === 'vencido') cur.vencidos += 1
    if (r.risk === 'critico' || r.risk === 'atencion') cur.porVencer += 1
    byUnidadMap.set(name, cur)
  }

  const calendar = detailRows
    .filter((r) => r.fechaVencimiento && r.days != null && r.days <= 120)
    .slice(0, 20)
    .map((r) => ({
      id: r.id,
      titulo: r.titulo,
      sitio: r.sitio,
      fecha: r.fechaVencimiento!,
      days: r.days!,
      risk: r.risk,
      criticidad: r.criticidad,
      estado: r.estadoDerivado,
    }))

  const insights: CumplimientoInsight[] = []
  if (vencidos > 0) {
    insights.push({
      id: 'vencidos',
      level: 'Crítico',
      title: `${formatNum(vencidos)} obligación(es) vencida(s)`,
      text: 'Priorizar renovación o cierre documental antes de auditoría o visita de autoridad.',
    })
  }
  if (porVencer > 0) {
    insights.push({
      id: 'por-vencer',
      level: 'Atención',
      title: `${formatNum(porVencer)} por vencer en ventana de alerta`,
      text: 'Revisar responsables y evidencias en el calendario de vencimientos (30–90 días).',
    })
  }
  if (altaCriticidad > 0 && vencidos + porVencer > 0) {
    insights.push({
      id: 'alta',
      level: 'Atención',
      title: `${formatNum(altaCriticidad)} de criticidad alta`,
      text: 'Cruzar obligaciones de alta criticidad con CAPA abiertas y evidencias en el expediente.',
    })
  }
  if (vencidos === 0 && porVencer === 0 && records.length > 0) {
    insights.push({
      id: 'ok',
      level: 'Positivo',
      title: 'Sin vencimientos críticos',
      text: 'El portafolio de obligaciones no muestra vencidos ni alertas inmediatas en la ventana actual.',
    })
  }

  return {
    meta: {
      total: records.length,
      vigentes,
      porVencer,
      vencidos,
      enTramite,
      cumplidos,
      altaCriticidad,
    },
    kpis: [
      {
        id: 'total',
        label: 'Obligaciones',
        value: formatNum(records.length),
        hint: 'Portafolio activo',
        tone: 'dark',
      },
      {
        id: 'vencidos',
        label: 'Vencidas',
        value: formatNum(vencidos),
        hint: 'Riesgo legal',
        tone: vencidos > 0 ? 'warn' : 'ok',
      },
      {
        id: 'por-vencer',
        label: 'Por vencer',
        value: formatNum(porVencer),
        hint: '≤ ventana de alerta',
        tone: porVencer > 0 ? 'warn' : 'default',
      },
      {
        id: 'tramite',
        label: 'En trámite',
        value: formatNum(enTramite),
        hint: 'Gestión en curso',
        tone: 'default',
      },
    ],
    byEstado: countBy(detailRows, (r) => r.estadoDerivado),
    byTipo: countBy(detailRows, (r) => r.tipoObligacion),
    byUnidad: [...byUnidadMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.value - a.value),
    byCriticidad: countBy(detailRows, (r) => r.criticidad),
    calendar,
    detailRows,
    insights,
  }
}
