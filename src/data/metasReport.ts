import {
  derivedEstado,
  formatNum,
  progressPct,
  riskForMeta,
  type MetaRecord,
  type MetaRisk,
} from './metas'

export type InsightLevel = 'Crítico' | 'Atención' | 'Positivo'

export type MetasReport = {
  meta: {
    total: number
    enCurso: number
    cumplidas: number
    enRiesgo: number
    noCumplidas: number
    avgProgress: number | null
  }
  kpis: Array<{
    id: string
    label: string
    value: string
    hint: string
    tone: 'default' | 'warn' | 'ok' | 'dark'
  }>
  byCategoria: Array<{ name: string; value: number; avgPct: number | null }>
  byUnidad: Array<{ name: string; value: number; enRiesgo: number }>
  detailRows: Array<
    MetaRecord & {
      progress: number | null
      risk: MetaRisk
      estadoDerivado: string
    }
  >
  insights: Array<{ id: string; level: InsightLevel; title: string; text: string }>
}

export function buildMetasReport(records: MetaRecord[]): MetasReport {
  const detailRows = records
    .map((r) => ({
      ...r,
      progress: progressPct(r),
      risk: riskForMeta(r),
      estadoDerivado: derivedEstado(r),
    }))
    .sort((a, b) => {
      const rank = (risk: MetaRisk) =>
        risk === 'critico' ? 0 : risk === 'atencion' ? 1 : risk === 'sin-dato' ? 2 : 3
      return rank(a.risk) - rank(b.risk)
    })

  const cumplidas = detailRows.filter((r) => r.risk === 'cumplida').length
  const enRiesgo = detailRows.filter((r) => r.risk === 'atencion').length
  const noCumplidas = detailRows.filter((r) => r.risk === 'critico').length
  const enCurso = detailRows.filter((r) => r.risk === 'ok').length
  const withPct = detailRows.filter((r) => r.progress != null)
  const avgProgress =
    withPct.length > 0
      ? Math.round(
          (withPct.reduce((s, r) => s + (r.progress as number), 0) / withPct.length) * 10,
        ) / 10
      : null

  const byCatMap = new Map<string, { value: number; sum: number; n: number }>()
  for (const r of detailRows) {
    const cur = byCatMap.get(r.categoria) ?? { value: 0, sum: 0, n: 0 }
    cur.value += 1
    if (r.progress != null) {
      cur.sum += r.progress
      cur.n += 1
    }
    byCatMap.set(r.categoria || 'Otro', cur)
  }

  const byUnidadMap = new Map<string, { value: number; enRiesgo: number }>()
  for (const r of detailRows) {
    const cur = byUnidadMap.get(r.unidadNegocio) ?? { value: 0, enRiesgo: 0 }
    cur.value += 1
    if (r.risk === 'atencion' || r.risk === 'critico') cur.enRiesgo += 1
    byUnidadMap.set(r.unidadNegocio || 'Sin unidad', cur)
  }

  const insights: MetasReport['insights'] = []
  if (noCumplidas > 0) {
    insights.push({
      id: 'critico',
      level: 'Crítico',
      title: `${formatNum(noCumplidas)} meta(s) bajo umbral crítico`,
      text: 'Priorizar acciones operativas o revisar la meta y su fuente de dato.',
    })
  }
  if (enRiesgo > 0) {
    insights.push({
      id: 'riesgo',
      level: 'Atención',
      title: `${formatNum(enRiesgo)} meta(s) en zona de atención`,
      text: 'El avance está por debajo del umbral de atención definido.',
    })
  }
  if (avgProgress != null && avgProgress >= 95 && noCumplidas === 0) {
    insights.push({
      id: 'ok',
      level: 'Positivo',
      title: `Avance promedio ${formatNum(avgProgress, 1)}%`,
      text: 'El portafolio de metas opera dentro de rangos saludables.',
    })
  }
  if (records.length === 0) {
    insights.push({
      id: 'vacio',
      level: 'Atención',
      title: 'Sin metas definidas',
      text: 'Defina metas de agua, residuos, carbono o cumplimiento para gestionar por resultados.',
    })
  }

  return {
    meta: {
      total: records.length,
      enCurso,
      cumplidas,
      enRiesgo,
      noCumplidas,
      avgProgress,
    },
    kpis: [
      {
        id: 'total',
        label: 'Metas',
        value: formatNum(records.length),
        hint: 'Portafolio',
        tone: 'dark',
      },
      {
        id: 'avg',
        label: 'Avance promedio',
        value: avgProgress == null ? '—' : `${formatNum(avgProgress, 1)}%`,
        hint: 'Según sentido de cada meta',
        tone: avgProgress != null && avgProgress < 85 ? 'warn' : 'default',
      },
      {
        id: 'riesgo',
        label: 'En riesgo / críticas',
        value: formatNum(enRiesgo + noCumplidas),
        hint: `${formatNum(noCumplidas)} críticas`,
        tone: enRiesgo + noCumplidas > 0 ? 'warn' : 'ok',
      },
      {
        id: 'ok',
        label: 'Cumplidas',
        value: formatNum(cumplidas),
        hint: '≥ 100% o estado cumplida',
        tone: 'ok',
      },
    ],
    byCategoria: [...byCatMap.entries()]
      .map(([name, v]) => ({
        name,
        value: v.value,
        avgPct: v.n ? Math.round((v.sum / v.n) * 10) / 10 : null,
      }))
      .sort((a, b) => b.value - a.value),
    byUnidad: [...byUnidadMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.value - a.value),
    detailRows,
    insights,
  }
}
