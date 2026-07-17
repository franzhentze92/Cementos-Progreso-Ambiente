/**
 * Carga paralela de módulos para el Dashboard ejecutivo.
 * Un fallo parcial no tumba el resumen completo.
 */

import { buildCarbonReport } from '../data/carbonReport'
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
import { buildAgroLicenciasReport } from '../data/agroLicenciasReport'
import {
  buildDashboardSummary,
  preferredYear,
  type DashboardSummary,
} from '../data/dashboard'
import { loadCarbonCampaign } from './carbonApi'
import { loadAgroConsumoAgua } from './agroConsumoAguaApi'
import { loadAgroResiduos } from './agroResiduosApi'
import { loadAgroCompostaje } from './agroCompostajeApi'
import { loadAgroIncidentes } from './agroIncidentesApi'
import { loadAliconIncidentes } from './aliconIncidentesApi'
import { loadAgroInspecciones } from './agroInspeccionesApi'
import { loadAliconInspecciones } from './aliconInspeccionesApi'
import { loadAgroMonitoreos } from './agroMonitoreosApi'
import { loadAgroNdaGeneral } from './agroNdaGeneralApi'
import { loadAgroLicencias } from './agroLicenciasApi'
import { loadCumplimiento } from './cumplimientoApi'
import { loadCapas } from './capaApi'
import { loadMetas } from './metasApi'
import { loadUmbrales } from './umbralesApi'
import { loadEscenarios } from './intensidadApi'
import { loadCircularidad } from './circularidadApi'
import { loadExpedientes } from './expedientesApi'
import { loadBriefings } from './analistaApi'
import { buildCumplimientoReport } from '../data/cumplimientoReport'
import { buildCapaReport } from '../data/capaReport'
import { buildMetasReport } from '../data/metasReport'
import { buildUmbralesReport } from '../data/umbralesReport'
import { buildIntensidadReport } from '../data/intensidadReport'
import { buildCircularidadReport } from '../data/circularidadReport'
import { buildExpedientesReport } from '../data/expedientesReport'

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

export async function loadDashboardSummary(): Promise<DashboardSummary> {
  const failed: string[] = []

  const [
    carbonRes,
    aguaRes,
    residuosRes,
    compostajeRes,
    incAgroRes,
    incAliRes,
    inspAgroRes,
    inspAliRes,
    monRes,
    ndaRes,
    licRes,
    cumRes,
    capaRes,
    metasRes,
    umbralesRes,
    escRes,
    circRes,
    expRes,
    briefRes,
  ] = await Promise.all([
    settled('Alicon monitoreo', () => loadCarbonCampaign()),
    settled('Consumo agua', () => loadAgroConsumoAgua()),
    settled('Residuos', () => loadAgroResiduos()),
    settled('Compostaje', () => loadAgroCompostaje()),
    settled('Incidentes Agro', () => loadAgroIncidentes()),
    settled('Incidentes Alicon', () => loadAliconIncidentes()),
    settled('Inspecciones Agro', () => loadAgroInspecciones()),
    settled('Inspecciones Alicon', () => loadAliconInspecciones()),
    settled('Monitoreos Agro', () => loadAgroMonitoreos()),
    settled('NDA General', () => loadAgroNdaGeneral()),
    settled('Licencias', () => loadAgroLicencias()),
    settled('Cumplimiento', () => loadCumplimiento()),
    settled('CAPA', () => loadCapas()),
    settled('Metas', () => loadMetas()),
    settled('Umbrales', () => loadUmbrales()),
    settled('Escenarios', () => loadEscenarios()),
    settled('Circularidad', () => loadCircularidad()),
    settled('Expedientes', () => loadExpedientes()),
    settled('Analista', () => loadBriefings()),
  ])

  const carbon =
    carbonRes.ok
      ? buildCarbonReport(carbonRes.value.state)
      : (failed.push(carbonRes.label), null)

  const agua =
    aguaRes.ok
      ? buildAgroAguaReport(
          aguaRes.value,
          preferredYear(aguaYears(aguaRes.value)),
        )
      : (failed.push(aguaRes.label), null)

  const residuos =
    residuosRes.ok
      ? buildAgroResiduosReport(
          residuosRes.value,
          preferredYear(residuosYears(residuosRes.value)),
        )
      : (failed.push(residuosRes.label), null)

  const compostaje =
    compostajeRes.ok
      ? (() => {
          const years = [
            ...new Set(compostajeRes.value.map((r) => yearFromCompostaje(r.fecha))),
          ].sort((a, b) => b - a)
          return buildAgroCompostajeReport(
            compostajeRes.value,
            preferredYear(years),
          )
        })()
      : (failed.push(compostajeRes.label), null)

  const incidentesAgro =
    incAgroRes.ok
      ? buildAgroIncidentesReport(
          incAgroRes.value,
          preferredYear(incidentesYears(incAgroRes.value)),
        )
      : (failed.push(incAgroRes.label), null)

  const incidentesAlicon =
    incAliRes.ok
      ? buildAgroIncidentesReport(
          incAliRes.value,
          preferredYear(incidentesYears(incAliRes.value)),
        )
      : (failed.push(incAliRes.label), null)

  const inspeccionesAgro =
    inspAgroRes.ok
      ? buildAgroInspeccionReport(
          inspAgroRes.value,
          preferredYear(inspeccionYears(inspAgroRes.value)),
        )
      : (failed.push(inspAgroRes.label), null)

  const inspeccionesAlicon =
    inspAliRes.ok
      ? buildAgroInspeccionReport(
          inspAliRes.value,
          preferredYear(inspeccionYears(inspAliRes.value)),
        )
      : (failed.push(inspAliRes.label), null)

  const monitoreos =
    monRes.ok
      ? buildAgroMonitoreosReport(
          monRes.value,
          preferredYear(monitoreosYears(monRes.value)),
        )
      : (failed.push(monRes.label), null)

  const nda =
    ndaRes.ok
      ? (() => {
          const years = [
            ...new Set(ndaRes.value.map((r) => yearFromNda(r.fecha))),
          ].sort((a, b) => b - a)
          return buildAgroNdaGeneralReport(ndaRes.value, preferredYear(years))
        })()
      : (failed.push(ndaRes.label), null)

  const licencias =
    licRes.ok
      ? buildAgroLicenciasReport(licRes.value)
      : (failed.push(licRes.label), null)

  const cumplimiento =
    cumRes.ok
      ? buildCumplimientoReport(cumRes.value)
      : (failed.push(cumRes.label), null)

  const capa =
    capaRes.ok
      ? buildCapaReport(capaRes.value)
      : (failed.push(capaRes.label), null)

  const metas =
    metasRes.ok
      ? buildMetasReport(metasRes.value)
      : (failed.push(metasRes.label), null)

  const umbrales =
    umbralesRes.ok && monRes.ok
      ? buildUmbralesReport(umbralesRes.value, monRes.value)
      : (failed.push(
          umbralesRes.ok ? 'Umbrales (requiere monitoreos)' : umbralesRes.label,
        ),
        null)

  const intensidad = escRes.ok
    ? buildIntensidadReport(
        carbonRes.ok ? buildCarbonReport(carbonRes.value.state) : null,
        escRes.value,
      )
    : (failed.push(escRes.label), null)

  const circularidad = circRes.ok
    ? buildCircularidadReport(
        circRes.value,
        residuosRes.ok ? residuosRes.value : [],
      )
    : (failed.push(circRes.label), null)

  const expedientes = expRes.ok
    ? buildExpedientesReport(expRes.value)
    : (failed.push(expRes.label), null)

  const analista = briefRes.ok
    ? (() => {
        const latest = briefRes.value[0]
        if (!latest) return null
        const topSignal = [...latest.signals].sort((a, b) => b.score - a.score)[0]
        return {
          kpis: latest.kpis,
          top: topSignal
            ? {
                level: topSignal.level,
                title: topSignal.title,
                text: topSignal.text,
              }
            : null,
        }
      })()
    : (failed.push(briefRes.label), null)

  return buildDashboardSummary({
    carbon,
    agua,
    residuos,
    compostaje,
    incidentesAgro,
    incidentesAlicon,
    inspeccionesAgro,
    inspeccionesAlicon,
    monitoreos,
    nda,
    licencias,
    cumplimiento,
    capa,
    metas,
    umbrales,
    intensidad,
    circularidad,
    expedientes,
    analista,
    failed,
  })
}
