import type { AgroMonitoreoRecord } from './agroMonitoreos'
import {
  evaluateAgainstUmbral,
  formatNum,
  umbralLabel,
  type EvaluacionResultado,
  type UmbralRecord,
} from './umbrales'

export type InsightLevel = 'Crítico' | 'Atención' | 'Positivo'

export type UmbralesReport = {
  meta: {
    totalUmbrales: number
    activos: number
    evaluaciones: number
    cumple: number
    excede: number
    sinUmbral: number
    sinDato: number
    cumplePct: number | null
  }
  kpis: Array<{
    id: string
    label: string
    value: string
    hint: string
    tone: 'default' | 'warn' | 'ok' | 'dark'
  }>
  byParametro: Array<{ name: string; cumple: number; excede: number }>
  excedencias: Array<{
    fecha: string
    sede: string
    punto: string
    parametro: string
    resultado: number
    umbral: string
    criticidad: string
  }>
  insights: Array<{ id: string; level: InsightLevel; title: string; text: string }>
}

function findUmbral(
  umbrales: UmbralRecord[],
  parametro: string,
  tipoAgua: string,
): UmbralRecord | undefined {
  const activos = umbrales.filter((u) => u.activo)
  return (
    activos.find(
      (u) =>
        u.parametro.toLowerCase() === parametro.toLowerCase() &&
        (!u.tipoAgua ||
          !tipoAgua ||
          u.tipoAgua.toLowerCase() === tipoAgua.toLowerCase()),
    ) ||
    activos.find((u) => u.parametro.toLowerCase() === parametro.toLowerCase())
  )
}

export function evaluateMonitoreos(
  monitoreos: AgroMonitoreoRecord[],
  umbrales: UmbralRecord[],
): Array<{
  record: AgroMonitoreoRecord
  umbral: UmbralRecord | null
  resultado: EvaluacionResultado
}> {
  return monitoreos.map((r) => {
    const u = findUmbral(umbrales, r.parametro, r.tipoAgua)
    if (!u) return { record: r, umbral: null, resultado: 'sin-umbral' as const }
    return {
      record: r,
      umbral: u,
      resultado: evaluateAgainstUmbral(r.resultado, u),
    }
  })
}

export function buildUmbralesReport(
  umbrales: UmbralRecord[],
  monitoreos: AgroMonitoreoRecord[],
): UmbralesReport {
  const activos = umbrales.filter((u) => u.activo).length
  const evaluations = evaluateMonitoreos(monitoreos, umbrales)
  const withEval = evaluations.filter(
    (e) => e.resultado === 'cumple' || e.resultado === 'excede',
  )
  const cumple = evaluations.filter((e) => e.resultado === 'cumple').length
  const excede = evaluations.filter((e) => e.resultado === 'excede').length
  const sinUmbral = evaluations.filter((e) => e.resultado === 'sin-umbral').length
  const sinDato = evaluations.filter((e) => e.resultado === 'sin-dato').length
  const cumplePct =
    withEval.length > 0
      ? Math.round((cumple / withEval.length) * 1000) / 10
      : null

  const byParam = new Map<string, { cumple: number; excede: number }>()
  for (const e of evaluations) {
    if (e.resultado !== 'cumple' && e.resultado !== 'excede') continue
    const cur = byParam.get(e.record.parametro) ?? { cumple: 0, excede: 0 }
    if (e.resultado === 'cumple') cur.cumple += 1
    else cur.excede += 1
    byParam.set(e.record.parametro, cur)
  }

  const excedencias = evaluations
    .filter((e) => e.resultado === 'excede' && e.umbral && e.record.resultado != null)
    .map((e) => ({
      fecha: e.record.fecha,
      sede: e.record.plantaSede,
      punto: e.record.puntoMuestreo,
      parametro: e.record.parametro,
      resultado: e.record.resultado as number,
      umbral: umbralLabel(e.umbral!),
      criticidad: e.umbral!.criticidad,
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  const insights: UmbralesReport['insights'] = []
  if (excede > 0) {
    insights.push({
      id: 'excede',
      level: 'Crítico',
      title: `${formatNum(excede)} medición(es) fuera de umbral`,
      text: 'Abrir CAPA o verificar laboratorio/calibración en los parámetros excedidos.',
    })
  }
  if (cumplePct != null && cumplePct >= 95 && excede === 0) {
    insights.push({
      id: 'ok',
      level: 'Positivo',
      title: `Cumplimiento automático ${formatNum(cumplePct, 1)}%`,
      text: 'Las mediciones con umbral definido están dentro de límites.',
    })
  }
  if (activos === 0) {
    insights.push({
      id: 'sin-umbrales',
      level: 'Atención',
      title: 'Sin umbrales activos',
      text: 'Cargue el catálogo de límites para evaluar automáticamente los monitoreos.',
    })
  }

  return {
    meta: {
      totalUmbrales: umbrales.length,
      activos,
      evaluaciones: evaluations.length,
      cumple,
      excede,
      sinUmbral,
      sinDato,
      cumplePct,
    },
    kpis: [
      {
        id: 'activos',
        label: 'Umbrales activos',
        value: formatNum(activos),
        hint: `${formatNum(umbrales.length)} en catálogo`,
        tone: 'dark',
      },
      {
        id: 'cumple',
        label: 'Cumplimiento auto',
        value: cumplePct == null ? '—' : `${formatNum(cumplePct, 1)}%`,
        hint: `${formatNum(withEval.length)} mediciones evaluadas`,
        tone: cumplePct != null && cumplePct < 90 ? 'warn' : 'ok',
      },
      {
        id: 'excede',
        label: 'Excedencias',
        value: formatNum(excede),
        hint: 'Fuera de límite',
        tone: excede > 0 ? 'warn' : 'ok',
      },
      {
        id: 'sin',
        label: 'Sin umbral',
        value: formatNum(sinUmbral),
        hint: 'Parámetros sin catálogo',
        tone: sinUmbral > 0 ? 'default' : 'ok',
      },
    ],
    byParametro: [...byParam.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.excede - a.excede || b.cumple - a.cumple),
    excedencias,
    insights,
  }
}
