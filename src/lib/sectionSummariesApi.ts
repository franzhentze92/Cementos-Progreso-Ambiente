/**
 * Carga de resúmenes por sección del menú (Operaciones, Cumplimiento, etc.).
 * Un fallo parcial no tumba el dashboard completo.
 */

import { preferredYear } from '../data/dashboard'
import {
  buildAgroAguaReport,
  availableYears as aguaYears,
} from '../data/agroConsumoAguaReport'
import {
  buildAgroResiduosReport,
  availableYears as residuosYears,
} from '../data/agroResiduosReport'
import { buildAgroCompostajeReport } from '../data/agroCompostajeReport'
import { yearFromFecha as yearFromCompostaje } from '../data/agroCompostaje'
import {
  buildAgroIncidentesReport,
  availableYears as incidentesYears,
} from '../data/agroIncidentesReport'
import {
  buildAgroInspeccionReport,
  availableYears as inspeccionYears,
} from '../data/agroInspeccionesReport'
import {
  buildAgroMonitoreosReport,
  availableYears as monitoreosYears,
} from '../data/agroMonitoreosReport'
import { buildAgroNdaGeneralReport } from '../data/agroNdaGeneralReport'
import { yearFromFecha as yearFromNda } from '../data/agroNdaGeneral'
import { buildAgroNdaCascoVerdeReport } from '../data/agroNdaCascoVerdeReport'
import { yearFromFecha as yearFromCasco } from '../data/agroNdaCascoVerde'
import {
  buildAgroCapacitacionesReport,
  availableYears as capYears,
} from '../data/agroCapacitacionesReport'
import { buildAgroLicenciasReport } from '../data/agroLicenciasReport'
import { buildAgroGestionTramitesReport } from '../data/agroGestionTramitesReport'
import { buildCumplimientoReport } from '../data/cumplimientoReport'
import { buildCapaReport } from '../data/capaReport'
import { buildMetasReport } from '../data/metasReport'
import { buildUmbralesReport } from '../data/umbralesReport'
import { buildIntensidadReport } from '../data/intensidadReport'
import { buildCircularidadReport } from '../data/circularidadReport'
import { buildExpedientesReport } from '../data/expedientesReport'
import { buildCarbonReport } from '../data/carbonReport'
import { riskForCompromiso } from '../data/compromisosAmbientales'
import { EXPORT_PACKS } from './exportPacks'
import { loadAgroConsumoAgua } from './agroConsumoAguaApi'
import { loadAgroResiduos } from './agroResiduosApi'
import { loadAgroCompostaje } from './agroCompostajeApi'
import { loadAgroIncidentes } from './agroIncidentesApi'
import { loadAliconIncidentes } from './aliconIncidentesApi'
import { loadAgroInspecciones } from './agroInspeccionesApi'
import { loadAliconInspecciones } from './aliconInspeccionesApi'
import { loadDescargaBarcosInspecciones } from './descargaBarcosInspeccionesApi'
import { loadAgroMonitoreos } from './agroMonitoreosApi'
import { loadAgroNdaGeneral } from './agroNdaGeneralApi'
import { loadAgroNdaCascoVerde } from './agroNdaCascoVerdeApi'
import { loadAgroCapacitaciones } from './agroCapacitacionesApi'
import { loadAgroLicencias } from './agroLicenciasApi'
import { loadAgroGestionTramites } from './agroGestionTramitesApi'
import { loadCumplimiento } from './cumplimientoApi'
import { loadCapas } from './capaApi'
import { loadCompromisos } from './compromisosAmbientalesApi'
import { loadMetas } from './metasApi'
import { loadUmbrales } from './umbralesApi'
import { loadEscenarios } from './intensidadApi'
import { loadCircularidad } from './circularidadApi'
import { loadExpedientes } from './expedientesApi'
import { loadCarbonCampaign } from './carbonApi'

async function settled<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; label: string; error: string }> {
  try {
    return { ok: true, value: await fn() }
  } catch (err) {
    return {
      ok: false,
      label,
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}

function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('es-GT', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

export type SectionKpi = {
  id: string
  label: string
  value: string
  unit?: string
  hint: string
  tone: 'default' | 'lime' | 'dark' | 'warn'
  href: string
}

export type OperacionesSummary = {
  modulesLoaded: number
  modulesFailed: string[]
  kpis: SectionKpi[]
  complianceBars: Array<{ name: string; value: number; fill: string }>
  incidentShare: Array<{ name: string; value: number; fill: string }>
  aguaSedeShare: Array<{ name: string; value: number; fill: string }>
  aguaTotalM3: number | null
  aguaPeriod: string | null
  residuosRutaShare: Array<{ name: string; value: number; fill: string }>
  residuosTotalLbs: number | null
  residuosPeriod: string | null
  compostajeMonthly: Array<{ month: string; total: number }>
  compostajeTotal: number | null
  compostajePeriod: string | null
  capacitacionesMonthly: Array<{
    short: string
    ejecutado: number
    programado: number
  }>
  capacitacionesRate: number | null
  cascoMonthly: Array<{ label: string; avgNota: number | null }>
  cascoAvg: number | null
  periodHints: string[]
}

export async function loadOperacionesSummary(): Promise<OperacionesSummary> {
  const failed: string[] = []
  const [
    aguaRes,
    residuosRes,
    compostajeRes,
    incAgroRes,
    incAliRes,
    inspAgroRes,
    inspAliRes,
    inspBarRes,
    monRes,
    ndaRes,
    cascoRes,
    capRes,
  ] = await Promise.all([
    settled('Consumo agua', () => loadAgroConsumoAgua()),
    settled('Residuos', () => loadAgroResiduos()),
    settled('Compostaje', () => loadAgroCompostaje()),
    settled('Incidentes Agro', () => loadAgroIncidentes()),
    settled('Incidentes Alicon', () => loadAliconIncidentes()),
    settled('Inspecciones Agro', () => loadAgroInspecciones()),
    settled('Inspecciones Alicon', () => loadAliconInspecciones()),
    settled('Inspecciones Barcos', () => loadDescargaBarcosInspecciones()),
    settled('Monitoreos', () => loadAgroMonitoreos()),
    settled('NDA General', () => loadAgroNdaGeneral()),
    settled('NDA Casco Verde', () => loadAgroNdaCascoVerde()),
    settled('Capacitaciones', () => loadAgroCapacitaciones()),
  ])

  const agua = aguaRes.ok
    ? buildAgroAguaReport(
        aguaRes.value,
        preferredYear(aguaYears(aguaRes.value)),
      )
    : (failed.push(aguaRes.label), null)

  const residuos = residuosRes.ok
    ? buildAgroResiduosReport(
        residuosRes.value,
        preferredYear(residuosYears(residuosRes.value)),
      )
    : (failed.push(residuosRes.label), null)

  const compostaje = compostajeRes.ok
    ? (() => {
        const years = [
          ...new Set(
            compostajeRes.value.map((r) => yearFromCompostaje(r.fecha)),
          ),
        ].sort((a, b) => b - a)
        return buildAgroCompostajeReport(
          compostajeRes.value,
          preferredYear(years),
        )
      })()
    : (failed.push(compostajeRes.label), null)

  const mergeInc = [
    ...(incAgroRes.ok ? [incAgroRes.value] : (failed.push(incAgroRes.label), [])),
    ...(incAliRes.ok ? [incAliRes.value] : (failed.push(incAliRes.label), [])),
  ].flat()
  const incidentes =
    mergeInc.length > 0
      ? buildAgroIncidentesReport(
          mergeInc,
          preferredYear(incidentesYears(mergeInc)),
        )
      : null

  const mergeInsp = [
    ...(inspAgroRes.ok
      ? [inspAgroRes.value]
      : (failed.push(inspAgroRes.label), [])),
    ...(inspAliRes.ok
      ? [inspAliRes.value]
      : (failed.push(inspAliRes.label), [])),
    ...(inspBarRes.ok
      ? [inspBarRes.value]
      : (failed.push(inspBarRes.label), [])),
  ].flat()
  const inspecciones =
    mergeInsp.length > 0
      ? buildAgroInspeccionReport(
          mergeInsp,
          preferredYear(inspeccionYears(mergeInsp)),
        )
      : null

  const monitoreos = monRes.ok
    ? buildAgroMonitoreosReport(
        monRes.value,
        preferredYear(monitoreosYears(monRes.value)),
      )
    : (failed.push(monRes.label), null)

  const nda = ndaRes.ok
    ? (() => {
        const years = [
          ...new Set(ndaRes.value.map((r) => yearFromNda(r.fecha))),
        ].sort((a, b) => b - a)
        return buildAgroNdaGeneralReport(ndaRes.value, preferredYear(years))
      })()
    : (failed.push(ndaRes.label), null)

  const casco = cascoRes.ok
    ? (() => {
        const years = [
          ...new Set(cascoRes.value.map((r) => yearFromCasco(r.fecha))),
        ].sort((a, b) => b - a)
        return buildAgroNdaCascoVerdeReport(
          cascoRes.value,
          preferredYear(years),
        )
      })()
    : (failed.push(cascoRes.label), null)

  const caps = capRes.ok
    ? buildAgroCapacitacionesReport(
        capRes.value,
        preferredYear(capYears(capRes.value)),
      )
    : (failed.push(capRes.label), null)

  const periodHints = [
    monitoreos?.meta.periodLabel,
    agua?.meta.periodLabel,
    residuos?.meta.periodLabel,
    compostaje?.meta.periodLabel,
  ].filter(Boolean) as string[]

  const kpis: SectionKpi[] = [
    {
      id: 'mon',
      label: 'Cumplimiento monitoreos',
      value:
        monitoreos?.totals.compliancePct != null
          ? fmt(monitoreos.totals.compliancePct, 1)
          : '—',
      unit: '%',
      hint: monitoreos?.meta.periodLabel ?? 'Monitoreo ambiental',
      tone:
        monitoreos?.totals.compliancePct != null &&
        monitoreos.totals.compliancePct < 90
          ? 'warn'
          : 'lime',
      href: '/operaciones/monitoreo-ambiental',
    },
    {
      id: 'insp',
      label: 'Score inspecciones',
      value:
        inspecciones?.totals.avgScore != null
          ? fmt(inspecciones.totals.avgScore, 1)
          : '—',
      hint: `${fmt(inspecciones?.meta.totalRows ?? 0)} inspecciones · ${fmt(inspecciones?.totals.totalHallazgos ?? 0)} hallazgos`,
      tone: 'dark',
      href: '/operaciones/inspeccion-ambiental',
    },
    {
      id: 'inc',
      label: 'Incidentes abiertos',
      value: fmt(incidentes?.meta.abiertos ?? 0),
      hint: `${fmt(incidentes?.meta.totalRows ?? 0)} totales · ${fmt(incidentes?.meta.cerrados ?? 0)} cerrados`,
      tone: (incidentes?.meta.abiertos ?? 0) > 0 ? 'warn' : 'lime',
      href: '/operaciones/incidentes-ambientales',
    },
    {
      id: 'agua',
      label: 'Consumo de agua',
      value: agua ? fmt(agua.totals.totalM3, 0) : '—',
      unit: 'm³',
      hint: agua?.meta.periodLabel ?? 'Sin datos',
      tone: 'default',
      href: '/operaciones/consumo-de-agua',
    },
    {
      id: 'res',
      label: 'Residuos',
      value: residuos ? fmt(residuos.totals.positiveLbs, 0) : '—',
      unit: 'lbs',
      hint: residuos?.meta.periodLabel ?? 'Sin datos',
      tone: 'default',
      href: '/operaciones/gestion-de-residuos',
    },
    {
      id: 'comp',
      label: 'Compostaje',
      value: compostaje ? fmt(compostaje.totals.total, 1) : '—',
      unit: 't',
      hint: compostaje?.meta.periodLabel ?? 'Sin datos',
      tone: 'lime',
      href: '/operaciones/compostaje',
    },
    {
      id: 'nda',
      label: 'NDA General',
      value: nda?.totals.avgNda != null ? fmt(nda.totals.avgNda, 1) : '—',
      hint: nda?.meta.periodLabel ?? 'Promedio periodo',
      tone: 'dark',
      href: '/operaciones/nda-general',
    },
    {
      id: 'casco',
      label: 'NDA Casco Verde',
      value:
        casco?.totals.avgNota != null ? fmt(casco.totals.avgNota, 1) : '—',
      hint: `${fmt(casco?.totals.totalHallazgos ?? 0)} hallazgos`,
      tone: 'default',
      href: '/operaciones/nda-casco-verde',
    },
    {
      id: 'cap',
      label: 'Capacitaciones',
      value:
        caps?.totals.executionRate != null
          ? fmt(caps.totals.executionRate, 0)
          : '—',
      unit: '%',
      hint: `${fmt(caps?.meta.ejecutado ?? 0)} ejecutadas · ${fmt(caps?.meta.programado ?? 0)} programadas`,
      tone:
        caps?.totals.executionRate != null && caps.totals.executionRate < 70
          ? 'warn'
          : 'lime',
      href: '/operaciones/capacitaciones',
    },
  ]

  const complianceBars = [
    {
      name: 'Monitoreos',
      value: monitoreos?.totals.compliancePct ?? 0,
      fill: '#047935',
      has: monitoreos?.totals.compliancePct != null,
    },
    {
      name: 'NDA',
      value: nda?.totals.avgNda ?? 0,
      fill: '#5ab64b',
      has: nda?.totals.avgNda != null,
    },
    {
      name: 'Inspecciones',
      value: inspecciones?.totals.avgScore ?? 0,
      fill: '#c2d500',
      has: inspecciones?.totals.avgScore != null,
    },
    {
      name: 'Casco Verde',
      value: casco?.totals.avgNota ?? 0,
      fill: '#3d7ea6',
      has: casco?.totals.avgNota != null,
    },
  ].filter((x) => x.has)

  const incidentShare = [
    {
      name: 'Abiertos',
      value: incidentes?.meta.abiertos ?? 0,
      fill: '#c45c26',
    },
    {
      name: 'Cerrados',
      value: incidentes?.meta.cerrados ?? 0,
      fill: '#047935',
    },
  ].filter((x) => x.value > 0)

  const loaded = 12 - failed.length

  return {
    modulesLoaded: Math.max(loaded, 0),
    modulesFailed: failed,
    kpis,
    complianceBars,
    incidentShare,
    aguaSedeShare: agua?.sedeShare ?? [],
    aguaTotalM3: agua?.totals.totalM3 ?? null,
    aguaPeriod: agua?.meta.periodLabel ?? null,
    residuosRutaShare: residuos?.rutaShare ?? [],
    residuosTotalLbs: residuos?.totals.positiveLbs ?? null,
    residuosPeriod: residuos?.meta.periodLabel ?? null,
    compostajeMonthly: (compostaje?.monthly ?? []).map((m) => ({
      month: m.label,
      total: m.total,
    })),
    compostajeTotal: compostaje?.totals.total ?? null,
    compostajePeriod: compostaje?.meta.periodLabel ?? null,
    capacitacionesMonthly: (caps?.monthly ?? []).map((m) => ({
      short: m.short,
      ejecutado: m.ejecutado,
      programado: m.programado,
    })),
    capacitacionesRate: caps?.totals.executionRate ?? null,
    cascoMonthly: (casco?.monthlyAvg ?? []).map((m) => ({
      label: m.label,
      avgNota: m.avgNota,
    })),
    cascoAvg: casco?.totals.avgNota ?? null,
    periodHints: [...new Set(periodHints)],
  }
}

export type CumplimientoSectionSummary = {
  modulesLoaded: number
  modulesFailed: string[]
  kpis: SectionKpi[]
  obligByEstado: Array<{ name: string; value: number }>
  capaByEstado: Array<{ name: string; value: number }>
  licByEstado: Array<{ name: string; value: number }>
  tramitesByEstado: Array<{ name: string; value: number }>
  upcoming: Array<{
    id: string
    fecha: string
    titulo: string
    origen: string
    href: string
    riesgo: 'alto' | 'medio' | 'bajo'
  }>
  compromisosTotal: number
  compromisosVencidos: number
  compromisosAbiertos: number
}

function riskFromDate(iso: string | null | undefined): 'alto' | 'medio' | 'bajo' {
  if (!iso) return 'bajo'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'bajo'
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000)
  if (days < 0 || days <= 15) return 'alto'
  if (days <= 45) return 'medio'
  return 'bajo'
}

export async function loadCumplimientoSectionSummary(): Promise<CumplimientoSectionSummary> {
  const failed: string[] = []
  const [cumRes, capaRes, licRes, tramRes, compRes] = await Promise.all([
    settled('Cumplimiento legal', () => loadCumplimiento()),
    settled('CAPA', () => loadCapas()),
    settled('Licencias', () => loadAgroLicencias()),
    settled('Trámites', () => loadAgroGestionTramites()),
    settled('Compromisos', () => loadCompromisos()),
  ])

  const cumplimiento = cumRes.ok
    ? buildCumplimientoReport(cumRes.value)
    : (failed.push(cumRes.label), null)
  const capa = capaRes.ok
    ? buildCapaReport(capaRes.value)
    : (failed.push(capaRes.label), null)
  const licencias = licRes.ok
    ? buildAgroLicenciasReport(licRes.value)
    : (failed.push(licRes.label), null)
  const tramites = tramRes.ok
    ? buildAgroGestionTramitesReport(tramRes.value)
    : (failed.push(tramRes.label), null)

  let compromisosTotal = 0
  let compromisosVencidos = 0
  let compromisosAbiertos = 0
  if (compRes.ok) {
    compromisosTotal = compRes.value.length
    for (const c of compRes.value) {
      const risk = riskForCompromiso(c)
      if (risk === 'vencido') compromisosVencidos += 1
      if (risk !== 'cerrado' && risk !== 'suspendido') compromisosAbiertos += 1
    }
  } else {
    failed.push(compRes.label)
  }

  const kpis: SectionKpi[] = [
    {
      id: 'venc',
      label: 'Obligaciones vencidas',
      value: fmt(cumplimiento?.meta.vencidos ?? 0),
      hint: `${fmt(cumplimiento?.meta.porVencer ?? 0)} por vencer`,
      tone: (cumplimiento?.meta.vencidos ?? 0) > 0 ? 'warn' : 'lime',
      href: '/cumplimiento',
    },
    {
      id: 'capa',
      label: 'CAPAs abiertas',
      value: fmt(capa?.meta.abiertas ?? 0),
      hint: `${fmt(capa?.meta.vencidas ?? 0)} vencidas · cierre ${capa?.meta.pctCierre != null ? `${fmt(capa.meta.pctCierre, 0)}%` : '—'}`,
      tone: (capa?.meta.vencidas ?? 0) > 0 ? 'warn' : 'dark',
      href: '/capa',
    },
    {
      id: 'comp',
      label: 'Compromisos abiertos',
      value: fmt(compromisosAbiertos),
      hint: `${fmt(compromisosVencidos)} vencidos · ${fmt(compromisosTotal)} totales`,
      tone: compromisosVencidos > 0 ? 'warn' : 'default',
      href: '/compromisos-ambientales/lista',
    },
    {
      id: 'lic',
      label: 'Licencias vigentes',
      value: fmt(licencias?.meta.vigentes ?? 0),
      hint: `${fmt(licencias?.proximoVencer.length ?? 0)} por vencer ≤12m`,
      tone: 'lime',
      href: '/operaciones/licencias-ambientales',
    },
    {
      id: 'tram',
      label: 'Trámites en proceso',
      value: fmt(tramites?.meta.enProceso ?? 0),
      hint: `${fmt(tramites?.meta.cerrado ?? 0)} cerrados · ${fmt(tramites?.meta.porSolicitar ?? 0)} por solicitar`,
      tone: 'dark',
      href: '/operaciones/gestion-de-tramites',
    },
    {
      id: 'crit',
      label: 'Alta criticidad',
      value: fmt(cumplimiento?.meta.altaCriticidad ?? 0),
      hint: 'Obligaciones legales críticas',
      tone: (cumplimiento?.meta.altaCriticidad ?? 0) > 0 ? 'warn' : 'default',
      href: '/cumplimiento',
    },
  ]

  const upcoming = [
    ...(cumplimiento?.calendar ?? []).slice(0, 8).map((c) => ({
      id: `obl-${c.id}`,
      fecha: c.fecha,
      titulo: c.titulo,
      origen: 'Cumplimiento legal',
      href: '/cumplimiento',
      riesgo: riskFromDate(c.fecha),
    })),
    ...(capaRes.ok
      ? capaRes.value
          .filter((c) => c.fechaCompromiso && !/cerrad|cancelad/i.test(c.estado))
          .slice(0, 8)
          .map((c) => ({
            id: `capa-${c.id}`,
            fecha: c.fechaCompromiso!,
            titulo: c.accion || c.hallazgo || c.codigo,
            origen: 'CAPA',
            href: '/capa',
            riesgo: riskFromDate(c.fechaCompromiso),
          }))
      : []),
  ]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 12)

  return {
    modulesLoaded: 5 - failed.length,
    modulesFailed: failed,
    kpis,
    obligByEstado: cumplimiento?.byEstado ?? [],
    capaByEstado: capa?.byEstado ?? [],
    licByEstado: licencias?.byEstado ?? [],
    tramitesByEstado: tramites?.byEstado ?? [],
    upcoming,
    compromisosTotal,
    compromisosVencidos,
    compromisosAbiertos,
  }
}

export type SostenibilidadSummary = {
  modulesLoaded: number
  modulesFailed: string[]
  kpis: SectionKpi[]
  metasByCategoria: Array<{ name: string; avgPct: number | null; value: number }>
  umbralesByParam: Array<{ name: string; cumple: number; excede: number }>
  intensidadComparison: Array<{ name: string; intensidad: number }>
  circularidadByRuta: Array<{ name: string; value: number }>
  carbonMonthly: Array<{ month: string; total: number }>
  carbonPeriod: string | null
}

export async function loadSostenibilidadSummary(): Promise<SostenibilidadSummary> {
  const failed: string[] = []
  const [metasRes, umbralesRes, monRes, escRes, circRes, residuosRes, carbonRes] =
    await Promise.all([
      settled('Metas', () => loadMetas()),
      settled('Umbrales', () => loadUmbrales()),
      settled('Monitoreos', () => loadAgroMonitoreos()),
      settled('Escenarios', () => loadEscenarios()),
      settled('Circularidad', () => loadCircularidad()),
      settled('Residuos', () => loadAgroResiduos()),
      settled('Huella carbono', () => loadCarbonCampaign()),
    ])

  const metas = metasRes.ok
    ? buildMetasReport(metasRes.value)
    : (failed.push(metasRes.label), null)

  const umbrales =
    umbralesRes.ok && monRes.ok
      ? buildUmbralesReport(umbralesRes.value, monRes.value)
      : (failed.push(
          umbralesRes.ok ? 'Umbrales (requiere monitoreos)' : umbralesRes.label,
        ),
        null)
  if (!monRes.ok && !failed.includes(monRes.label)) failed.push(monRes.label)

  const carbon = carbonRes.ok
    ? buildCarbonReport(carbonRes.value.state)
    : (failed.push(carbonRes.label), null)

  const intensidad = escRes.ok
    ? buildIntensidadReport(carbon, escRes.value)
    : (failed.push(escRes.label), null)

  const circularidad = circRes.ok
    ? buildCircularidadReport(
        circRes.value,
        residuosRes.ok ? residuosRes.value : [],
      )
    : (failed.push(circRes.label), null)
  if (!residuosRes.ok) failed.push(residuosRes.label)

  const kpis: SectionKpi[] = [
    {
      id: 'metas',
      label: 'Avance metas',
      value:
        metas?.meta.avgProgress != null
          ? fmt(metas.meta.avgProgress, 0)
          : '—',
      unit: '%',
      hint: `${fmt(metas?.meta.enRiesgo ?? 0)} en riesgo · ${fmt(metas?.meta.cumplidas ?? 0)} cumplidas`,
      tone: (metas?.meta.enRiesgo ?? 0) > 0 ? 'warn' : 'lime',
      href: '/metas',
    },
    {
      id: 'umb',
      label: 'Cumplimiento umbrales',
      value:
        umbrales?.meta.cumplePct != null
          ? fmt(umbrales.meta.cumplePct, 1)
          : '—',
      unit: '%',
      hint: `${fmt(umbrales?.meta.excede ?? 0)} excedencias`,
      tone: (umbrales?.meta.excede ?? 0) > 0 ? 'warn' : 'dark',
      href: '/umbrales',
    },
    {
      id: 'int',
      label: 'Intensidad ambiental',
      value:
        intensidad?.baseline.intensidadKgT != null
          ? fmt(intensidad.baseline.intensidadKgT, 1)
          : '—',
      unit: 'kg CO₂e/t',
      hint: 'Proxy operativo base',
      tone: 'default',
      href: '/intensidad',
    },
    {
      id: 'circ',
      label: 'Circularidad',
      value:
        circularidad?.meta.tasaValorizacionPct != null
          ? fmt(circularidad.meta.tasaValorizacionPct, 1)
          : '—',
      unit: '%',
      hint: 'Tasa de valorización',
      tone: 'lime',
      href: '/circularidad',
    },
    {
      id: 'huella',
      label: 'Producción cemento',
      value: carbon ? fmt(carbon.totals.totalCement, 0) : '—',
      unit: 't',
      hint: carbon
        ? `kWh/t ${carbon.totals.avgKwhPerTon != null ? fmt(carbon.totals.avgKwhPerTon, 1) : '—'}`
        : 'Huella Alicón',
      tone: 'dark',
      href: '/operaciones/huella-de-carbono',
    },
  ]

  return {
    modulesLoaded: 6 - failed.length,
    modulesFailed: [...new Set(failed)],
    kpis,
    metasByCategoria: (metas?.byCategoria ?? []).map((c) => ({
      name: c.name,
      avgPct: c.avgPct,
      value: c.value,
    })),
    umbralesByParam: (umbrales?.byParametro ?? []).slice(0, 8).map((r) => ({
      name: r.name,
      cumple: r.cumple,
      excede: r.excede,
    })),
    intensidadComparison: (intensidad?.comparison ?? []).map((c) => ({
      name: c.name,
      intensidad: c.intensidad,
    })),
    circularidadByRuta: (circularidad?.byRuta ?? []).slice(0, 8).map((r) => ({
      name: r.name,
      value: r.value,
    })),
    carbonMonthly: (carbon?.monthlyProduction ?? []).map((m) => ({
      month: m.month,
      total: m.total,
    })),
    carbonPeriod: carbon?.meta.periodLabel ?? null,
  }
}

export type DocumentosSummary = {
  modulesLoaded: number
  modulesFailed: string[]
  kpis: SectionKpi[]
  byTema: Array<{ name: string; value: number }>
  byTipo: Array<{ name: string; value: number }>
  exportPacks: number
}

export async function loadDocumentosSummary(): Promise<DocumentosSummary> {
  const failed: string[] = []
  const expRes = await settled('Expedientes', () => loadExpedientes())
  const expedientes = expRes.ok
    ? buildExpedientesReport(expRes.value)
    : (failed.push(expRes.label), null)

  const kpis: SectionKpi[] = [
    {
      id: 'total',
      label: 'Expedientes',
      value: fmt(expedientes?.meta.total ?? 0),
      hint: 'Total en biblioteca documental',
      tone: 'dark',
      href: '/expedientes',
    },
    {
      id: 'vig',
      label: 'Vigentes',
      value: fmt(expedientes?.meta.vigentes ?? 0),
      hint: `${fmt(expedientes?.meta.borradores ?? 0)} borradores`,
      tone: 'lime',
      href: '/expedientes',
    },
    {
      id: 'arch',
      label: 'Con archivo',
      value: fmt(expedientes?.meta.conArchivo ?? 0),
      hint: `${fmt(expedientes?.meta.ligados ?? 0)} ligados a módulos`,
      tone: 'default',
      href: '/expedientes',
    },
    {
      id: 'packs',
      label: 'Packs de exportes',
      value: fmt(EXPORT_PACKS.length),
      hint: 'PDF / CSV disponibles',
      tone: 'dark',
      href: '/exportes',
    },
  ]

  return {
    modulesLoaded: failed.length ? 0 : 1,
    modulesFailed: failed,
    kpis,
    byTema: expedientes?.byTema ?? [],
    byTipo: expedientes?.byTipo ?? [],
    exportPacks: EXPORT_PACKS.length,
  }
}
