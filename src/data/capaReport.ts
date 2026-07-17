import {
  daysUntil,
  formatNum,
  riskForCapa,
  type CapaRecord,
  type CapaRisk,
} from './capa'

export type InsightLevel = 'Crítico' | 'Atención' | 'Positivo'

export type CapaInsight = {
  id: string
  level: InsightLevel
  title: string
  text: string
}

export type CapaReport = {
  meta: {
    total: number
    abiertas: number
    enProgreso: number
    pendientesVerif: number
    cerradas: number
    vencidas: number
    altaPrioridad: number
    pctCierre: number | null
  }
  kpis: Array<{
    id: string
    label: string
    value: string
    hint: string
    tone: 'default' | 'warn' | 'ok' | 'dark'
  }>
  byEstado: Array<{ name: string; value: number }>
  byOrigen: Array<{ name: string; value: number }>
  byTipo: Array<{ name: string; value: number }>
  byUnidad: Array<{ name: string; value: number; abiertas: number; vencidas: number }>
  byPrioridad: Array<{ name: string; value: number }>
  aging: Array<{ name: string; value: number }>
  detailRows: Array<
    CapaRecord & {
      days: number | null
      risk: CapaRisk
      daysOpen: number | null
    }
  >
  insights: CapaInsight[]
}

function countBy(rows: CapaRecord[], key: (r: CapaRecord) => string) {
  const map = new Map<string, number>()
  for (const r of rows) {
    const k = key(r).trim() || 'Sin dato'
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
}

function daysOpen(fechaApertura: string, today = new Date()): number | null {
  return daysUntil(fechaApertura, today) != null
    ? Math.abs(daysUntil(fechaApertura, today)!)
    : null
}

export function buildCapaReport(records: CapaRecord[]): CapaReport {
  const detailRows = records
    .map((r) => ({
      ...r,
      days: daysUntil(r.fechaCompromiso),
      risk: riskForCapa(r),
      daysOpen: daysOpen(r.fechaApertura),
    }))
    .sort((a, b) => {
      const rank = (risk: CapaRisk) =>
        risk === 'vencida' ? 0 : risk === 'critica' ? 1 : risk === 'atencion' ? 2 : 3
      return rank(a.risk) - rank(b.risk)
    })

  const abiertas = detailRows.filter((r) =>
    /abierta|en progreso|pendiente/i.test(r.estado),
  ).length
  const enProgreso = detailRows.filter((r) => /progreso/i.test(r.estado)).length
  const pendientesVerif = detailRows.filter((r) =>
    /verificaci/i.test(r.estado),
  ).length
  const cerradas = detailRows.filter((r) => /cerrad/i.test(r.estado)).length
  const vencidas = detailRows.filter((r) => r.risk === 'vencida').length
  const altaPrioridad = detailRows.filter(
    (r) => /alta/i.test(r.prioridad) && !/cerrad|cancelad/i.test(r.estado),
  ).length
  const pctCierre =
    records.length > 0
      ? Math.round((cerradas / records.length) * 1000) / 10
      : null

  const byUnidadMap = new Map<
    string,
    { value: number; abiertas: number; vencidas: number }
  >()
  for (const r of detailRows) {
    const name = r.unidadNegocio || 'Sin unidad'
    const cur = byUnidadMap.get(name) ?? {
      value: 0,
      abiertas: 0,
      vencidas: 0,
    }
    cur.value += 1
    if (!/cerrad|cancelad/i.test(r.estado)) cur.abiertas += 1
    if (r.risk === 'vencida') cur.vencidas += 1
    byUnidadMap.set(name, cur)
  }

  const agingBuckets = [
    { name: '0–7 días', value: 0 },
    { name: '8–30 días', value: 0 },
    { name: '31–60 días', value: 0 },
    { name: '>60 días', value: 0 },
  ]
  for (const r of detailRows) {
    if (/cerrad|cancelad/i.test(r.estado)) continue
    const d = r.daysOpen ?? 0
    if (d <= 7) agingBuckets[0].value += 1
    else if (d <= 30) agingBuckets[1].value += 1
    else if (d <= 60) agingBuckets[2].value += 1
    else agingBuckets[3].value += 1
  }

  const insights: CapaInsight[] = []
  if (vencidas > 0) {
    insights.push({
      id: 'vencidas',
      level: 'Crítico',
      title: `${formatNum(vencidas)} CAPA con compromiso vencido`,
      text: 'Escalar a responsables y gerencia; documentar nueva fecha o evidencia de avance.',
    })
  }
  if (altaPrioridad > 0) {
    insights.push({
      id: 'alta',
      level: 'Atención',
      title: `${formatNum(altaPrioridad)} CAPA de prioridad alta abiertas`,
      text: 'Priorizar verificación de eficacia y cierre documental en esta semana.',
    })
  }
  if (pctCierre != null && pctCierre >= 70 && vencidas === 0) {
    insights.push({
      id: 'cierre',
      level: 'Positivo',
      title: `Tasa de cierre ${formatNum(pctCierre, 1)}%`,
      text: 'El ciclo hallazgo → acción → cierre está operando sin atrasos críticos.',
    })
  }
  if (records.length === 0) {
    insights.push({
      id: 'vacio',
      level: 'Atención',
      title: 'Sin CAPA registradas',
      text: 'Conecte hallazgos de inspecciones, incidentes o monitoreos para iniciar el ciclo de mejora.',
    })
  }

  return {
    meta: {
      total: records.length,
      abiertas,
      enProgreso,
      pendientesVerif,
      cerradas,
      vencidas,
      altaPrioridad,
      pctCierre,
    },
    kpis: [
      {
        id: 'abiertas',
        label: 'Abiertas / en curso',
        value: formatNum(abiertas),
        hint: 'Incluye verificación',
        tone: abiertas > 0 ? 'warn' : 'ok',
      },
      {
        id: 'vencidas',
        label: 'Compromiso vencido',
        value: formatNum(vencidas),
        hint: 'Fuera de plazo',
        tone: vencidas > 0 ? 'warn' : 'ok',
      },
      {
        id: 'cerradas',
        label: 'Cerradas',
        value: formatNum(cerradas),
        hint: pctCierre != null ? `${formatNum(pctCierre, 1)}% tasa` : 'Sin datos',
        tone: 'dark',
      },
      {
        id: 'alta',
        label: 'Prioridad alta',
        value: formatNum(altaPrioridad),
        hint: 'Sin cerrar',
        tone: altaPrioridad > 0 ? 'warn' : 'default',
      },
    ],
    byEstado: countBy(detailRows, (r) => r.estado),
    byOrigen: countBy(detailRows, (r) => r.origenTipo),
    byTipo: countBy(detailRows, (r) => r.tipoAccion),
    byUnidad: [...byUnidadMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.value - a.value),
    byPrioridad: countBy(detailRows, (r) => r.prioridad),
    aging: agingBuckets,
    detailRows,
    insights,
  }
}
