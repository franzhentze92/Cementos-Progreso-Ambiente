/**
 * Analytics Gestión de trámites · C. Admin corporativo · Agroprogreso.
 */
import {
  AGRO_TRAMITES_ESTADOS,
  AGRO_TRAMITES_PRIORIDADES,
  formatNum,
  yearFromFecha,
  type AgroTramiteRecord,
} from './agroGestionTramites'

export { formatNum }

export type TramiteMapSite = {
  id: string
  sede: string
  lat: number
  lng: number
  total: number
  enProceso: number
  cerrado: number
  alta: number
}

export type AgroGestionTramitesReport = {
  meta: {
    years: number[]
    selectedYear: number | 'all'
    periodLabel: string
    totalRows: number
    enProceso: number
    cerrado: number
    porSolicitar: number
    alta: number
  }
  kpis: { id: string; label: string; value: string; hint: string }[]
  insights: {
    id: string
    level: 'Crítico' | 'Atención' | 'Positivo'
    title: string
    text: string
  }[]
  byEstado: { name: string; value: number }[]
  byPrioridad: { name: string; value: number }[]
  bySede: {
    sede: string
    total: number
    enProceso: number
    cerrado: number
    alta: number
  }[]
  byAsignado: { name: string; total: number; enProceso: number }[]
  byProyecto: { name: string; value: number }[]
  mapSites: TramiteMapSite[]
  detailRows: {
    id: string
    fecha: string
    sede: string
    proyecto: string
    estado: string
    asignado: string
    prioridad: string
    observaciones: string
  }[]
}

export function buildAgroGestionTramitesReport(
  records: AgroTramiteRecord[],
  selectedYear: number | 'all' = 'all',
): AgroGestionTramitesReport {
  const years = [
    ...new Set(records.map((r) => yearFromFecha(r.fechaSolicitud))),
  ].sort((a, b) => b - a)

  const scoped =
    selectedYear === 'all'
      ? records
      : records.filter(
          (r) => yearFromFecha(r.fechaSolicitud) === selectedYear,
        )

  const enProceso = scoped.filter((r) => r.estado === 'En proceso').length
  const cerrado = scoped.filter((r) => r.estado === 'Cerrado').length
  const porSolicitar = scoped.filter((r) => r.estado === 'Por solicitar')
    .length
  const alta = scoped.filter((r) => r.prioridad === 'Alta').length

  const byEstadoMap = new Map<string, number>()
  for (const e of AGRO_TRAMITES_ESTADOS) byEstadoMap.set(e, 0)
  for (const r of scoped) {
    byEstadoMap.set(r.estado || 'Sin estado', (byEstadoMap.get(r.estado) ?? 0) + 1)
  }
  const byEstado = [...byEstadoMap.entries()]
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  const byPrioridadMap = new Map<string, number>()
  for (const p of AGRO_TRAMITES_PRIORIDADES) byPrioridadMap.set(p, 0)
  for (const r of scoped) {
    byPrioridadMap.set(
      r.prioridad || 'Sin prioridad',
      (byPrioridadMap.get(r.prioridad) ?? 0) + 1,
    )
  }
  const byPrioridad = [...byPrioridadMap.entries()]
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  const sedeMap = new Map<
    string,
    {
      total: number
      enProceso: number
      cerrado: number
      alta: number
      lat: number | null
      lng: number | null
    }
  >()
  for (const r of scoped) {
    const cur = sedeMap.get(r.plantaSede) ?? {
      total: 0,
      enProceso: 0,
      cerrado: 0,
      alta: 0,
      lat: r.latitud,
      lng: r.longitud,
    }
    cur.total += 1
    if (r.estado === 'En proceso') cur.enProceso += 1
    if (r.estado === 'Cerrado') cur.cerrado += 1
    if (r.prioridad === 'Alta') cur.alta += 1
    if (cur.lat == null && r.latitud != null) {
      cur.lat = r.latitud
      cur.lng = r.longitud
    }
    sedeMap.set(r.plantaSede, cur)
  }
  const bySede = [...sedeMap.entries()]
    .map(([sede, v]) => ({
      sede,
      total: v.total,
      enProceso: v.enProceso,
      cerrado: v.cerrado,
      alta: v.alta,
    }))
    .sort((a, b) => b.total - a.total || a.sede.localeCompare(b.sede))

  const mapSites: TramiteMapSite[] = [...sedeMap.entries()]
    .filter(([, v]) => v.lat != null && v.lng != null)
    .map(([sede, v]) => ({
      id: sede,
      sede,
      lat: v.lat as number,
      lng: v.lng as number,
      total: v.total,
      enProceso: v.enProceso,
      cerrado: v.cerrado,
      alta: v.alta,
    }))

  const asigMap = new Map<string, { total: number; enProceso: number }>()
  for (const r of scoped) {
    const name = r.asignadoA || 'Sin asignar'
    const cur = asigMap.get(name) ?? { total: 0, enProceso: 0 }
    cur.total += 1
    if (r.estado === 'En proceso') cur.enProceso += 1
    asigMap.set(name, cur)
  }
  const byAsignado = [...asigMap.entries()]
    .map(([name, v]) => ({ name, total: v.total, enProceso: v.enProceso }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))

  const proyMap = new Map<string, number>()
  for (const r of scoped) {
    const name = r.nombreProyecto || 'Sin proyecto'
    proyMap.set(name, (proyMap.get(name) ?? 0) + 1)
  }
  const byProyecto = [...proyMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))

  const detailRows = scoped
    .slice()
    .sort(
      (a, b) =>
        b.fechaSolicitud.localeCompare(a.fechaSolicitud) ||
        a.plantaSede.localeCompare(b.plantaSede),
    )
    .map((r) => ({
      id: r.id,
      fecha: r.fechaSolicitud,
      sede: r.plantaSede,
      proyecto: r.nombreProyecto,
      estado: r.estado,
      asignado: r.asignadoA,
      prioridad: r.prioridad,
      observaciones: r.observaciones,
    }))

  const periodLabel =
    selectedYear === 'all' ? 'Todos los años' : String(selectedYear)
  const openRate =
    scoped.length === 0 ? null : (enProceso / scoped.length) * 100

  const kpis = [
    {
      id: 'total',
      label: 'Trámites',
      value: formatNum(scoped.length),
      hint: `${formatNum(bySede.length)} sede(s)`,
    },
    {
      id: 'proceso',
      label: 'En proceso',
      value: formatNum(enProceso),
      hint:
        openRate == null ? '—' : `${formatNum(openRate, 0)}% del catálogo`,
    },
    {
      id: 'cerrado',
      label: 'Cerrados',
      value: formatNum(cerrado),
      hint: `${formatNum(porSolicitar)} por solicitar`,
    },
    {
      id: 'alta',
      label: 'Prioridad alta',
      value: formatNum(alta),
      hint: 'Requieren seguimiento cercano',
    },
  ]

  const insights: AgroGestionTramitesReport['insights'] = []
  if (!scoped.length) {
    insights.push({
      id: 'empty',
      level: 'Atención',
      title: 'Sin trámites',
      text: 'Capture el catálogo en Entrada de Datos.',
    })
  } else {
    if (alta > 0) {
      insights.push({
        id: 'alta',
        level: 'Crítico',
        title: 'Prioridad alta abierta',
        text: `${formatNum(alta)} trámite(s) marcados como Alta.`,
      })
    }
    if (enProceso > 0) {
      insights.push({
        id: 'proceso',
        level: 'Atención',
        title: 'Trámites en curso',
        text: `${formatNum(enProceso)} en proceso (licencias, ETAR, instrumentos…).`,
      })
    }
    if (cerrado > 0 && enProceso === 0) {
      insights.push({
        id: 'ok',
        level: 'Positivo',
        title: 'Cola limpia',
        text: 'No hay trámites en proceso en el periodo.',
      })
    }
    const busiest = byAsignado[0]
    if (busiest && busiest.enProceso > 0) {
      insights.push({
        id: 'asignado',
        level: 'Atención',
        title: 'Mayor carga',
        text: `${busiest.name}: ${formatNum(busiest.enProceso)} en proceso.`,
      })
    }
  }

  return {
    meta: {
      years,
      selectedYear,
      periodLabel,
      totalRows: scoped.length,
      enProceso,
      cerrado,
      porSolicitar,
      alta,
    },
    kpis,
    insights,
    byEstado,
    byPrioridad,
    bySede,
    byAsignado,
    byProyecto,
    mapSites,
    detailRows,
  }
}
