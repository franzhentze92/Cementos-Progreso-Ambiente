/**
 * Analytics Licencias ambientales · C. Admin Licencias · Agroprogreso.
 */
import {
  AGRO_LICENCIA_ESTADOS,
  daysUntil,
  formatNum,
  type AgroLicenciaRecord,
} from './agroLicencias'

export { formatNum }

export type LicMapSite = {
  id: string
  sede: string
  lat: number
  lng: number
  total: number
  vigente: number
  enProceso: number
  desistido: number
}

export type LicGanttBar = {
  id: string
  licencia: string
  sede: string
  estado: string
  inicio: string
  fin: string
  leftPct: number
  widthPct: number
  daysLeft: number | null
}

export type AgroLicenciasReport = {
  meta: {
    totalRows: number
    vigentes: number
    enProceso: number
    desistidos: number
    conVigencia: number
    sedes: number
  }
  kpis: { id: string; label: string; value: string; hint: string }[]
  insights: {
    id: string
    level: 'Crítico' | 'Atención' | 'Positivo'
    title: string
    text: string
  }[]
  byEstado: { name: string; value: number }[]
  byCategoria: { name: string; value: number }[]
  bySede: { sede: string; total: number; vigente: number; enProceso: number; desistido: number }[]
  mapSites: LicMapSite[]
  gantt: LicGanttBar[]
  ganttRange: { min: string; max: string } | null
  proximoVencer: {
    licencia: string
    sede: string
    fin: string
    daysLeft: number
  }[]
  detailRows: {
    id: string
    sede: string
    licencia: string
    expediente: string
    categoria: string
    vigencia: string
    estado: string
    daysLeft: number | null
  }[]
}

const HORIZON_ALERT_DAYS = 365

function toMs(iso: string): number {
  return new Date(`${iso}T12:00:00`).getTime()
}

export function buildAgroLicenciasReport(
  records: AgroLicenciaRecord[],
): AgroLicenciasReport {
  const vigentes = records.filter((r) => r.estado === 'VIGENTE').length
  const enProceso = records.filter((r) => r.estado === 'EN PROCESO').length
  const desistidos = records.filter((r) => r.estado === 'DESISTIDO').length
  const conVigencia = records.filter((r) => r.vigenciaInicio && r.vigenciaFin)
    .length
  const sedes = new Set(records.map((r) => r.plantaSede)).size

  const byEstadoMap = new Map<string, number>()
  for (const e of AGRO_LICENCIA_ESTADOS) byEstadoMap.set(e, 0)
  for (const r of records) {
    const key = r.estado || 'Sin estado'
    byEstadoMap.set(key, (byEstadoMap.get(key) ?? 0) + 1)
  }
  const byEstado = [...byEstadoMap.entries()]
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  const byCategoriaMap = new Map<string, number>()
  for (const r of records) {
    const key = r.categoria.trim() || 'Sin categoría'
    byCategoriaMap.set(key, (byCategoriaMap.get(key) ?? 0) + 1)
  }
  const byCategoria = [...byCategoriaMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))

  const sedeAgg = new Map<
    string,
    {
      total: number
      vigente: number
      enProceso: number
      desistido: number
      lat: number | null
      lng: number | null
    }
  >()
  for (const r of records) {
    const cur = sedeAgg.get(r.plantaSede) ?? {
      total: 0,
      vigente: 0,
      enProceso: 0,
      desistido: 0,
      lat: r.latitud,
      lng: r.longitud,
    }
    cur.total += 1
    if (r.estado === 'VIGENTE') cur.vigente += 1
    else if (r.estado === 'EN PROCESO') cur.enProceso += 1
    else if (r.estado === 'DESISTIDO') cur.desistido += 1
    if (cur.lat == null && r.latitud != null) {
      cur.lat = r.latitud
      cur.lng = r.longitud
    }
    sedeAgg.set(r.plantaSede, cur)
  }
  const bySede = [...sedeAgg.entries()]
    .map(([sede, v]) => ({
      sede,
      total: v.total,
      vigente: v.vigente,
      enProceso: v.enProceso,
      desistido: v.desistido,
    }))
    .sort((a, b) => b.total - a.total || a.sede.localeCompare(b.sede))

  const mapSites: LicMapSite[] = [...sedeAgg.entries()]
    .filter(([, v]) => v.lat != null && v.lng != null)
    .map(([sede, v]) => ({
      id: sede,
      sede,
      lat: v.lat as number,
      lng: v.lng as number,
      total: v.total,
      vigente: v.vigente,
      enProceso: v.enProceso,
      desistido: v.desistido,
    }))

  const dated = records.filter((r) => r.vigenciaInicio && r.vigenciaFin)
  let ganttRange: AgroLicenciasReport['ganttRange'] = null
  let gantt: LicGanttBar[] = []
  if (dated.length) {
    const minMs = Math.min(...dated.map((r) => toMs(r.vigenciaInicio!)))
    const maxMs = Math.max(...dated.map((r) => toMs(r.vigenciaFin!)))
    const span = Math.max(maxMs - minMs, 1)
    ganttRange = {
      min: dated.reduce((a, r) =>
        toMs(r.vigenciaInicio!) < toMs(a) ? r.vigenciaInicio! : a,
        dated[0].vigenciaInicio!,
      ),
      max: dated.reduce((a, r) =>
        toMs(r.vigenciaFin!) > toMs(a) ? r.vigenciaFin! : a,
        dated[0].vigenciaFin!,
      ),
    }
    gantt = dated
      .map((r) => {
        const start = toMs(r.vigenciaInicio!)
        const end = toMs(r.vigenciaFin!)
        const leftPct = ((start - minMs) / span) * 100
        const widthPct = Math.max(((end - start) / span) * 100, 1.2)
        return {
          id: r.id,
          licencia: r.licencia,
          sede: r.plantaSede,
          estado: r.estado,
          inicio: r.vigenciaInicio!,
          fin: r.vigenciaFin!,
          leftPct,
          widthPct,
          daysLeft: daysUntil(r.vigenciaFin),
        }
      })
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
  }

  const proximoVencer = records
    .filter((r) => r.estado === 'VIGENTE' && r.vigenciaFin)
    .map((r) => ({
      licencia: r.licencia,
      sede: r.plantaSede,
      fin: r.vigenciaFin!,
      daysLeft: daysUntil(r.vigenciaFin) ?? 0,
    }))
    .filter((r) => r.daysLeft >= 0 && r.daysLeft <= HORIZON_ALERT_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  const detailRows = records
    .slice()
    .sort(
      (a, b) =>
        a.plantaSede.localeCompare(b.plantaSede) ||
        a.licencia.localeCompare(b.licencia),
    )
    .map((r) => ({
      id: r.id,
      sede: r.plantaSede,
      licencia: r.licencia,
      expediente: r.expediente || '—',
      categoria: r.categoria || '—',
      vigencia: r.vigencia || 'NO APLICA',
      estado: r.estado,
      daysLeft: daysUntil(r.vigenciaFin),
    }))

  const vigPct =
    records.length === 0 ? null : (vigentes / records.length) * 100

  const kpis: AgroLicenciasReport['kpis'] = [
    {
      id: 'total',
      label: 'Licencias',
      value: formatNum(records.length),
      hint: `${formatNum(sedes)} sede(s)`,
    },
    {
      id: 'vigente',
      label: 'Vigentes',
      value: formatNum(vigentes),
      hint:
        vigPct == null ? '—' : `${formatNum(vigPct, 0)}% del catálogo`,
    },
    {
      id: 'proceso',
      label: 'En proceso',
      value: formatNum(enProceso),
      hint: 'Trámites abiertos',
    },
    {
      id: 'vence',
      label: 'Vencen ≤ 12 meses',
      value: formatNum(proximoVencer.length),
      hint: 'Solo vigentes con fecha fin',
    },
  ]

  const insights: AgroLicenciasReport['insights'] = []
  if (!records.length) {
    insights.push({
      id: 'empty',
      level: 'Atención',
      title: 'Sin licencias',
      text: 'Capture el catálogo en Entrada de Datos.',
    })
  } else {
    if (enProceso > 0) {
      insights.push({
        id: 'proceso',
        level: 'Atención',
        title: 'Trámites en curso',
        text: `${formatNum(enProceso)} licencia(s) en estado EN PROCESO.`,
      })
    }
    if (proximoVencer.length > 0) {
      const first = proximoVencer[0]
      insights.push({
        id: 'vence',
        level: first.daysLeft <= 90 ? 'Crítico' : 'Atención',
        title: 'Vencimientos próximos',
        text: `${first.licencia} (${first.sede}) vence en ${formatNum(first.daysLeft)} día(s).`,
      })
    }
    if (vigentes > 0 && enProceso === 0 && proximoVencer.length === 0) {
      insights.push({
        id: 'ok',
        level: 'Positivo',
        title: 'Catálogo estable',
        text: `${formatNum(vigentes)} licencia(s) vigente(s) sin vencimientos en 12 meses.`,
      })
    }
  }

  return {
    meta: {
      totalRows: records.length,
      vigentes,
      enProceso,
      desistidos,
      conVigencia,
      sedes,
    },
    kpis,
    insights,
    byEstado,
    byCategoria,
    bySede,
    mapSites,
    gantt,
    ganttRange,
    proximoVencer,
    detailRows,
  }
}
