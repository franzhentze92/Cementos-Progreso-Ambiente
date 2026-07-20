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
import type { CumplimientoReport } from './cumplimientoReport'
import type { CapaReport } from './capaReport'
import type { MetasReport } from './metasReport'
import type { UmbralesReport } from './umbralesReport'
import type { IntensidadReport } from './intensidadReport'
import type { CircularidadReport } from './circularidadReport'
import type { ExpedientesReport } from './expedientesReport'
import type { AnalistaKpis, AnalistaSignalLevel } from './analista'

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
  nda: {
    periodLabel: string
    avgNda: number | null
    avgIda: number | null
    avgCasco: number | null
    bySede: AgroNdaGeneralReport['bySede']
  } | null
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
    obligacionesVencidas: number
    obligacionesPorVencer: number
    capaAbiertas: number
    capaVencidas: number
    metasEnRiesgo: number
    umbralesExcedencias: number
    intensidadKgT: number | null
    circularidadPct: number | null
    expedientesVigentes: number
    analistaCriticos: number
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
  cumplimiento: CumplimientoReport | null
  capa: CapaReport | null
  metas: MetasReport | null
  umbrales: UmbralesReport | null
  intensidad: IntensidadReport | null
  circularidad: CircularidadReport | null
  expedientes: ExpedientesReport | null
  analista: {
    kpis: AnalistaKpis
    top: { level: AnalistaSignalLevel; title: string; text: string } | null
  } | null
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
  const nda = input.nda
    ? {
        periodLabel: input.nda.meta.periodLabel,
        avgNda: input.nda.totals.avgNda,
        avgIda: input.nda.totals.avgIda,
        avgCasco: input.nda.totals.avgCasco,
        bySede: input.nda.bySede,
      }
    : null
  if (input.nda) {
    for (const ins of input.nda.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        source: 'NDA',
        href: '/operaciones/nda-general',
      })
    }
  }

  const lic = input.licencias
  if (lic) {
    for (const ins of lic.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        source: 'Licencias',
        href: '/operaciones/licencias-ambientales',
      })
    }
  }

  if (input.cumplimiento) {
    for (const ins of input.cumplimiento.insights.slice(0, 2)) {
      insights.push({
        ...ins,
        id: `cum-${ins.id}`,
        source: 'Cumplimiento',
        href: '/cumplimiento',
      })
    }
  }

  if (input.capa) {
    for (const ins of input.capa.insights.slice(0, 2)) {
      insights.push({
        ...ins,
        id: `capa-${ins.id}`,
        source: 'CAPA',
        href: '/capa',
      })
    }
  }

  if (input.metas) {
    for (const ins of input.metas.insights.slice(0, 2)) {
      insights.push({
        ...ins,
        id: `meta-${ins.id}`,
        source: 'Metas',
        href: '/metas',
      })
    }
  }

  if (input.umbrales) {
    for (const ins of input.umbrales.insights.slice(0, 2)) {
      insights.push({
        ...ins,
        id: `umb-${ins.id}`,
        source: 'Umbrales',
        href: '/umbrales',
      })
    }
  }

  if (input.intensidad) {
    for (const ins of input.intensidad.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        id: `int-${ins.id}`,
        source: 'Intensidad',
        href: '/intensidad',
      })
    }
  }

  if (input.circularidad) {
    for (const ins of input.circularidad.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        id: `cir-${ins.id}`,
        source: 'Circularidad',
        href: '/circularidad',
      })
    }
  }

  if (input.expedientes) {
    for (const ins of input.expedientes.insights.slice(0, 1)) {
      insights.push({
        ...ins,
        id: `exp-${ins.id}`,
        source: 'Expedientes',
        href: '/expedientes',
      })
    }
  }

  if (input.analista?.top) {
    const top = input.analista.top
    const level: DashInsightLevel =
      top.level === 'Crítico' || top.level === 'Atención' || top.level === 'Positivo'
        ? top.level
        : 'Atención'
    insights.push({
      id: 'analista-top',
      level,
      title: top.title,
      text: top.text,
      source: 'Analista',
      href: '/analista',
    })
  }

  const levelRank: Record<DashInsightLevel, number> = {
    Crítico: 0,
    Atención: 1,
    Positivo: 2,
  }
  insights.sort((a, b) => levelRank[a.level] - levelRank[b.level])

  // KPIs de visión general (inicio): lo más importante al frente
  const kpis: DashKpi[] = []

  kpis.push({
    id: 'nda',
    label: 'NDA promedio',
    value: ndaAvg != null ? fmt(ndaAvg, 1) : '—',
    unit: '',
    hint: nda?.periodLabel ?? 'Notas de desempeño',
    tone: ndaAvg == null ? 'default' : ndaAvg >= 80 ? 'default' : 'warn',
    href: '/operaciones/nda-general',
  })

  kpis.push({
    id: 'cumple',
    label: 'Cumplimiento / control',
    value: monitoreosCumplePct != null ? fmt(monitoreosCumplePct, 0) : '—',
    unit: monitoreosCumplePct != null ? '%' : '',
    hint: input.monitoreos?.meta.periodLabel ?? 'Cumplimiento / control',
    tone:
      monitoreosCumplePct == null
        ? 'default'
        : monitoreosCumplePct >= 90
          ? 'lime'
          : 'warn',
    href: '/operaciones/monitoreo-ambiental',
  })

  kpis.push({
    id: 'lic',
    label: 'Licencias vigentes',
    value: fmt(lic?.meta.vigentes ?? 0),
    unit: '',
    hint: lic
      ? `${fmt(lic.meta.totalRows)} en catálogo`
      : 'Sin catálogo cargado',
    tone: 'dark',
    href: '/operaciones/licencias-ambientales',
  })

  kpis.push({
    id: 'incidentes',
    label: 'Incidentes abiertos',
    value: fmt(incidentesAbiertos),
    unit: '',
    hint:
      incidentesTotal > 0
        ? `${fmt(incidentesTotal)} registrados`
        : 'Sin registros',
    tone: incidentesAbiertos > 0 ? 'warn' : 'default',
    href: '/operaciones/incidentes-ambientales',
  })

  if (input.cumplimiento) {
    kpis.push({
      id: 'obl-venc',
      label: 'Obligaciones vencidas',
      value: fmt(input.cumplimiento.meta.vencidos),
      unit: '',
      hint: `${fmt(input.cumplimiento.meta.porVencer)} por vencer`,
      tone:
        input.cumplimiento.meta.vencidos > 0 ||
        input.cumplimiento.meta.porVencer > 0
          ? 'warn'
          : 'default',
      href: '/cumplimiento',
    })
  }

  if (input.capa) {
    kpis.push({
      id: 'capa-open',
      label: 'CAPA abiertas',
      value: fmt(input.capa.meta.abiertas),
      unit: '',
      hint:
        input.capa.meta.vencidas > 0
          ? `${fmt(input.capa.meta.vencidas)} vencidas`
          : `${fmt(input.capa.meta.pctCierre, 1)}% cierre`,
      tone:
        input.capa.meta.vencidas > 0 || input.capa.meta.abiertas > 0
          ? 'warn'
          : 'default',
      href: '/capa',
    })
  }

  const allKpis = kpis.slice(0, 6)

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
    input.cumplimiento,
    input.capa,
    input.metas,
    input.umbrales,
    input.intensidad,
    input.circularidad,
    input.expedientes,
    input.analista,
  ].filter(Boolean).length

  return {
    generatedAt: new Date().toISOString(),
    periodHints,
    kpis: allKpis,
    alicon,
    agro,
    nda,
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
      obligacionesVencidas: input.cumplimiento?.meta.vencidos ?? 0,
      obligacionesPorVencer: input.cumplimiento?.meta.porVencer ?? 0,
      capaAbiertas: input.capa?.meta.abiertas ?? 0,
      capaVencidas: input.capa?.meta.vencidas ?? 0,
      metasEnRiesgo:
        (input.metas?.meta.enRiesgo ?? 0) + (input.metas?.meta.noCumplidas ?? 0),
      umbralesExcedencias: input.umbrales?.meta.excede ?? 0,
      intensidadKgT: input.intensidad?.baseline.intensidadKgT ?? null,
      circularidadPct: input.circularidad?.meta.tasaValorizacionPct ?? null,
      expedientesVigentes: input.expedientes?.meta.vigentes ?? 0,
      analistaCriticos: input.analista?.kpis.criticos ?? 0,
    },
    sites,
    insights: insights.slice(0, 8),
    modulesLoaded,
    modulesFailed: input.failed,
  }
}
