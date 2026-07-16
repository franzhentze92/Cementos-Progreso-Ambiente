/**
 * Resumen ejecutivo del Dashboard — solo agregados derivados de reportes reales.
 */

import { SITES } from './locations'
import type { CarbonReport } from './carbonReport'
import type { AgroAguaReport } from './agroConsumoAguaReport'
import type { AgroResiduosReport } from './agroResiduosReport'
import type { AgroCompostajeReport } from './agroCompostajeReport'
import type { AgroIncidentesReport } from './agroIncidentesReport'
import type { AgroInspeccionReport } from './agroInspeccionesReport'
import type { AgroMonitoreosReport } from './agroMonitoreosReport'
import type { AgroNdaGeneralReport } from './agroNdaGeneralReport'
import type { AgroLicenciasReport } from './agroLicenciasReport'

export type DashInsightLevel = 'Crítico' | 'Atención' | 'Positivo'

export type DashKpi = {
  id: string
  label: string
  value: string
  unit: string
  hint: string
  tone: 'default' | 'lime' | 'dark' | 'warn'
  href?: string
}

export type DashInsight = {
  id: string
  level: DashInsightLevel
  title: string
  text: string
  source: string
  href?: string
}

export type DashboardSummary = {
  generatedAt: string
  periodHints: string[]
  kpis: DashKpi[]
  alicon: {
    periodLabel: string
    year: string
    monthlyProduction: CarbonReport['monthlyProduction']
    monthlyElectricity: CarbonReport['monthlyElectricity']
    monthlyWater: CarbonReport['monthlyWater']
    cementMix: CarbonReport['cementMix']
    wasteDisposition: CarbonReport['wasteDisposition']
    totals: CarbonReport['totals']
  } | null
  agro: {
    agua: {
      periodLabel: string
      totalM3: number
      monthlyTotal: AgroAguaReport['monthlyTotal']
      sedeShare: AgroAguaReport['sedeShare']
    } | null
    residuos: {
      periodLabel: string
      totalLbs: number
      monthlyTonsLike: AgroResiduosReport['monthlyTonsLike']
      rutaShare: AgroResiduosReport['rutaShare']
    } | null
    compostaje: {
      periodLabel: string
      total: number
      monthly: AgroCompostajeReport['monthly']
      byFinca: AgroCompostajeReport['byFinca']
    } | null
  }
  compliance: {
    incidentes: {
      total: number
      abiertos: number
      cerrados: number
      byUnidad: Array<{
        name: string
        total: number
        abiertos: number
        cerrados: number
      }>
    }
    inspecciones: {
      total: number
      avgScore: number | null
      hallazgos: number
    }
    monitoreosCumplePct: number | null
    ndaAvg: number | null
    licencias: {
      total: number
      vigentes: number
      enProceso: number
      byEstado: AgroLicenciasReport['byEstado']
      proximoVencer: number
    }
  }
  sites: {
    operative: number
    plantCount: number
    countriesCount: number
    byCountry: Array<{ country: string; sites: number }>
  }
  insights: DashInsight[]
  modulesLoaded: number
  modulesFailed: string[]
}

function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('es-GT', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

function pickLatestYear(years: number[]): number | 'all' {
  if (!years.length) return 'all'
  return years[0]
}

export function preferredYear(years: number[]): number | 'all' {
  return pickLatestYear(years)
}

export function buildSitesSnapshot() {
  const operative = SITES.filter((s) => s.status === 'Operativa')
  const plantCount = operative.filter(
    (s) =>
      s.type === 'Planta de cemento' || s.type === 'Planta de concreto',
  ).length
  const byCountryMap = new Map<string, number>()
  for (const s of operative) {
    const label =
      s.country === 'República Dominicana' ? 'Rep. Dom.' : s.country
    byCountryMap.set(label, (byCountryMap.get(label) ?? 0) + 1)
  }
  const byCountry = [...byCountryMap.entries()]
    .map(([country, sites]) => ({ country, sites }))
    .sort((a, b) => b.sites - a.sites)

  return {
    operative: operative.length,
    plantCount,
    countriesCount: byCountry.length,
    byCountry,
  }
}

type BuildInput = {
  carbon: CarbonReport | null
  agua: AgroAguaReport | null
  residuos: AgroResiduosReport | null
  compostaje: AgroCompostajeReport | null
  incidentesAgro: AgroIncidentesReport | null
  incidentesAlicon: AgroIncidentesReport | null
  inspeccionesAgro: AgroInspeccionReport | null
  inspeccionesAlicon: AgroInspeccionReport | null
  monitoreos: AgroMonitoreosReport | null
  nda: AgroNdaGeneralReport | null
  licencias: AgroLicenciasReport | null
  failed: string[]
}

export function buildDashboardSummary(input: BuildInput): DashboardSummary {
  const sites = buildSitesSnapshot()
  const periodHints: string[] = []
  const insights: DashInsight[] = []

  const alicon = input.carbon
    ? {
        periodLabel: input.carbon.meta.periodLabel,
        year: input.carbon.meta.year,
        monthlyProduction: input.carbon.monthlyProduction,
        monthlyElectricity: input.carbon.monthlyElectricity,
        monthlyWater: input.carbon.monthlyWater,
        cementMix: input.carbon.cementMix,
        wasteDisposition: input.carbon.wasteDisposition,
        totals: input.carbon.totals,
      }
    : null

  if (input.carbon) {
    periodHints.push(`Alicon ${input.carbon.meta.periodLabel}`)
    for (const ins of input.carbon.insights.slice(0, 2)) {
      insights.push({
        ...ins,
        source: 'Alicon',
        href: '/operaciones/planta-alicon/huella-de-carbono',
      })
    }
  }

  const agro = {
    agua: input.agua
      ? {
          periodLabel: input.agua.meta.periodLabel,
          totalM3: input.agua.totals.totalM3,
          monthlyTotal: input.agua.monthlyTotal,
          sedeShare: input.agua.sedeShare,
        }
      : null,
    residuos: input.residuos
      ? {
          periodLabel: input.residuos.meta.periodLabel,
          totalLbs: input.residuos.totals.positiveLbs,
          monthlyTonsLike: input.residuos.monthlyTonsLike,
          rutaShare: input.residuos.rutaShare,
        }
      : null,
    compostaje: input.compostaje
      ? {
          periodLabel: input.compostaje.meta.periodLabel,
          total: input.compostaje.totals.total,
          monthly: input.compostaje.monthly,
          byFinca: input.compostaje.byFinca,
        }
      : null,
  }

  if (input.agua) {
    periodHints.push(`Agua Agro ${input.agua.meta.periodLabel}`)
    for (const ins of input.agua.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        source: 'Agro · Agua',
        href: '/operaciones/agroprogreso/consumo-de-agua',
      })
    }
  }
  if (input.residuos) {
    for (const ins of input.residuos.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        source: 'Agro · Residuos',
        href: '/operaciones/agroprogreso/gestion-de-residuos',
      })
    }
  }
  if (input.compostaje) {
    for (const ins of input.compostaje.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        source: 'Agro · Compostaje',
        href: '/operaciones/agroprogreso/compostaje',
      })
    }
  }

  const agroInc = input.incidentesAgro
  const aliInc = input.incidentesAlicon
  const incidentesByUnidad = [
    agroInc
      ? {
          name: 'Agroprogreso',
          total: agroInc.meta.totalRows,
          abiertos: agroInc.meta.abiertos,
          cerrados: agroInc.meta.cerrados,
        }
      : null,
    aliInc
      ? {
          name: 'Alicon',
          total: aliInc.meta.totalRows,
          abiertos: aliInc.meta.abiertos,
          cerrados: aliInc.meta.cerrados,
        }
      : null,
  ].filter(Boolean) as Array<{
    name: string
    total: number
    abiertos: number
    cerrados: number
  }>

  const incidentesAbiertos = incidentesByUnidad.reduce(
    (a, u) => a + u.abiertos,
    0,
  )
  const incidentesCerrados = incidentesByUnidad.reduce(
    (a, u) => a + u.cerrados,
    0,
  )
  const incidentesTotal = incidentesByUnidad.reduce((a, u) => a + u.total, 0)

  if (agroInc) {
    for (const ins of agroInc.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        source: 'Incidentes Agro',
        href: '/operaciones/agroprogreso/incidentes-ambientales',
      })
    }
  }
  if (aliInc) {
    for (const ins of aliInc.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        source: 'Incidentes Alicon',
        href: '/operaciones/planta-alicon/incidentes-ambientales',
      })
    }
  }

  const inspScores: number[] = []
  let inspTotal = 0
  let inspHallazgos = 0
  for (const r of [input.inspeccionesAgro, input.inspeccionesAlicon]) {
    if (!r) continue
    inspTotal += r.meta.totalRows
    inspHallazgos += r.totals.totalHallazgos
    if (r.totals.avgScore != null) inspScores.push(r.totals.avgScore)
  }
  const inspAvg =
    inspScores.length > 0
      ? inspScores.reduce((a, b) => a + b, 0) / inspScores.length
      : null

  if (input.inspeccionesAgro) {
    for (const ins of input.inspeccionesAgro.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        source: 'Inspecciones Agro',
        href: '/operaciones/agroprogreso/inspeccion-ambiental',
      })
    }
  }

  const monitoreosCumplePct = input.monitoreos?.totals.compliancePct ?? null
  if (input.monitoreos) {
    for (const ins of input.monitoreos.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        source: 'Monitoreos Agro',
        href: '/operaciones/agroprogreso/monitoreo-ambiental',
      })
    }
  }

  const ndaAvg = input.nda?.totals.avgNda ?? null
  if (input.nda) {
    for (const ins of input.nda.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        source: 'NDA',
        href: '/operaciones/agroprogreso/nda-general',
      })
    }
  }

  const lic = input.licencias
  if (lic) {
    for (const ins of lic.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        source: 'Licencias',
        href: '/operaciones/agroprogreso/licencias-ambientales',
      })
    }
  }

  const levelRank: Record<DashInsightLevel, number> = {
    Crítico: 0,
    Atención: 1,
    Positivo: 2,
  }
  insights.sort((a, b) => levelRank[a.level] - levelRank[b.level])

  const kpis: DashKpi[] = []

  if (alicon) {
    kpis.push({
      id: 'prod',
      label: 'Producción Alicon',
      value: fmt(alicon.totals.totalCement, 0),
      unit: 'ton',
      hint: alicon.periodLabel,
      tone: 'default',
      href: '/operaciones/planta-alicon/huella-de-carbono',
    })
    kpis.push({
      id: 'clinker',
      label: 'Factor clinker',
      value:
        alicon.totals.avgFactorPlanta != null
          ? fmt(alicon.totals.avgFactorPlanta, 1)
          : '—',
      unit: '%',
      hint: 'Promedio planta',
      tone: 'lime',
      href: '/operaciones/planta-alicon/huella-de-carbono',
    })
  } else {
    kpis.push({
      id: 'prod',
      label: 'Producción Alicon',
      value: '—',
      unit: '',
      hint: 'Sin campaña cargada',
      tone: 'default',
    })
  }

  kpis.push({
    id: 'incidentes',
    label: 'Incidentes abiertos',
    value: fmt(incidentesAbiertos),
    unit: '',
    hint:
      incidentesTotal > 0
        ? `${fmt(incidentesTotal)} registrados · Agro + Alicon`
        : 'Sin registros',
    tone: incidentesAbiertos > 0 ? 'warn' : 'dark',
    href: '/operaciones/agroprogreso/incidentes-ambientales',
  })

  if (monitoreosCumplePct != null) {
    kpis.push({
      id: 'cumple',
      label: 'Cumplimiento monitoreos',
      value: fmt(monitoreosCumplePct, 0),
      unit: '%',
      hint: input.monitoreos?.meta.periodLabel ?? 'Agroprogreso',
      tone: monitoreosCumplePct >= 90 ? 'default' : 'warn',
      href: '/operaciones/agroprogreso/monitoreo-ambiental',
    })
  } else if (agro.agua) {
    kpis.push({
      id: 'agua',
      label: 'Consumo agua Agro',
      value: fmt(agro.agua.totalM3, 0),
      unit: 'm³',
      hint: agro.agua.periodLabel,
      tone: 'default',
      href: '/operaciones/agroprogreso/consumo-de-agua',
    })
  } else {
    kpis.push({
      id: 'sites',
      label: 'Sitios operativos',
      value: fmt(sites.operative),
      unit: '',
      hint: `${sites.countriesCount} países · inventario`,
      tone: 'dark',
      href: '/mapa',
    })
  }

  // Completar a 4–6 KPIs secundarios útiles
  const extraKpis: DashKpi[] = []

  if (alicon && alicon.totals.totalElec > 0) {
    extraKpis.push({
      id: 'elec',
      label: 'Electricidad Alicon',
      value: fmt(alicon.totals.totalElec / 1000, 0),
      unit: 'MWh',
      hint:
        alicon.totals.avgKwhPerTon != null
          ? `${fmt(alicon.totals.avgKwhPerTon, 0)} kWh/t`
          : alicon.periodLabel,
      tone: 'default',
      href: '/operaciones/planta-alicon/huella-de-carbono',
    })
  }

  if (agro.agua && kpis.every((k) => k.id !== 'agua')) {
    extraKpis.push({
      id: 'agua',
      label: 'Consumo agua Agro',
      value: fmt(agro.agua.totalM3, 0),
      unit: 'm³',
      hint: agro.agua.periodLabel,
      tone: 'default',
      href: '/operaciones/agroprogreso/consumo-de-agua',
    })
  }

  if (agro.residuos) {
    extraKpis.push({
      id: 'residuos',
      label: 'Residuos Agro',
      value: fmt(agro.residuos.totalLbs, 0),
      unit: 'lbs',
      hint: agro.residuos.periodLabel,
      tone: 'lime',
      href: '/operaciones/agroprogreso/gestion-de-residuos',
    })
  }

  if (agro.compostaje && agro.compostaje.total > 0) {
    extraKpis.push({
      id: 'compost',
      label: 'Compostaje',
      value: fmt(agro.compostaje.total, 1),
      unit: 't',
      hint: agro.compostaje.periodLabel,
      tone: 'default',
      href: '/operaciones/agroprogreso/compostaje',
    })
  }

  if (ndaAvg != null) {
    extraKpis.push({
      id: 'nda',
      label: 'NDA promedio',
      value: fmt(ndaAvg, 1),
      unit: '',
      hint: input.nda?.meta.periodLabel ?? 'Agroprogreso',
      tone: ndaAvg >= 80 ? 'default' : 'warn',
      href: '/operaciones/agroprogreso/nda-general',
    })
  }

  if (lic) {
    extraKpis.push({
      id: 'lic',
      label: 'Licencias vigentes',
      value: fmt(lic.meta.vigentes),
      unit: '',
      hint: `${fmt(lic.meta.totalRows)} en catálogo`,
      tone: 'dark',
      href: '/operaciones/agroprogreso/licencias-ambientales',
    })
  }

  if (inspAvg != null) {
    extraKpis.push({
      id: 'insp',
      label: 'Nota inspecciones',
      value: fmt(inspAvg, 1),
      unit: '',
      hint: `${fmt(inspTotal)} ejecuciones`,
      tone: inspAvg >= 80 ? 'default' : 'warn',
      href: '/operaciones/agroprogreso/inspeccion-ambiental',
    })
  }

  // Mantener 4 principales + hasta 4 extra en la misma grilla
  const allKpis = [...kpis, ...extraKpis].slice(0, 8)

  const modulesLoaded = [
    input.carbon,
    input.agua,
    input.residuos,
    input.compostaje,
    input.incidentesAgro,
    input.incidentesAlicon,
    input.inspeccionesAgro,
    input.inspeccionesAlicon,
    input.monitoreos,
    input.nda,
    input.licencias,
  ].filter(Boolean).length

  return {
    generatedAt: new Date().toISOString(),
    periodHints,
    kpis: allKpis,
    alicon,
    agro,
    compliance: {
      incidentes: {
        total: incidentesTotal,
        abiertos: incidentesAbiertos,
        cerrados: incidentesCerrados,
        byUnidad: incidentesByUnidad,
      },
      inspecciones: {
        total: inspTotal,
        avgScore: inspAvg,
        hallazgos: inspHallazgos,
      },
      monitoreosCumplePct,
      ndaAvg,
      licencias: {
        total: lic?.meta.totalRows ?? 0,
        vigentes: lic?.meta.vigentes ?? 0,
        enProceso: lic?.meta.enProceso ?? 0,
        byEstado: lic?.byEstado ?? [],
        proximoVencer: lic?.proximoVencer.length ?? 0,
      },
    },
    sites,
    insights: insights.slice(0, 6),
    modulesLoaded,
    modulesFailed: input.failed,
  }
}
