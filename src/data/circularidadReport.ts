import type { AgroResiduosRecord } from './agroResiduos'
import {
  formatNum,
  isRutaValorizada,
  type CircularidadRecord,
} from './circularidad'

export type InsightLevel = 'Crítico' | 'Atención' | 'Positivo'

export type CircularidadReport = {
  meta: {
    totalFlujos: number
    lbsTotal: number
    lbsValorizadas: number
    tasaValorizacionPct: number | null
    costoTotal: number
    agroLbs: number
    agroValorizacionPct: number | null
  }
  kpis: Array<{
    id: string
    label: string
    value: string
    hint: string
    tone: 'default' | 'warn' | 'ok' | 'dark'
  }>
  byRuta: Array<{ name: string; value: number; valorizado: boolean }>
  bySede: Array<{ name: string; lbs: number; valorizadas: number }>
  byClasificacion: Array<{ name: string; value: number }>
  insights: Array<{ id: string; level: InsightLevel; title: string; text: string }>
  detailRows: CircularidadRecord[]
}

function sumLbs(rows: Array<{ cantidadLbs: number | null }>): number {
  return rows.reduce((s, r) => s + (r.cantidadLbs ?? 0), 0)
}

export function buildCircularidadReport(
  flujos: CircularidadRecord[],
  agroResiduos: AgroResiduosRecord[] = [],
): CircularidadReport {
  const lbsTotal = sumLbs(flujos)
  const valorizadas = flujos.filter(
    (f) => f.valorizado || isRutaValorizada(f.ruta),
  )
  const lbsValorizadas = sumLbs(valorizadas)
  const tasaValorizacionPct =
    lbsTotal > 0
      ? Math.round((lbsValorizadas / lbsTotal) * 1000) / 10
      : null
  const costoTotal = flujos.reduce((s, r) => s + (r.costoGtq ?? 0), 0)

  const agroLbs = sumLbs(
    agroResiduos.map((r) => ({ cantidadLbs: r.cantidadLbs })),
  )
  const agroVal = agroResiduos.filter((r) => isRutaValorizada(r.rutaGestion))
  const agroValLbs = sumLbs(agroVal.map((r) => ({ cantidadLbs: r.cantidadLbs })))
  const agroValorizacionPct =
    agroLbs > 0 ? Math.round((agroValLbs / agroLbs) * 1000) / 10 : null

  const byRutaMap = new Map<string, { value: number; valorizado: boolean }>()
  for (const f of flujos) {
    const cur = byRutaMap.get(f.ruta) ?? {
      value: 0,
      valorizado: isRutaValorizada(f.ruta),
    }
    cur.value += f.cantidadLbs ?? 0
    byRutaMap.set(f.ruta || 'Sin ruta', cur)
  }

  const bySedeMap = new Map<string, { lbs: number; valorizadas: number }>()
  for (const f of flujos) {
    const cur = bySedeMap.get(f.sede) ?? { lbs: 0, valorizadas: 0 }
    const qty = f.cantidadLbs ?? 0
    cur.lbs += qty
    if (f.valorizado || isRutaValorizada(f.ruta)) cur.valorizadas += qty
    bySedeMap.set(f.sede || 'Sin sede', cur)
  }

  const byClasMap = new Map<string, number>()
  for (const f of flujos) {
    byClasMap.set(
      f.clasificacion || 'Otro',
      (byClasMap.get(f.clasificacion || 'Otro') ?? 0) + (f.cantidadLbs ?? 0),
    )
  }

  const insights: CircularidadReport['insights'] = []
  if (tasaValorizacionPct != null && tasaValorizacionPct < 50) {
    insights.push({
      id: 'baja',
      level: 'Crítico',
      title: `Tasa de valorización ${formatNum(tasaValorizacionPct, 1)}%`,
      text: 'Menos de la mitad de las libras registradas se aprovechan. Revisar disposición final.',
    })
  } else if (tasaValorizacionPct != null && tasaValorizacionPct >= 70) {
    insights.push({
      id: 'ok',
      level: 'Positivo',
      title: `Valorización ${formatNum(tasaValorizacionPct, 1)}%`,
      text: 'El portafolio de flujos opera con buena circularidad.',
    })
  }
  if (agroValorizacionPct != null) {
    insights.push({
      id: 'agro',
      level: agroValorizacionPct < 60 ? 'Atención' : 'Positivo',
      title: `Agro gestión residuos: ${formatNum(agroValorizacionPct, 1)}% valorizado`,
      text: `${formatNum(agroLbs, 0)} lbs en registros operativos Agro (referencia cruzada).`,
    })
  }
  if (flujos.length === 0) {
    insights.push({
      id: 'vacio',
      level: 'Atención',
      title: 'Sin flujos de circularidad',
      text: 'Registre manifiestos y gestores para trazar generador → disposición/valorización.',
    })
  }

  return {
    meta: {
      totalFlujos: flujos.length,
      lbsTotal,
      lbsValorizadas,
      tasaValorizacionPct,
      costoTotal,
      agroLbs,
      agroValorizacionPct,
    },
    kpis: [
      {
        id: 'tasa',
        label: 'Tasa valorización',
        value:
          tasaValorizacionPct == null
            ? '—'
            : `${formatNum(tasaValorizacionPct, 1)}%`,
        hint: `${formatNum(lbsValorizadas, 0)} / ${formatNum(lbsTotal, 0)} lbs`,
        tone:
          tasaValorizacionPct != null && tasaValorizacionPct < 50
            ? 'warn'
            : 'ok',
      },
      {
        id: 'flujos',
        label: 'Flujos / manifiestos',
        value: formatNum(flujos.length),
        hint: 'Registros de trazabilidad',
        tone: 'dark',
      },
      {
        id: 'costo',
        label: 'Costo gestión',
        value: formatNum(costoTotal, 0),
        hint: 'GTQ',
        tone: 'default',
      },
      {
        id: 'agro',
        label: 'Valorización Agro',
        value:
          agroValorizacionPct == null
            ? '—'
            : `${formatNum(agroValorizacionPct, 1)}%`,
        hint: 'Desde gestión de residuos',
        tone: 'default',
      },
    ],
    byRuta: [...byRutaMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.value - a.value),
    bySede: [...bySedeMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.lbs - a.lbs),
    byClasificacion: [...byClasMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    insights,
    detailRows: [...flujos].sort((a, b) =>
      (b.fecha ?? '').localeCompare(a.fecha ?? ''),
    ),
  }
}
