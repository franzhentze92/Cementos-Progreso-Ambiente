/**
 * Puente entre nombres operativos (Agro / Alicón / CAPA / cumplimiento)
 * y el inventario georreferenciado SITES + puntos operativos extra.
 */

import { SITES, type SiteLocation } from './locations'

export type SiteRiskLevel = 'critico' | 'atencion' | 'ok' | 'sin-dato'

export type OperationalSite = {
  id: string
  name: string
  lat: number
  lng: number
  /** id de SITES si aplica */
  mapSiteId: string | null
  country: string
  region: string
}

/** Puntos Agro / Alicón no listados como plantas cementeras públicas. */
export const OPERATIONAL_EXTRA: OperationalSite[] = [
  {
    id: 'ops-agro-san-miguel',
    name: 'Agro San Miguel',
    lat: 14.82,
    lng: -90.29,
    mapSiteId: 'gt-san-miguel',
    country: 'Guatemala',
    region: 'Sanarate, El Progreso',
  },
  {
    id: 'ops-el-pilar',
    name: 'Finca El Pilar',
    lat: 14.78,
    lng: -90.35,
    mapSiteId: null,
    country: 'Guatemala',
    region: 'Agroprogreso',
  },
  {
    id: 'ops-la-marina',
    name: 'Finca La Marina',
    lat: 14.76,
    lng: -90.42,
    mapSiteId: null,
    country: 'Guatemala',
    region: 'Agroprogreso',
  },
  {
    id: 'ops-saquipec',
    name: 'Saquipec',
    lat: 14.7,
    lng: -90.55,
    mapSiteId: null,
    country: 'Guatemala',
    region: 'Agroprogreso',
  },
  {
    id: 'ops-helios',
    name: 'Aprovechamiento forestal Helios',
    lat: 14.85,
    lng: -90.2,
    mapSiteId: null,
    country: 'Guatemala',
    region: 'Agroprogreso',
  },
  {
    id: 'ops-alicon',
    name: 'Planta Alicón',
    lat: 14.64,
    lng: -90.51,
    mapSiteId: null,
    country: 'Guatemala',
    region: 'Planta Alicón',
  },
  {
    id: 'ops-corporativo',
    name: 'Corporativo',
    lat: 14.6349,
    lng: -90.5069,
    mapSiteId: 'gt-oficinas',
    country: 'Guatemala',
    region: 'Ciudad de Guatemala',
  },
]

const ALIAS_TO_OPS: Array<{ pattern: RegExp; opsId: string }> = [
  { pattern: /san\s*miguel|agro\s*san/i, opsId: 'ops-agro-san-miguel' },
  { pattern: /el\s*pilar/i, opsId: 'ops-el-pilar' },
  { pattern: /la\s*marina/i, opsId: 'ops-la-marina' },
  { pattern: /saquipec/i, opsId: 'ops-saquipec' },
  { pattern: /helios/i, opsId: 'ops-helios' },
  { pattern: /alic[oó]n/i, opsId: 'ops-alicon' },
  { pattern: /corporativ|oficina/i, opsId: 'ops-corporativo' },
]

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

export function resolveOperationalSite(label: string): OperationalSite | null {
  if (!label.trim()) return null
  const hit = ALIAS_TO_OPS.find((a) => a.pattern.test(label))
  if (hit) {
    return OPERATIONAL_EXTRA.find((o) => o.id === hit.opsId) ?? null
  }
  const exact = OPERATIONAL_EXTRA.find(
    (o) => normalize(o.name) === normalize(label),
  )
  if (exact) return exact

  const site = SITES.find(
    (s) =>
      normalize(s.name) === normalize(label) ||
      normalize(s.name).includes(normalize(label)) ||
      normalize(label).includes(normalize(s.name)),
  )
  if (!site) return null
  return {
    id: `map-${site.id}`,
    name: site.name,
    lat: site.lat,
    lng: site.lng,
    mapSiteId: site.id,
    country: site.country,
    region: site.region,
  }
}

export type SiteRiskSignals = {
  obligacionesCriticas: number
  obligacionesAtencion: number
  capaVencidas: number
  capaAbiertas: number
  excedenciasMonitoreo: number
  incidentesAbiertos: number
  metasEnRiesgo: number
}

export type SiteRiskCard = OperationalSite & {
  level: SiteRiskLevel
  score: number
  signals: SiteRiskSignals
  headlines: string[]
}

const EMPTY_SIGNALS = (): SiteRiskSignals => ({
  obligacionesCriticas: 0,
  obligacionesAtencion: 0,
  capaVencidas: 0,
  capaAbiertas: 0,
  excedenciasMonitoreo: 0,
  incidentesAbiertos: 0,
  metasEnRiesgo: 0,
})

function bump(
  map: Map<string, { site: OperationalSite; signals: SiteRiskSignals }>,
  label: string,
  patch: Partial<SiteRiskSignals>,
) {
  const site = resolveOperationalSite(label)
  if (!site) return
  const cur = map.get(site.id) ?? { site, signals: EMPTY_SIGNALS() }
  for (const [k, v] of Object.entries(patch) as Array<
    [keyof SiteRiskSignals, number]
  >) {
    if (v) cur.signals[k] += v
  }
  map.set(site.id, cur)
}

function scoreSignals(s: SiteRiskSignals): { score: number; level: SiteRiskLevel } {
  const score =
    s.obligacionesCriticas * 40 +
    s.capaVencidas * 35 +
    s.excedenciasMonitoreo * 30 +
    s.incidentesAbiertos * 25 +
    s.metasEnRiesgo * 20 +
    s.obligacionesAtencion * 12 +
    s.capaAbiertas * 8
  if (score >= 40) return { score, level: 'critico' }
  if (score >= 12) return { score, level: 'atencion' }
  if (
    s.obligacionesCriticas +
      s.obligacionesAtencion +
      s.capaVencidas +
      s.capaAbiertas +
      s.excedenciasMonitoreo +
      s.incidentesAbiertos +
      s.metasEnRiesgo ===
    0
  ) {
    return { score: 0, level: 'sin-dato' }
  }
  return { score, level: 'ok' }
}

export type SiteRiskInput = {
  obligaciones: Array<{ sitio: string; risk: string }>
  capas: Array<{ sitio: string; risk: string; estado: string }>
  excedencias: Array<{ sede: string }>
  incidentes: Array<{ plantaSede: string; estado: string }>
  metas: Array<{ sitio: string; risk: string }>
}

export function buildSiteRiskCards(input: SiteRiskInput): SiteRiskCard[] {
  const map = new Map<string, { site: OperationalSite; signals: SiteRiskSignals }>()

  for (const o of OPERATIONAL_EXTRA) {
    map.set(o.id, { site: o, signals: EMPTY_SIGNALS() })
  }

  for (const r of input.obligaciones) {
    if (r.risk === 'vencido' || r.risk === 'critico') {
      bump(map, r.sitio, { obligacionesCriticas: 1 })
    } else if (r.risk === 'atencion') {
      bump(map, r.sitio, { obligacionesAtencion: 1 })
    }
  }

  for (const r of input.capas) {
    if (/cerrad|cancelad/i.test(r.estado)) continue
    if (r.risk === 'vencida' || r.risk === 'critica') {
      bump(map, r.sitio, { capaVencidas: 1 })
    } else {
      bump(map, r.sitio, { capaAbiertas: 1 })
    }
  }

  for (const e of input.excedencias) {
    bump(map, e.sede, { excedenciasMonitoreo: 1 })
  }

  for (const i of input.incidentes) {
    if (/abiert/i.test(i.estado)) {
      bump(map, i.plantaSede, { incidentesAbiertos: 1 })
    }
  }

  for (const m of input.metas) {
    if (m.risk === 'critico' || m.risk === 'atencion') {
      bump(map, m.sitio, { metasEnRiesgo: 1 })
    }
  }

  return [...map.values()]
    .map(({ site, signals }) => {
      const { score, level } = scoreSignals(signals)
      const headlines: string[] = []
      if (signals.obligacionesCriticas)
        headlines.push(`${signals.obligacionesCriticas} obligación(es) crítica(s)`)
      if (signals.capaVencidas)
        headlines.push(`${signals.capaVencidas} CAPA vencida(s)`)
      if (signals.excedenciasMonitoreo)
        headlines.push(`${signals.excedenciasMonitoreo} excedencia(s) monitoreo`)
      if (signals.incidentesAbiertos)
        headlines.push(`${signals.incidentesAbiertos} incidente(s) abierto(s)`)
      if (signals.metasEnRiesgo)
        headlines.push(`${signals.metasEnRiesgo} meta(s) en riesgo`)
      if (signals.capaAbiertas && !signals.capaVencidas)
        headlines.push(`${signals.capaAbiertas} CAPA abierta(s)`)
      if (!headlines.length && level === 'ok') headlines.push('Sin alertas activas')
      if (level === 'sin-dato') headlines.push('Sin señales operativas aún')
      return { ...site, level, score, signals, headlines }
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

export const RISK_COLORS: Record<SiteRiskLevel, string> = {
  critico: '#b91c1c',
  atencion: '#c45c26',
  ok: '#047935',
  'sin-dato': '#64748b',
}

export const RISK_LABELS: Record<SiteRiskLevel, string> = {
  critico: 'Crítico',
  atencion: 'Atención',
  ok: 'OK',
  'sin-dato': 'Sin dato',
}

/** Une un SiteLocation del inventario con riesgo operativo si hay match. */
export function riskForMapSite(
  site: SiteLocation,
  cards: SiteRiskCard[],
): SiteRiskCard | null {
  return (
    cards.find((c) => c.mapSiteId === site.id) ||
    cards.find((c) => normalize(c.name) === normalize(site.name)) ||
    null
  )
}
