import { loadCapas } from './capaApi'
import { loadCumplimiento } from './cumplimientoApi'
import { loadAgroIncidentes } from './agroIncidentesApi'
import { loadAgroMonitoreos } from './agroMonitoreosApi'
import { loadMetas } from './metasApi'
import { loadUmbrales } from './umbralesApi'
import { riskForMeta } from '../data/metas'
import { riskForObligacion } from '../data/cumplimiento'
import { riskForCapa } from '../data/capa'
import { buildUmbralesReport } from '../data/umbralesReport'
import {
  buildSiteRiskCards,
  type SiteRiskCard,
} from '../data/siteRiskBridge'

export async function loadSiteRiskOverlay(): Promise<SiteRiskCard[]> {
  const [obligaciones, capas, incidentes, monitoreos, umbrales, metas] =
    await Promise.all([
      loadCumplimiento().catch(() => []),
      loadCapas().catch(() => []),
      loadAgroIncidentes().catch(() => []),
      loadAgroMonitoreos().catch(() => []),
      loadUmbrales().catch(() => []),
      loadMetas().catch(() => []),
    ])

  const umbralReport = buildUmbralesReport(umbrales, monitoreos)

  return buildSiteRiskCards({
    obligaciones: obligaciones.map((r) => ({
      sitio: r.sitio,
      risk: riskForObligacion(r),
    })),
    capas: capas.map((r) => ({
      sitio: r.sitio,
      risk: riskForCapa(r),
      estado: r.estado,
    })),
    excedencias: umbralReport.excedencias.map((e) => ({ sede: e.sede })),
    incidentes: incidentes.map((r) => ({
      plantaSede: r.plantaSede,
      estado: r.estado,
    })),
    metas: metas.map((r) => ({
      sitio: r.sitio,
      risk: riskForMeta(r),
    })),
  })
}
