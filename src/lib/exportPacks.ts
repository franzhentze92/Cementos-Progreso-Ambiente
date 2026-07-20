/**
 * Generadores de packs de exportación (PDF + CSV) para el Centro de Exportes.
 */

import { buildCapaReport } from '../data/capaReport'
import { buildCumplimientoReport } from '../data/cumplimientoReport'
import { buildMetasReport } from '../data/metasReport'
import { buildUmbralesReport } from '../data/umbralesReport'
import { buildIntensidadReport } from '../data/intensidadReport'
import { buildCircularidadReport } from '../data/circularidadReport'
import { buildExpedientesReport } from '../data/expedientesReport'
import { CATEGORY_LABEL, formatNum as formatAnalistaNum } from '../data/analista'
import { formatIsoDate as formatCapaDate } from '../data/capa'
import { formatIsoDate as formatCumplDate } from '../data/cumplimiento'
import { formatIsoDate as formatExpDate } from '../data/expedientes'
import { riskForCompromiso } from '../data/compromisosAmbientales'
import { buildLiveMonitoringSnapshot } from '../data/kunakLiveMonitoring'
import type { DashboardSummary } from '../data/dashboard'
import { loadCapas } from './capaApi'
import { loadCumplimiento } from './cumplimientoApi'
import { loadMetas } from './metasApi'
import { loadUmbrales } from './umbralesApi'
import { loadEscenarios } from './intensidadApi'
import { loadCircularidad } from './circularidadApi'
import { loadExpedientes } from './expedientesApi'
import { computeLiveAnalistaReport, loadBriefings } from './analistaApi'
import { loadAgroMonitoreos } from './agroMonitoreosApi'
import { loadCarbonCampaign } from './carbonApi'
import { buildCarbonReport } from '../data/carbonReport'
import { loadDashboardSummary } from './dashboardApi'
import { loadAgroLicencias } from './agroLicenciasApi'
import { loadAgroIncidentes } from './agroIncidentesApi'
import { loadAliconIncidentes } from './aliconIncidentesApi'
import { loadAgroResiduos } from './agroResiduosApi'
import { loadAgroConsumoAgua } from './agroConsumoAguaApi'
import { loadAgroCompostaje } from './agroCompostajeApi'
import { loadAgroCapacitaciones } from './agroCapacitacionesApi'
import { loadAgroNdaCascoVerde } from './agroNdaCascoVerdeApi'
import { loadAgroNdaGeneral } from './agroNdaGeneralApi'
import { loadAgroGestionTramites } from './agroGestionTramitesApi'
import { loadAgroInspecciones } from './agroInspeccionesApi'
import { loadAliconInspecciones } from './aliconInspeccionesApi'
import { loadDescargaBarcosInspecciones } from './descargaBarcosInspeccionesApi'
import { loadCompromisos } from './compromisosAmbientalesApi'
import { loadBibliotecaDocs } from './bibliotecaApi'
import { loadSiteRiskOverlay } from './siteRiskApi'
import {
  loadOperacionesSummary,
  loadCumplimientoSectionSummary,
  loadSostenibilidadSummary,
  loadDocumentosSummary,
} from './sectionSummariesApi'
import {
  buildAgroResiduosReport,
  availableYears as residuosYears,
} from '../data/agroResiduosReport'
import {
  buildAgroAguaReport,
  availableYears as aguaYears,
} from '../data/agroConsumoAguaReport'
import {
  buildAgroMonitoreosReport,
  availableYears as monitoreoYears,
} from '../data/agroMonitoreosReport'
import {
  buildAgroInspeccionReport,
  availableYears as inspeccionYears,
} from '../data/agroInspeccionesReport'
import { buildAgroCompostajeReport } from '../data/agroCompostajeReport'
import { buildAgroNdaCascoVerdeReport } from '../data/agroNdaCascoVerdeReport'
import { buildAgroNdaGeneralReport } from '../data/agroNdaGeneralReport'
import {
  buildAgroCapacitacionesReport,
  availableYears as capacitacionesYears,
} from '../data/agroCapacitacionesReport'
import { buildAgroGestionTramitesReport } from '../data/agroGestionTramitesReport'
import { preferredYear } from '../data/dashboard'
import {
  downloadCsv,
  downloadReportPdf,
  stampFilename,
  type PdfThemeId,
} from './exportDownload'

export type ExportPackId =
  | 'dashboard'
  | 'mapa'
  | 'monitoreoVivo'
  | 'analista'
  | 'resumenOperaciones'
  | 'monitoreo'
  | 'inspecciones'
  | 'incidentes'
  | 'residuos'
  | 'agua'
  | 'compostaje'
  | 'ndaCascoVerde'
  | 'ndaGeneral'
  | 'capacitaciones'
  | 'resumenCumplimiento'
  | 'compromisos'
  | 'capa'
  | 'licencias'
  | 'tramites'
  | 'cumplimiento'
  | 'calendarioLegal'
  | 'indicadores'
  | 'metas'
  | 'umbrales'
  | 'intensidad'
  | 'circularidad'
  | 'carbono'
  | 'centroDocumental'
  | 'expedientes'
  | 'biblioteca'

export type ExportPackDef = {
  id: ExportPackId
  title: string
  description: string
  formats: Array<'pdf' | 'csv'>
  audience: string
  /** Paleta PDF / acento de tarjeta (reutiliza temas existentes). */
  theme: PdfThemeId
}

export const EXPORT_PACKS: ExportPackDef[] = [
  // —— Inicio ——
  {
    id: 'dashboard',
    title: 'Dashboard · Resumen ejecutivo',
    description:
      'KPIs, hallazgos del periodo y estado de cumplimiento cruzado Agro + Alicón.',
    formats: ['pdf', 'csv'],
    audience: 'Gerencia / Ambiente',
    theme: 'dashboard',
  },
  {
    id: 'mapa',
    title: 'Mapa · Riesgo por sitio',
    description:
      'Overlay de riesgo georreferenciado: obligaciones, CAPA, excedencias e incidentes.',
    formats: ['pdf', 'csv'],
    audience: 'Gerencia / Ambiente',
    theme: 'dashboard',
  },
  {
    id: 'monitoreoVivo',
    title: 'Monitoreo en vivo',
    description:
      'Snapshot de estaciones Kunak: calidad de aire, ruido y alertas por planta.',
    formats: ['pdf', 'csv'],
    audience: 'Operaciones / Ambiente',
    theme: 'umbrales',
  },
  {
    id: 'analista',
    title: 'Briefing Semanal',
    description:
      'Briefing predictivo: señales, KPIs de riesgo y borrador ejecutivo.',
    formats: ['pdf', 'csv'],
    audience: 'Gerencia / Ambiente',
    theme: 'analista',
  },
  // —— Operaciones ——
  {
    id: 'resumenOperaciones',
    title: 'Resumen de operaciones',
    description:
      'Vista consolidada de módulos operativos: agua, residuos, inspecciones, NDA y más.',
    formats: ['pdf', 'csv'],
    audience: 'Operaciones / Ambiente',
    theme: 'dashboard',
  },
  {
    id: 'monitoreo',
    title: 'Monitoreos de cumplimiento / control',
    description:
      'Campañas de muestreo Agro: parámetros, cumplimiento de límites y puntos.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Laboratorio',
    theme: 'umbrales',
  },
  {
    id: 'inspecciones',
    title: 'Inspección ambiental',
    description:
      'Inspecciones Agro + Alicón + Descarga de barcos: hallazgos y nivel de riesgo.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Operaciones',
    theme: 'capa',
  },
  {
    id: 'incidentes',
    title: 'Incidentes ambientales',
    description: 'Incidentes Agroprogreso + Planta Alicón consolidados.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / SSO',
    theme: 'incidentes',
  },
  {
    id: 'residuos',
    title: 'Gestión de residuos',
    description: 'Registros de residuos por sede, clasificación y ruta.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente',
    theme: 'residuos',
  },
  {
    id: 'agua',
    title: 'Consumo de agua',
    description: 'Consumos por finca/sitio en formato tabular.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente',
    theme: 'agua',
  },
  {
    id: 'compostaje',
    title: 'Compostaje',
    description: 'Toneladas de desechos orgánicos compostados por finca y mes.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Operaciones',
    theme: 'circularidad',
  },
  {
    id: 'ndaCascoVerde',
    title: 'Inspecciones casco verde',
    description:
      'Notas de inspección Casco Verde (desde NDA General), hallazgos y sedes.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / SSO',
    theme: 'capa',
  },
  {
    id: 'ndaGeneral',
    title: 'NDA General',
    description:
      'Índice NDA consolidado por sede (IDA, Casco Verde, incidentes, compromisos).',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Gerencia',
    theme: 'dashboard',
  },
  {
    id: 'capacitaciones',
    title: 'Capacitaciones',
    description:
      'Programa de capacitaciones ambientales: ejecutado, programado y reprogramado.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / RRHH',
    theme: 'metas',
  },
  // —— Cumplimiento Legal ——
  {
    id: 'resumenCumplimiento',
    title: 'Resumen de cumplimiento',
    description:
      'Cumplimiento Legal: compromisos ambientales, licencias al día, CAPA y trámites.',
    formats: ['pdf', 'csv'],
    audience: 'Gerencia / Auditoría',
    theme: 'cumplimiento',
  },
  {
    id: 'compromisos',
    title: 'Compromisos ambientales',
    description:
      'Portafolio de compromisos: avance, criticidad, vencimientos y responsables.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Operaciones',
    theme: 'capa',
  },
  {
    id: 'capa',
    title: 'Acciones correctivas (CAPA)',
    description:
      'Acciones correctivas/preventivas, plazos, responsables y tasa de cierre.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Operaciones',
    theme: 'capa',
  },
  {
    id: 'licencias',
    title: 'Licencias ambientales',
    description: 'Catálogo de licencias con vigencia, estado y sede.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente',
    theme: 'licencias',
  },
  {
    id: 'tramites',
    title: 'Gestión de trámites',
    description:
      'Trámites administrativos: estado, prioridad, sede y responsable.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Legal',
    theme: 'cumplimiento',
  },
  {
    id: 'cumplimiento',
    title: 'Cumplimiento legal',
    description:
      'Obligaciones, vencimientos, criticidad y calendario de alertas (90/60/30).',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Auditoría',
    theme: 'cumplimiento',
  },
  {
    id: 'calendarioLegal',
    title: 'Calendario legal ambiental',
    description:
      'Próximos hitos de obligaciones y CAPA con nivel de riesgo por fecha.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Legal',
    theme: 'cumplimiento',
  },
  // —— Sostenibilidad ——
  {
    id: 'indicadores',
    title: 'Indicadores ambientales',
    description:
      'Resumen de sostenibilidad: metas, umbrales, intensidad, circularidad y carbono.',
    formats: ['pdf', 'csv'],
    audience: 'Sostenibilidad / Gerencia',
    theme: 'metas',
  },
  {
    id: 'metas',
    title: 'Metas / KPIs',
    description:
      'Portafolio de metas ambientales con avance, riesgo y responsables.',
    formats: ['pdf', 'csv'],
    audience: 'Gerencia / Ambiente',
    theme: 'metas',
  },
  {
    id: 'umbrales',
    title: 'Umbrales de monitoreo',
    description:
      'Catálogo de límites y excedencias automáticas de monitoreos Agro.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Laboratorio',
    theme: 'umbrales',
  },
  {
    id: 'intensidad',
    title: 'Intensidad ambiental',
    description:
      'Intensidad operativa Alicón (kg CO₂e/t proxy) y escenarios qué-pasa-si.',
    formats: ['pdf', 'csv'],
    audience: 'Sostenibilidad / Gerencia',
    theme: 'intensidad',
  },
  {
    id: 'circularidad',
    title: 'Circularidad',
    description:
      'Flujos de valorización, manifiestos, gestores y tasa de aprovechamiento.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente',
    theme: 'circularidad',
  },
  {
    id: 'carbono',
    title: 'Huella de carbono',
    description: 'Resumen de producción, energía y totales de la campaña activa.',
    formats: ['pdf', 'csv'],
    audience: 'Sostenibilidad',
    theme: 'carbono',
  },
  // —— Documentos ——
  {
    id: 'centroDocumental',
    title: 'Centro documental',
    description:
      'Resumen del repositorio: expedientes por tema/tipo y packs de evidencia.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Auditoría',
    theme: 'expedientes',
  },
  {
    id: 'expedientes',
    title: 'Expedientes',
    description:
      'Repositorio documental por sitio/tema con ligue a módulos operativos.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Auditoría',
    theme: 'expedientes',
  },
  {
    id: 'biblioteca',
    title: 'Biblioteca',
    description:
      'Catálogo de documentos de conocimiento (normativa, guías, SOP) para el copiloto.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Administración',
    theme: 'expedientes',
  },
]

function todayLabel(): string {
  return new Date().toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function runExportPack(
  packId: ExportPackId,
  format: 'pdf' | 'csv',
): Promise<void> {
  switch (packId) {
    case 'dashboard':
      return exportDashboard(format)
    case 'mapa':
      return exportMapa(format)
    case 'monitoreoVivo':
      return exportMonitoreoVivo(format)
    case 'analista':
      return exportAnalista(format)
    case 'resumenOperaciones':
      return exportResumenOperaciones(format)
    case 'monitoreo':
      return exportMonitoreo(format)
    case 'inspecciones':
      return exportInspecciones(format)
    case 'incidentes':
      return exportIncidentes(format)
    case 'residuos':
      return exportResiduos(format)
    case 'agua':
      return exportAgua(format)
    case 'compostaje':
      return exportCompostaje(format)
    case 'ndaCascoVerde':
      return exportNdaCascoVerde(format)
    case 'ndaGeneral':
      return exportNdaGeneral(format)
    case 'capacitaciones':
      return exportCapacitaciones(format)
    case 'resumenCumplimiento':
      return exportResumenCumplimiento(format)
    case 'compromisos':
      return exportCompromisos(format)
    case 'capa':
      return exportCapa(format)
    case 'licencias':
      return exportLicencias(format)
    case 'tramites':
      return exportTramites(format)
    case 'cumplimiento':
      return exportCumplimiento(format)
    case 'calendarioLegal':
      return exportCalendarioLegal(format)
    case 'indicadores':
      return exportIndicadores(format)
    case 'metas':
      return exportMetas(format)
    case 'umbrales':
      return exportUmbrales(format)
    case 'intensidad':
      return exportIntensidad(format)
    case 'circularidad':
      return exportCircularidad(format)
    case 'carbono':
      return exportCarbono(format)
    case 'centroDocumental':
      return exportCentroDocumental(format)
    case 'expedientes':
      return exportExpedientes(format)
    case 'biblioteca':
      return exportBiblioteca(format)
    default:
      throw new Error(`Pack desconocido: ${packId}`)
  }
}

async function exportDashboard(format: 'pdf' | 'csv') {
  const summary: DashboardSummary = await loadDashboardSummary()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('resumen_ejecutivo_kpis', 'csv'),
      ['KPI', 'Valor', 'Unidad', 'Hint'],
      summary.kpis.map((k) => [k.label, k.value, k.unit, k.hint]),
    )
    return
  }

  downloadReportPdf({
    title: 'Resumen ejecutivo ambiental',
    subtitle: `Generado ${todayLabel()} · ${summary.modulesLoaded} módulos cargados`,
    footer: 'Cementos Progreso Ambiente · Resumen ejecutivo',
    filename: stampFilename('resumen_ejecutivo', 'pdf'),
    theme: 'dashboard',
    kpis: summary.kpis.slice(0, 4).map((k) => ({
      label: k.label,
      value: k.unit ? `${k.value} ${k.unit}` : k.value,
    })),
    sections: [
      {
        heading: 'Hallazgos del periodo',
        lines: summary.insights.map(
          (i) => `[${i.level}] ${i.title}: ${i.text}`,
        ),
      },
      {
        heading: 'Cumplimiento operativo',
        lines: [
          `Incidentes abiertos: ${summary.compliance.incidentes.abiertos} / ${summary.compliance.incidentes.total}`,
          `Inspecciones: ${summary.compliance.inspecciones.total} · nota prom. ${summary.compliance.inspecciones.avgScore ?? '—'}`,
          `Licencias vigentes: ${summary.compliance.licencias.vigentes} · por vencer: ${summary.compliance.licencias.proximoVencer}`,
          `Monitoreos cumple: ${summary.compliance.monitoreosCumplePct ?? '—'}% · NDA avg: ${summary.compliance.ndaAvg ?? '—'}`,
        ],
      },
      ...(summary.modulesFailed.length
        ? [
            {
              heading: 'Módulos con fallo de carga',
              lines: summary.modulesFailed,
            },
          ]
        : []),
    ],
  })
}

async function exportCumplimiento(format: 'pdf' | 'csv') {
  const rows = await loadCumplimiento()
  const report = buildCumplimientoReport(rows)

  if (format === 'csv') {
    downloadCsv(
      stampFilename('cumplimiento_obligaciones', 'csv'),
      [
        'Código',
        'Unidad',
        'Sitio',
        'Tipo',
        'Título',
        'Autoridad',
        'Expediente',
        'Responsable',
        'Criticidad',
        'Estado',
        'Estado derivado',
        'Inicio',
        'Vencimiento',
        'Días',
        'Riesgo',
        'Origen',
      ],
      report.detailRows.map((r) => [
        r.codigo,
        r.unidadNegocio,
        r.sitio,
        r.tipoObligacion,
        r.titulo,
        r.autoridad,
        r.expediente,
        r.responsable,
        r.criticidad,
        r.estado,
        r.estadoDerivado,
        r.fechaInicio,
        r.fechaVencimiento,
        r.days,
        r.risk,
        r.origen,
      ]),
    )
    return
  }

  downloadReportPdf({
    title: 'Cumplimiento legal ambiental',
    subtitle: `Portafolio de obligaciones · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Compliance Hub',
    filename: stampFilename('cumplimiento_legal', 'pdf'),
    theme: 'cumplimiento',
    kpis: report.kpis.map((k) => ({ label: k.label, value: k.value })),
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`),
      },
      {
        heading: 'Calendario (próximos 120 días)',
        lines: report.calendar.length
          ? report.calendar.map(
              (c) =>
                `${formatCumplDate(c.fecha)} · ${c.titulo} (${c.sitio}) · ${c.days}d · ${c.estado}`,
            )
          : ['Sin vencimientos en los próximos 120 días'],
      },
      {
        heading: 'Detalle (primeras 25)',
        lines: report.detailRows.slice(0, 25).map(
          (r) =>
            `${r.codigo || '—'} | ${r.titulo} | ${r.sitio} | vence ${formatCumplDate(r.fechaVencimiento)} | ${r.estadoDerivado}`,
        ),
      },
    ],
  })
}

async function exportCapa(format: 'pdf' | 'csv') {
  const rows = await loadCapas()
  const report = buildCapaReport(rows)

  if (format === 'csv') {
    downloadCsv(
      stampFilename('capa_acciones', 'csv'),
      [
        'Código',
        'Unidad',
        'Sitio',
        'Tipo',
        'Origen',
        'Ref origen',
        'Hallazgo',
        'Acción',
        'Responsable',
        'Prioridad',
        'Estado',
        'Apertura',
        'Compromiso',
        'Cierre',
        'Riesgo',
        'Eficacia',
      ],
      report.detailRows.map((r) => [
        r.codigo,
        r.unidadNegocio,
        r.sitio,
        r.tipoAccion,
        r.origenTipo,
        r.origenRef,
        r.hallazgo,
        r.accion,
        r.responsable,
        r.prioridad,
        r.estado,
        r.fechaApertura,
        r.fechaCompromiso,
        r.fechaCierre,
        r.risk,
        r.eficacia,
      ]),
    )
    return
  }

  downloadReportPdf({
    title: 'Gestión CAPA ambiental',
    subtitle: `Acciones correctivas y preventivas · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · CAPA',
    filename: stampFilename('capa_ambiental', 'pdf'),
    theme: 'capa',
    kpis: report.kpis.map((k) => ({ label: k.label, value: k.value })),
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`),
      },
      {
        heading: 'Acciones abiertas / críticas',
        lines: report.detailRows
          .filter((r) => r.risk === 'vencida' || r.risk === 'critica' || !/cerrad|cancelad/i.test(r.estado))
          .slice(0, 25)
          .map(
            (r) =>
              `${r.codigo || '—'} | ${r.tipoAccion} | ${r.hallazgo.slice(0, 80)} | resp. ${r.responsable || '—'} | compromiso ${formatCapaDate(r.fechaCompromiso)} | ${r.estado}`,
          ),
      },
    ],
  })
}

async function exportMetas(format: 'pdf' | 'csv') {
  const rows = await loadMetas()
  const report = buildMetasReport(rows)

  if (format === 'csv') {
    downloadCsv(
      stampFilename('metas_ambientales', 'csv'),
      [
        'Código',
        'Indicador',
        'Categoría',
        'Unidad',
        'Sitio',
        'Meta',
        'Actual',
        'Unidad medida',
        'Sentido',
        'Año',
        'Avance %',
        'Estado',
        'Riesgo',
        'Responsable',
      ],
      report.detailRows.map((r) => [
        r.codigo,
        r.indicador,
        r.categoria,
        r.unidadNegocio,
        r.sitio,
        r.metaValor,
        r.valorActual,
        r.unidadMedida,
        r.sentido,
        r.periodoAnio,
        r.progress,
        r.estadoDerivado,
        r.risk,
        r.responsable,
      ]),
    )
    return
  }

  downloadReportPdf({
    title: 'Metas y KPIs ambientales',
    subtitle: `Portafolio de indicadores · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Metas',
    filename: stampFilename('metas_ambientales', 'pdf'),
    theme: 'metas',
    kpis: report.kpis.map((k) => ({ label: k.label, value: k.value })),
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`),
      },
      {
        heading: 'Metas prioritarias',
        lines: report.detailRows.slice(0, 25).map(
          (r) =>
            `${r.codigo || '—'} | ${r.indicador} | avance ${r.progress ?? '—'}% | ${r.estadoDerivado} | ${r.sitio || '—'}`,
        ),
      },
    ],
  })
}

async function exportUmbrales(format: 'pdf' | 'csv') {
  const [umbrales, monitoreos] = await Promise.all([
    loadUmbrales(),
    loadAgroMonitoreos(),
  ])
  const report = buildUmbralesReport(umbrales, monitoreos)

  if (format === 'csv') {
    downloadCsv(
      stampFilename('umbrales_excedencias', 'csv'),
      [
        'Fecha',
        'Sede',
        'Punto',
        'Parámetro',
        'Resultado',
        'Umbral',
        'Criticidad',
      ],
      report.excedencias.map((r) => [
        r.fecha,
        r.sede,
        r.punto,
        r.parametro,
        r.resultado,
        r.umbral,
        r.criticidad,
      ]),
    )
    return
  }

  downloadReportPdf({
    title: 'Umbrales de monitoreo',
    subtitle: `Evaluación automática · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Umbrales',
    filename: stampFilename('umbrales_monitoreo', 'pdf'),
    theme: 'umbrales',
    kpis: report.kpis.map((k) => ({ label: k.label, value: k.value })),
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`),
      },
      {
        heading: 'Excedencias',
        lines: report.excedencias.slice(0, 30).map(
          (e) =>
            `${e.fecha} | ${e.sede} | ${e.parametro}: ${e.resultado} (límite ${e.umbral}) | ${e.criticidad}`,
        ),
      },
    ],
  })
}

async function exportIntensidad(format: 'pdf' | 'csv') {
  const escenarios = await loadEscenarios()
  let carbon = null
  try {
    const camp = await loadCarbonCampaign()
    carbon = buildCarbonReport(camp.state)
  } catch {
    carbon = null
  }
  const report = buildIntensidadReport(carbon, escenarios)

  if (format === 'csv') {
    downloadCsv(
      stampFilename('intensidad_escenarios', 'csv'),
      [
        'Código',
        'Escenario',
        'Estado',
        'Intensidad kg/t',
        'Delta %',
        'kWh/t',
        'gal/t',
        'Cumple meta',
      ],
      report.scenarios.map((s) => [
        s.codigo,
        s.escenarioNombre,
        s.estado,
        s.intensidadKgT,
        s.deltaVsBasePct,
        s.avgKwhPerTon,
        s.avgGalPerTon,
        s.cumpleMeta == null ? '—' : s.cumpleMeta ? 'Sí' : 'No',
      ]),
    )
    return
  }

  downloadReportPdf({
    title: 'Intensidad de carbono y escenarios',
    subtitle: `Alicón · ${todayLabel()} · base ${report.baseline.intensidadKgT ?? '—'} kg CO2e/t`,
    footer: 'Cementos Progreso Ambiente · Intensidad',
    filename: stampFilename('intensidad_escenarios', 'pdf'),
    theme: 'intensidad',
    kpis: report.kpis.map((k) => ({ label: k.label, value: k.value })),
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`),
      },
      {
        heading: 'Escenarios proyectados',
        lines: report.scenarios.slice(0, 20).map(
          (s) =>
            `${s.codigo || '—'} | ${s.escenarioNombre} | ${s.intensidadKgT ?? '—'} kg/t | delta ${s.deltaVsBasePct ?? '—'}% | ${s.estado}`,
        ),
      },
    ],
  })
}

async function exportCircularidad(format: 'pdf' | 'csv') {
  const [flujos, agro] = await Promise.all([
    loadCircularidad(),
    loadAgroResiduos().catch(() => []),
  ])
  const report = buildCircularidadReport(flujos, agro)

  if (format === 'csv') {
    downloadCsv(
      stampFilename('circularidad_flujos', 'csv'),
      [
        'Código',
        'Sede',
        'Tipo',
        'Clasificación',
        'Ruta',
        'Gestor',
        'Manifiesto',
        'Lbs',
        'Costo GTQ',
        'Fecha',
        'Valorizado',
        'Estado',
      ],
      report.detailRows.map((r) => [
        r.codigo,
        r.sede,
        r.tipoResiduo,
        r.clasificacion,
        r.ruta,
        r.gestor,
        r.manifiesto,
        r.cantidadLbs,
        r.costoGtq,
        r.fecha,
        r.valorizado ? 'Sí' : 'No',
        r.estado,
      ]),
    )
    return
  }

  downloadReportPdf({
    title: 'Circularidad y valorización',
    subtitle: `Flujos y manifiestos · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Circularidad',
    filename: stampFilename('circularidad', 'pdf'),
    theme: 'circularidad',
    kpis: report.kpis.map((k) => ({ label: k.label, value: k.value })),
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`),
      },
      {
        heading: 'Flujos recientes',
        lines: report.detailRows.slice(0, 25).map(
          (r) =>
            `${r.codigo || '—'} | ${r.sede} | ${r.ruta} | ${r.cantidadLbs ?? '—'} lbs | ${r.gestor || '—'} | ${r.estado}`,
        ),
      },
    ],
  })
}

async function exportExpedientes(format: 'pdf' | 'csv') {
  const rows = await loadExpedientes()
  const report = buildExpedientesReport(rows)

  if (format === 'csv') {
    downloadCsv(
      stampFilename('expedientes_ambientales', 'csv'),
      [
        'Código',
        'Título',
        'Sitio',
        'Tema',
        'Tipo',
        'Versión',
        'Fecha',
        'Estado',
        'Módulo',
        'Ref',
        'URL',
      ],
      report.detailRows.map((r) => [
        r.codigo,
        r.titulo,
        r.sitio,
        r.tema,
        r.tipoDocumento,
        r.version,
        r.fechaDocumento,
        r.estado,
        r.moduloLigado,
        r.refLigada,
        r.archivoUrl,
      ]),
    )
    return
  }

  downloadReportPdf({
    title: 'Expedientes ambientales',
    subtitle: `Repositorio documental · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Expedientes',
    filename: stampFilename('expedientes', 'pdf'),
    theme: 'expedientes',
    kpis: report.kpis.map((k) => ({ label: k.label, value: k.value })),
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`),
      },
      {
        heading: 'Expedientes',
        lines: report.detailRows.slice(0, 30).map(
          (r) =>
            `${r.codigo || '—'} | ${r.titulo} | ${r.sitio} | ${r.tema} | v${r.version} | ${formatExpDate(r.fechaDocumento)} | ${r.estado}`,
        ),
      },
    ],
  })
}

async function exportAnalista(format: 'pdf' | 'csv') {
  const [live, briefings] = await Promise.all([
    computeLiveAnalistaReport(),
    loadBriefings(),
  ])
  const latest =
    briefings.find((b) => b.semanaInicio === live.semanaInicio) ?? briefings[0]
  const signals = latest?.signals?.length ? latest.signals : live.signals
  const kpis = latest?.kpis ?? live.kpis

  if (format === 'csv') {
    downloadCsv(
      stampFilename('analista_briefing', 'csv'),
      ['Nivel', 'Categoría', 'Título', 'Detalle', 'Enlace', 'Score'],
      signals.map((s) => [
        s.level,
        CATEGORY_LABEL[s.category],
        s.title,
        s.text,
        s.href ?? '',
        s.score,
      ]),
    )
    return
  }

  downloadReportPdf({
    title: 'Briefing ambiental semanal',
    subtitle: `Cementos Progreso · ${live.weekLabel} · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Uso interno gerencial',
    filename: stampFilename('analista_semanal', 'pdf'),
    theme: 'analista',
    kpis: [
      { label: 'Críticos', value: formatAnalistaNum(kpis.criticos) },
      { label: 'Atención', value: formatAnalistaNum(kpis.atencion) },
      { label: 'Vencimientos', value: formatAnalistaNum(kpis.vencimientos) },
      { label: 'Metas en riesgo', value: formatAnalistaNum(kpis.metasRiesgo) },
    ],
    sections: [
      {
        heading: 'Resumen ejecutivo',
        style: 'bullets',
        lines: (latest?.resumen || live.resumen || 'Sin hallazgos relevantes')
          .split('\n')
          .map((l) => l.replace(/^[•\-*]\s*/, '').trim())
          .filter(Boolean),
      },
      {
        heading: 'Hallazgos prioritarios',
        style: 'bullets',
        lines: signals.slice(0, 12).map((s) => {
          return `**${s.level}** · ${s.title}: ${s.text}`
        }),
      },
      {
        heading: 'Proyección / forecast',
        style: 'bullets',
        lines: live.forecastLines.length
          ? live.forecastLines
          : ['Sin proyección adicional en esta ventana.'],
      },
      {
        heading: 'Comunicado para gerencia',
        style: 'markdown',
        body:
          latest?.borradorMd?.trim() ||
          'Aun no hay borrador generado. En Briefing Semanal use "Generar borrador" y vuelva a exportar.',
      },
    ],
  })
}

async function exportLicencias(format: 'pdf' | 'csv') {
  const rows = await loadAgroLicencias()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('licencias_agro', 'csv'),
      [
        'Sede',
        'Licencia',
        'Expediente',
        'Categoría',
        'Vigencia',
        'Inicio',
        'Fin',
        'Estado',
      ],
      rows.map((r) => [
        r.plantaSede,
        r.licencia,
        r.expediente,
        r.categoria,
        r.vigencia,
        r.vigenciaInicio,
        r.vigenciaFin,
        r.estado,
      ]),
    )
    return
  }

  downloadReportPdf({
    title: 'Licencias ambientales Agroprogreso',
    subtitle: `${rows.length} registro(s) · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Licencias',
    filename: stampFilename('licencias_agro', 'pdf'),
    theme: 'licencias',
    kpis: [
      { label: 'Total', value: String(rows.length) },
      {
        label: 'Vigentes',
        value: String(rows.filter((r) => /vigente/i.test(r.estado)).length),
      },
      {
        label: 'En proceso',
        value: String(rows.filter((r) => /proceso/i.test(r.estado)).length),
      },
      {
        label: 'Con fin',
        value: String(rows.filter((r) => r.vigenciaFin).length),
      },
    ],
    sections: [
      {
        heading: 'Catálogo',
        lines: rows.slice(0, 40).map(
          (r) =>
            `${r.plantaSede} · ${r.licencia || '—'} · exp ${r.expediente || '—'} · ${r.estado} · fin ${r.vigenciaFin || '—'}`,
        ),
      },
    ],
  })
}

async function exportIncidentes(format: 'pdf' | 'csv') {
  const [agro, alicon] = await Promise.all([
    loadAgroIncidentes(),
    loadAliconIncidentes(),
  ])
  const merged = [
    ...agro.map((r) => ({ ...r, unidad: 'Agroprogreso' as const })),
    ...alicon.map((r) => ({ ...r, unidad: 'Planta Alicón' as const })),
  ]

  if (format === 'csv') {
    downloadCsv(
      stampFilename('incidentes_ambientales', 'csv'),
      [
        'Unidad',
        'Fecha',
        'Sede',
        'Descripción',
        'Estado',
        'Valor',
        'Instrumento',
      ],
      merged.map((r) => [
        r.unidad,
        r.fecha,
        r.plantaSede,
        r.descripcion,
        r.estado,
        r.valorIncidente,
        r.instrumento,
      ]),
    )
    return
  }

  const abiertos = merged.filter((r) =>
    /abiert|proceso|pendiente/i.test(r.estado),
  ).length
  downloadReportPdf({
    title: 'Incidentes ambientales',
    subtitle: `Agro + Alicón · ${merged.length} registro(s) · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Incidentes',
    filename: stampFilename('incidentes_ambientales', 'pdf'),
    theme: 'incidentes',
    kpis: [
      { label: 'Total', value: String(merged.length) },
      { label: 'Abiertos', value: String(abiertos) },
      { label: 'Agro', value: String(agro.length) },
      { label: 'Alicón', value: String(alicon.length) },
    ],
    sections: [
      {
        heading: 'Registros recientes',
        lines: merged.slice(0, 35).map(
          (r) =>
            `${r.fecha} · ${r.unidad} · ${r.plantaSede} · ${r.descripcion.slice(0, 90)} · ${r.estado}`,
        ),
      },
    ],
  })
}

async function exportResiduos(format: 'pdf' | 'csv') {
  const rows = await loadAgroResiduos()

  if (format === 'csv') {
    downloadCsv(
      stampFilename('residuos_agro', 'csv'),
      [
        'Fecha',
        'Sede',
        'Tipo',
        'Clasificación operativa',
        'Clasificación técnica',
        'Ruta',
        'Cantidad lbs',
      ],
      rows.map((r) => [
        r.fecha,
        r.sede,
        r.tipoResiduos,
        r.clasificacionOperativa,
        r.clasificacionTecnica,
        r.rutaGestion,
        r.cantidadLbs,
      ]),
    )
    return
  }

  const year = preferredYear(residuosYears(rows))
  const report = buildAgroResiduosReport(rows, year)
  downloadReportPdf({
    title: 'Gestión de residuos · Agroprogreso',
    subtitle: `${report.meta.periodLabel} · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Residuos Agro',
    filename: stampFilename('residuos_agro', 'pdf'),
    theme: 'residuos',
    kpis: report.kpis.slice(0, 4).map((k) => ({
      label: k.label,
      value: k.unit ? `${k.value} ${k.unit}` : k.value,
    })),
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.length
          ? report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`)
          : ['Sin alertas en el periodo'],
      },
      {
        heading: 'Por sede',
        lines: report.sedeShare.length
          ? report.sedeShare.map((s) => {
              const pct =
                report.totals.positiveLbs > 0
                  ? (s.value / report.totals.positiveLbs) * 100
                  : 0
              return `${s.name}: ${s.value.toLocaleString('es-GT')} lbs (${pct.toFixed(1)}%)`
            })
          : ['Sin datos por sede'],
      },
      {
        heading: 'Por ruta de gestión',
        lines: report.rutaShare.length
          ? report.rutaShare.map((s) => {
              const pct =
                report.totals.positiveLbs > 0
                  ? (s.value / report.totals.positiveLbs) * 100
                  : 0
              return `${s.name}: ${s.value.toLocaleString('es-GT')} lbs (${pct.toFixed(1)}%)`
            })
          : ['Sin datos de ruta'],
      },
      {
        heading: 'Detalle (primeras 35 filas con cantidad)',
        lines: report.detailRows
          .filter((r) => r.cantidad != null && r.cantidad !== 0)
          .slice(0, 35)
          .map(
            (r) =>
              `${r.fecha} · ${r.sede} · ${r.tipo || r.operativa} · ${r.cantidad?.toLocaleString('es-GT') ?? '—'} lbs · ${r.ruta || '—'}`,
          ),
      },
    ],
  })
}

async function exportAgua(format: 'pdf' | 'csv') {
  const rows = await loadAgroConsumoAgua()

  if (format === 'csv') {
    downloadCsv(
      stampFilename('consumo_agua_agro', 'csv'),
      ['Fecha', 'Sede', 'Sitio de consumo', 'Consumo m3'],
      rows.map((r) => [r.fecha, r.sede, r.sitioConsumo, r.consumoM3]),
    )
    return
  }

  const year = preferredYear(aguaYears(rows))
  const report = buildAgroAguaReport(rows, year)
  const pdfKpis = report.kpis.slice(0, 4).map((k) => {
    // Solo agua: número como valor (corto) y nombre en etiqueta, para no desbordar la caja original
    if (k.id === 'sede') {
      return {
        label: `Sede · ${k.value}`,
        value: k.unit || '—',
      }
    }
    if (k.id === 'sitio') {
      const shortName =
        (k.value || '—').length > 22
          ? `${k.value.slice(0, 20)}…`
          : k.value || '—'
      return {
        label: shortName,
        value: k.unit || '—',
      }
    }
    return {
      label: k.label,
      value: k.unit ? `${k.value} ${k.unit}` : k.value,
    }
  })
  downloadReportPdf({
    title: 'Consumo de agua · Agroprogreso',
    subtitle: `${report.meta.periodLabel} · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Agua Agro',
    filename: stampFilename('consumo_agua_agro', 'pdf'),
    theme: 'agua',
    kpis: pdfKpis,
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.length
          ? report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`)
          : ['Sin alertas en el periodo'],
      },
      {
        heading: 'Por sede',
        lines: report.sedeShare.length
          ? report.sedeShare.map((s) => {
              const pct =
                report.totals.totalM3 > 0
                  ? (s.value / report.totals.totalM3) * 100
                  : 0
              return `${s.name}: ${s.value.toLocaleString('es-GT')} m³ (${pct.toFixed(1)}%)`
            })
          : ['Sin datos por sede'],
      },
      {
        heading: 'Sitios con mayor consumo',
        lines: report.sitioRanking.length
          ? report.sitioRanking.slice(0, 15).map(
              (s) =>
                `${s.name}: ${s.value.toLocaleString('es-GT')} m³`,
            )
          : ['Sin ranking de sitios'],
      },
      {
        heading: 'Detalle (primeras 35 filas con consumo)',
        lines: report.detailRows
          .filter((r) => r.consumo != null && r.consumo !== 0)
          .slice(0, 35)
          .map(
            (r) =>
              `${r.fecha} · ${r.sede} · ${r.sitio} · ${r.consumo.toLocaleString('es-GT')} m³`,
          ),
      },
    ],
  })
}

async function exportCarbono(format: 'pdf' | 'csv') {
  const campaign = await loadCarbonCampaign()
  const report = buildCarbonReport(campaign.state)

  if (format === 'csv') {
    downloadCsv(
      stampFilename('huella_carbono_alicon', 'csv'),
      ['Mes', 'Cemento t', 'Clinker consumo t', 'Electricidad kWh', 'Agua m3'],
      report.monthlyProduction.map((m, i) => [
        m.monthFull,
        m.total,
        m.clinkerConsumo,
        report.monthlyElectricity[i]?.total ?? '',
        report.monthlyWater[i]?.total ?? '',
      ]),
    )
    return
  }

  const period = report.meta.periodLabel || String(campaign.ref.year)
  downloadReportPdf({
    title: 'Huella de carbono · Planta Alicón',
    subtitle: `${period} · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Huella de carbono',
    filename: stampFilename('huella_carbono_alicon', 'pdf'),
    theme: 'carbono',
    kpis: [
      {
        label: 'Cemento',
        value: `${Math.round(report.totals.totalCement).toLocaleString('es-GT')} t`,
      },
      {
        label: 'Factor clinker',
        value:
          report.totals.avgFactorPlanta != null
            ? `${report.totals.avgFactorPlanta.toFixed(1)}%`
            : '—',
      },
      {
        label: 'Electricidad',
        value: `${Math.round(report.totals.totalElec / 1000).toLocaleString('es-GT')} MWh`,
      },
      {
        label: 'Agua',
        value: `${Math.round(report.totals.totalWater).toLocaleString('es-GT')} m³`,
      },
    ],
    sections: [
      {
        heading: 'Totales de campaña',
        lines: [
          `Periodo: ${period}`,
          `Producción cemento: ${report.totals.totalCement.toLocaleString('es-GT')} t`,
          `Electricidad: ${report.totals.totalElec.toLocaleString('es-GT')} kWh`,
          `Agua: ${report.totals.totalWater.toLocaleString('es-GT')} m³`,
        ],
      },
      {
        heading: 'Insights',
        lines: report.insights
          .slice(0, 8)
          .map((i) => `[${i.level}] ${i.title}: ${i.text}`),
      },
    ],
  })
}

async function exportMapa(format: 'pdf' | 'csv') {
  const cards = await loadSiteRiskOverlay()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('mapa_riesgo_sitios', 'csv'),
      [
        'Sitio',
        'Nivel',
        'Score',
        'Oblig. críticas',
        'CAPA vencidas',
        'Excedencias',
        'Incidentes abiertos',
        'Metas en riesgo',
        'Headline',
      ],
      cards.map((c) => [
        c.name,
        c.level,
        c.score,
        c.signals.obligacionesCriticas,
        c.signals.capaVencidas,
        c.signals.excedenciasMonitoreo,
        c.signals.incidentesAbiertos,
        c.signals.metasEnRiesgo,
        c.headlines[0] ?? '',
      ]),
    )
    return
  }
  const criticos = cards.filter((c) => c.level === 'critico').length
  const atencion = cards.filter((c) => c.level === 'atencion').length
  downloadReportPdf({
    title: 'Mapa · Riesgo por sitio',
    subtitle: `${cards.length} sitio(s) · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Mapa de riesgo',
    filename: stampFilename('mapa_riesgo_sitios', 'pdf'),
    theme: 'dashboard',
    kpis: [
      { label: 'Sitios', value: String(cards.length) },
      { label: 'Críticos', value: String(criticos) },
      { label: 'Atención', value: String(atencion) },
      {
        label: 'OK',
        value: String(cards.filter((c) => c.level === 'ok').length),
      },
    ],
    sections: [
      {
        heading: 'Sitios priorizados',
        lines: [...cards]
          .sort((a, b) => b.score - a.score)
          .slice(0, 35)
          .map(
            (c) =>
              `[${c.level}] ${c.name} · score ${c.score} · ${c.headlines[0] ?? 'Sin hallazgo'}`,
          ),
      },
    ],
  })
}

async function exportMonitoreoVivo(format: 'pdf' | 'csv') {
  const snap = buildLiveMonitoringSnapshot()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('monitoreo_en_vivo', 'csv'),
      [
        'Estación',
        'Planta',
        'Zona',
        'Estado',
        'PM2.5',
        'PM10',
        'Ruido dBA',
        'CO2',
        'Temp °C',
        'HR %',
      ],
      snap.stations.map((s) => [
        s.id,
        s.plant,
        s.zone,
        s.status,
        s.reading.pm25,
        s.reading.pm10,
        s.reading.noise,
        s.reading.co2,
        s.reading.temperature,
        s.reading.humidity,
      ]),
    )
    return
  }
  downloadReportPdf({
    title: 'Monitoreo en vivo · Kunak',
    subtitle: `Snapshot ${snap.generatedAt.toLocaleString('es-GT')} · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Monitoreo en vivo',
    filename: stampFilename('monitoreo_en_vivo', 'pdf'),
    theme: 'umbrales',
    kpis: [
      {
        label: 'Online',
        value: `${snap.kpis.online}/${snap.kpis.total}`,
      },
      { label: 'PM2.5 prom.', value: String(snap.kpis.avgPm25) },
      { label: 'Ruido prom.', value: `${snap.kpis.avgNoise} dBA` },
      { label: 'Excedencias', value: String(snap.kpis.exceedances) },
    ],
    sections: [
      {
        heading: 'Alertas',
        lines: snap.alerts.length
          ? snap.alerts
              .slice(0, 20)
              .map((a) => `[${a.level}] ${a.stationId}: ${a.title} — ${a.text}`)
          : ['Sin alertas en el snapshot'],
      },
      {
        heading: 'Estaciones',
        lines: snap.stations.map(
          (s) =>
            `${s.id} · ${s.plant} · ${s.status} · PM2.5 ${s.reading.pm25} · ruido ${s.reading.noise}`,
        ),
      },
    ],
  })
}

async function exportResumenOperaciones(format: 'pdf' | 'csv') {
  const summary = await loadOperacionesSummary()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('resumen_operaciones_kpis', 'csv'),
      ['KPI', 'Valor', 'Unidad', 'Hint'],
      summary.kpis.map((k) => [k.label, k.value, k.unit ?? '', k.hint]),
    )
    return
  }
  downloadReportPdf({
    title: 'Resumen de operaciones',
    subtitle: `${summary.modulesLoaded} módulos · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Operaciones',
    filename: stampFilename('resumen_operaciones', 'pdf'),
    theme: 'dashboard',
    kpis: summary.kpis.slice(0, 4).map((k) => ({
      label: k.label,
      value: k.unit ? `${k.value} ${k.unit}` : k.value,
    })),
    sections: [
      {
        heading: 'Indicadores',
        lines: summary.kpis.map(
          (k) => `${k.label}: ${k.value}${k.unit ? ` ${k.unit}` : ''} — ${k.hint}`,
        ),
      },
      {
        heading: 'Periodos de referencia',
        lines: summary.periodHints.length
          ? summary.periodHints
          : ['Sin periodos registrados'],
      },
      ...(summary.modulesFailed.length
        ? [
            {
              heading: 'Módulos con error de carga',
              lines: summary.modulesFailed,
            },
          ]
        : []),
    ],
  })
}

async function exportMonitoreo(format: 'pdf' | 'csv') {
  const rows = await loadAgroMonitoreos()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('monitoreo_ambiental', 'csv'),
      [
        'Fecha',
        'Sede',
        'Punto',
        'Tipo agua',
        'Parámetro',
        'Resultado',
        'Unidad',
        'Límite',
        'Cumple',
      ],
      rows.map((r) => [
        r.fecha,
        r.plantaSede,
        r.puntoMuestreo,
        r.tipoAgua,
        r.parametro,
        r.resultado,
        r.unidad,
        r.limitePermisible,
        r.cumple,
      ]),
    )
    return
  }
  const year = preferredYear(monitoreoYears(rows))
  const report = buildAgroMonitoreosReport(rows, year)
  downloadReportPdf({
    title: 'Monitoreos de cumplimiento / control',
    subtitle: `${report.meta.periodLabel} · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Monitoreo',
    filename: stampFilename('monitoreo_ambiental', 'pdf'),
    theme: 'umbrales',
    kpis: report.kpis.slice(0, 4).map((k) => ({
      label: k.label,
      value: k.value,
    })),
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.length
          ? report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`)
          : ['Sin alertas'],
      },
      {
        heading: 'Detalle (primeras 35 filas)',
        lines: report.detailRows.slice(0, 35).map(
          (r) =>
            `${r.fecha} · ${r.sede} · ${r.parametro} · ${r.resultado ?? '—'} ${r.unidad} · ${r.cumple}`,
        ),
      },
    ],
  })
}

async function exportInspecciones(format: 'pdf' | 'csv') {
  const [agro, alicon, barcos] = await Promise.all([
    loadAgroInspecciones(),
    loadAliconInspecciones(),
    loadDescargaBarcosInspecciones(),
  ])
  const merged = [
    ...agro.map((r) => ({ ...r, origen: 'Agro' })),
    ...alicon.map((r) => ({ ...r, origen: 'Alicón' })),
    ...barcos.map((r) => ({ ...r, origen: 'Descarga barcos' })),
  ]
  if (format === 'csv') {
    downloadCsv(
      stampFilename('inspecciones_ambientales', 'csv'),
      [
        'Origen',
        'Fecha',
        'Sede',
        'Responsable',
        'Resultado',
        'Hallazgos',
        'Riesgo',
        'Acción inmediata',
      ],
      merged.map((r) => [
        r.origen,
        r.fecha,
        r.plantaSede,
        r.responsable,
        r.resultadoGeneral,
        r.numHallazgos,
        r.nivelRiesgo,
        r.requiereAccionInmediata,
      ]),
    )
    return
  }
  const year = preferredYear(inspeccionYears(merged))
  const report = buildAgroInspeccionReport(merged, year)
  downloadReportPdf({
    title: 'Inspección ambiental',
    subtitle: `Agro + Alicón + Barcos · ${report.meta.periodLabel} · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Inspecciones',
    filename: stampFilename('inspecciones_ambientales', 'pdf'),
    theme: 'capa',
    kpis: [
      {
        label: 'Meta anual',
        value: `${report.goal.realizadas}/${report.goal.metaAnual} (${report.goal.pctAvance}%)`,
      },
      ...report.kpis.slice(1, 4).map((k) => ({
        label: k.label,
        value: k.value,
      })),
    ],
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.length
          ? report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`)
          : ['Sin alertas'],
      },
      {
        heading: 'Ranking por sede',
        lines: report.sedeRanking.slice(0, 15).map(
          (s) =>
            `${s.sede}: ${s.count} insp. · promedio ${s.avgScore == null ? '—' : s.avgScore.toFixed(1)}`,
        ),
      },
      {
        heading: 'Detalle reciente',
        lines: report.detailRows.slice(0, 30).map(
          (r) =>
            `${r.fecha} · ${r.sede} · nota ${r.resultado ?? '—'} · hallazgos ${r.hallazgos ?? 0} · ${r.riesgo || '—'}`,
        ),
      },
    ],
  })
}

async function exportCompostaje(format: 'pdf' | 'csv') {
  const rows = await loadAgroCompostaje()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('compostaje', 'csv'),
      ['Fecha', 'Finca', 'Toneladas'],
      rows.map((r) => [r.fecha, r.finca, r.toneladas]),
    )
    return
  }
  const years = [
    ...new Set(rows.map((r) => Number(r.fecha.slice(0, 4))).filter(Boolean)),
  ].sort((a, b) => b - a)
  const year = preferredYear(years)
  const report = buildAgroCompostajeReport(rows, year)
  downloadReportPdf({
    title: 'Compostaje · Agroprogreso',
    subtitle: `${report.meta.periodLabel} · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Compostaje',
    filename: stampFilename('compostaje', 'pdf'),
    theme: 'circularidad',
    kpis: report.kpis.slice(0, 4).map((k) => ({
      label: k.label,
      value: k.value,
    })),
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.length
          ? report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`)
          : ['Sin alertas'],
      },
      {
        heading: 'Por finca',
        lines: report.byFinca.map(
          (f) => `${f.name}: ${f.value.toLocaleString('es-GT')} t`,
        ),
      },
      {
        heading: 'Detalle',
        lines: report.detailRows
          .filter((r) => r.toneladas != null)
          .slice(0, 35)
          .map(
            (r) =>
              `${r.fecha} · ${r.finca} · ${r.toneladas?.toLocaleString('es-GT') ?? '—'} t`,
          ),
      },
    ],
  })
}

async function exportNdaCascoVerde(format: 'pdf' | 'csv') {
  const rows = await loadAgroNdaCascoVerde()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('nda_casco_verde', 'csv'),
      [
        'Fecha',
        'Sede',
        'Inspector',
        'Nota',
        'Hallazgos críticos',
        'No. inspección',
        'Observaciones',
      ],
      rows.map((r) => [
        r.fecha,
        r.plantaSede,
        r.inspector,
        r.nota,
        r.hallazgosCriticos,
        r.noInspeccion,
        r.observaciones,
      ]),
    )
    return
  }
  const years = [
    ...new Set(rows.map((r) => Number(r.fecha.slice(0, 4))).filter(Boolean)),
  ].sort((a, b) => b - a)
  const report = buildAgroNdaCascoVerdeReport(rows, preferredYear(years))
  downloadReportPdf({
    title: 'Inspecciones casco verde',
    subtitle: `NDA General · ${report.meta.periodLabel} · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Casco Verde',
    filename: stampFilename('nda_casco_verde', 'pdf'),
    theme: 'capa',
    kpis: report.kpis.slice(0, 4).map((k) => ({
      label: k.label,
      value: k.value,
    })),
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.length
          ? report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`)
          : ['Sin alertas'],
      },
      {
        heading: 'Por sede',
        lines: report.bySede.slice(0, 15).map(
          (s) =>
            `${s.sede}: nota ${s.avgNota == null ? '—' : s.avgNota.toFixed(1)} · hallazgos ${s.hallazgos}`,
        ),
      },
      {
        heading: 'Detalle reciente',
        lines: report.detailRows.slice(0, 30).map(
          (r) =>
            `${r.fecha} · ${r.sede} · nota ${r.nota ?? '—'} · hallazgos ${r.hallazgos}`,
        ),
      },
    ],
  })
}

async function exportNdaGeneral(format: 'pdf' | 'csv') {
  const rows = await loadAgroNdaGeneral()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('nda_general', 'csv'),
      [
        'Fecha',
        'Sede',
        'Proyecto',
        'Nota IDA',
        'Casco Verde',
        'Incidentes',
        'Compromisos',
        'NDA',
      ],
      rows.map((r) => [
        r.fecha,
        r.plantaSede,
        r.proyectoMatriz,
        r.notaIda,
        r.cascoVerde,
        r.incidentes,
        r.compromisos,
        r.nda,
      ]),
    )
    return
  }
  const years = [
    ...new Set(rows.map((r) => Number(r.fecha.slice(0, 4))).filter(Boolean)),
  ].sort((a, b) => b - a)
  const report = buildAgroNdaGeneralReport(rows, preferredYear(years))
  downloadReportPdf({
    title: 'NDA General',
    subtitle: `${report.meta.periodLabel} · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · NDA General',
    filename: stampFilename('nda_general', 'pdf'),
    theme: 'dashboard',
    kpis: report.kpis.slice(0, 4).map((k) => ({
      label: k.label,
      value: k.value,
    })),
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.length
          ? report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`)
          : ['Sin alertas'],
      },
      {
        heading: 'Detalle reciente',
        lines: report.detailRows.slice(0, 30).map(
          (r) =>
            `${r.fecha} · ${r.sede} · NDA ${r.nda ?? '—'} · proyecto ${r.proyecto || '—'}`,
        ),
      },
    ],
  })
}

async function exportCapacitaciones(format: 'pdf' | 'csv') {
  const rows = await loadAgroCapacitaciones()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('capacitaciones', 'csv'),
      [
        'Sede',
        'Detalle',
        'Público',
        'Inicio',
        'Fin',
        'Estado',
        'Comentarios',
      ],
      rows.map((r) => [
        r.plantaSede,
        r.detalle,
        r.publicoObjetivo,
        r.fechaInicio,
        r.fechaFin,
        r.estado,
        r.comentarios,
      ]),
    )
    return
  }
  const year = preferredYear(capacitacionesYears(rows))
  const report = buildAgroCapacitacionesReport(rows, year)
  downloadReportPdf({
    title: 'Capacitaciones ambientales',
    subtitle: `${report.meta.periodLabel} · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Capacitaciones',
    filename: stampFilename('capacitaciones', 'pdf'),
    theme: 'metas',
    kpis: report.kpis.slice(0, 4).map((k) => ({
      label: k.label,
      value: k.value,
    })),
    sections: [
      {
        heading: 'Alertas',
        lines: report.insights.length
          ? report.insights.map((i) => `[${i.level}] ${i.title}: ${i.text}`)
          : ['Sin alertas'],
      },
      {
        heading: 'Detalle',
        lines: report.detailRows.slice(0, 35).map(
          (r) =>
            `${r.inicio} · ${r.sede} · ${r.detalle.slice(0, 60)} · ${r.estado}`,
        ),
      },
    ],
  })
}

async function exportResumenCumplimiento(format: 'pdf' | 'csv') {
  const summary = await loadCumplimientoSectionSummary()
  const allKpis = [
    ...summary.kpisCompromisos.map((k) => ({ ...k, grupo: 'Compromisos' })),
    ...summary.kpisLicencias.map((k) => ({ ...k, grupo: 'Licencias' })),
    ...summary.kpis.map((k) => ({ ...k, grupo: 'Otros' })),
  ]
  if (format === 'csv') {
    downloadCsv(
      stampFilename('resumen_cumplimiento_kpis', 'csv'),
      ['Grupo', 'KPI', 'Valor', 'Hint'],
      allKpis.map((k) => [k.grupo, k.label, k.value, k.hint]),
    )
    return
  }
  downloadReportPdf({
    title: 'Resumen de cumplimiento',
    subtitle: `${summary.modulesLoaded} módulos · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Cumplimiento Legal',
    filename: stampFilename('resumen_cumplimiento', 'pdf'),
    theme: 'cumplimiento',
    kpis: [
      ...summary.kpisCompromisos.slice(0, 2),
      ...summary.kpisLicencias.slice(0, 2),
    ].map((k) => ({
      label: k.label,
      value: k.unit ? `${k.value} ${k.unit}` : k.value,
    })),
    sections: [
      {
        heading: 'Compromisos ambientales',
        lines: summary.kpisCompromisos.map(
          (k) =>
            `${k.label}: ${k.value}${k.unit ? ` ${k.unit}` : ''} — ${k.hint}`,
        ),
      },
      {
        heading: 'Licencias ambientales',
        lines: summary.kpisLicencias.map(
          (k) =>
            `${k.label}: ${k.value}${k.unit ? ` ${k.unit}` : ''} — ${k.hint}`,
        ),
      },
      {
        heading: 'Obligaciones, CAPA y trámites',
        lines: summary.kpis.map((k) => `${k.label}: ${k.value} — ${k.hint}`),
      },
      {
        heading: 'Próximos hitos',
        lines: summary.upcoming.length
          ? summary.upcoming
              .slice(0, 25)
              .map(
                (u) =>
                  `${u.fecha} · [${u.riesgo}] ${u.origen}: ${u.titulo}`,
              )
          : ['Sin hitos próximos'],
      },
    ],
  })
}

async function exportCompromisos(format: 'pdf' | 'csv') {
  const rows = await loadCompromisos()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('compromisos_ambientales', 'csv'),
      [
        'Código',
        'Título',
        'Sitio',
        'Responsable',
        'Estado',
        'Avance %',
        'Criticidad',
        'Vencimiento',
        'Riesgo',
      ],
      rows.map((r) => [
        r.codigo,
        r.titulo,
        r.sitio,
        r.responsablePrincipal,
        r.estado,
        r.porcentajeAvance,
        r.criticidad,
        r.fechaVencimiento,
        riskForCompromiso(r),
      ]),
    )
    return
  }
  const vencidos = rows.filter((r) => riskForCompromiso(r) === 'vencido').length
  const abiertos = rows.filter((r) => {
    const risk = riskForCompromiso(r)
    return risk !== 'cerrado' && risk !== 'suspendido'
  }).length
  downloadReportPdf({
    title: 'Compromisos ambientales',
    subtitle: `${rows.length} compromiso(s) · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Compromisos',
    filename: stampFilename('compromisos_ambientales', 'pdf'),
    theme: 'capa',
    kpis: [
      { label: 'Total', value: String(rows.length) },
      { label: 'Abiertos', value: String(abiertos) },
      { label: 'Vencidos', value: String(vencidos) },
      {
        label: 'Avance prom.',
        value: rows.length
          ? `${Math.round(
              rows.reduce((s, r) => s + (r.porcentajeAvance || 0), 0) /
                rows.length,
            )}%`
          : '—',
      },
    ],
    sections: [
      {
        heading: 'Portafolio',
        lines: rows.slice(0, 40).map(
          (r) =>
            `${r.codigo} · ${r.titulo.slice(0, 70)} · ${r.sitio} · ${r.estado} · ${r.porcentajeAvance}% · ${riskForCompromiso(r)}`,
        ),
      },
    ],
  })
}

async function exportTramites(format: 'pdf' | 'csv') {
  const rows = await loadAgroGestionTramites()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('gestion_tramites', 'csv'),
      [
        'Fecha solicitud',
        'Sede',
        'Proyecto',
        'Estado',
        'Asignado',
        'Prioridad',
        'Observaciones',
      ],
      rows.map((r) => [
        r.fechaSolicitud,
        r.plantaSede,
        r.nombreProyecto,
        r.estado,
        r.asignadoA,
        r.prioridad,
        r.observaciones,
      ]),
    )
    return
  }
  const years = [
    ...new Set(
      rows.map((r) => Number(r.fechaSolicitud.slice(0, 4))).filter(Boolean),
    ),
  ].sort((a, b) => b - a)
  const report = buildAgroGestionTramitesReport(rows, preferredYear(years))
  downloadReportPdf({
    title: 'Gestión de trámites',
    subtitle: `${report.meta.periodLabel} · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Trámites',
    filename: stampFilename('gestion_tramites', 'pdf'),
    theme: 'cumplimiento',
    kpis: report.kpis.slice(0, 4).map((k) => ({
      label: k.label,
      value: k.value,
    })),
    sections: [
      {
        heading: 'Por estado',
        lines: report.byEstado.map((s) => `${s.name}: ${s.value}`),
      },
      {
        heading: 'Detalle',
        lines: report.detailRows.slice(0, 35).map(
          (r) =>
            `${r.fecha} · ${r.sede} · ${r.proyecto.slice(0, 50)} · ${r.estado} · ${r.prioridad}`,
        ),
      },
    ],
  })
}

async function exportCalendarioLegal(format: 'pdf' | 'csv') {
  const summary = await loadCumplimientoSectionSummary()
  const items = summary.upcoming
  if (format === 'csv') {
    downloadCsv(
      stampFilename('calendario_legal', 'csv'),
      ['Fecha', 'Título', 'Origen', 'Riesgo'],
      items.map((u) => [u.fecha, u.titulo, u.origen, u.riesgo]),
    )
    return
  }
  downloadReportPdf({
    title: 'Calendario legal ambiental',
    subtitle: `${items.length} hito(s) próximos · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Calendario legal',
    filename: stampFilename('calendario_legal', 'pdf'),
    theme: 'cumplimiento',
    kpis: [
      { label: 'Hitos', value: String(items.length) },
      {
        label: 'Alto riesgo',
        value: String(items.filter((u) => u.riesgo === 'alto').length),
      },
      {
        label: 'Medio',
        value: String(items.filter((u) => u.riesgo === 'medio').length),
      },
      {
        label: 'Bajo',
        value: String(items.filter((u) => u.riesgo === 'bajo').length),
      },
    ],
    sections: [
      {
        heading: 'Agenda',
        lines: items.length
          ? items
              .slice(0, 40)
              .map(
                (u) =>
                  `${u.fecha} · [${u.riesgo}] ${u.origen}: ${u.titulo}`,
              )
          : ['Sin hitos próximos en el calendario'],
      },
    ],
  })
}

async function exportIndicadores(format: 'pdf' | 'csv') {
  const summary = await loadSostenibilidadSummary()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('indicadores_ambientales_kpis', 'csv'),
      ['KPI', 'Valor', 'Unidad', 'Hint'],
      summary.kpis.map((k) => [k.label, k.value, k.unit ?? '', k.hint]),
    )
    return
  }
  downloadReportPdf({
    title: 'Indicadores ambientales',
    subtitle: `${summary.modulesLoaded} módulos · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Sostenibilidad',
    filename: stampFilename('indicadores_ambientales', 'pdf'),
    theme: 'metas',
    kpis: summary.kpis.slice(0, 4).map((k) => ({
      label: k.label,
      value: k.unit ? `${k.value} ${k.unit}` : k.value,
    })),
    sections: [
      {
        heading: 'KPIs',
        lines: summary.kpis.map(
          (k) => `${k.label}: ${k.value}${k.unit ? ` ${k.unit}` : ''} — ${k.hint}`,
        ),
      },
      {
        heading: 'Metas por categoría',
        lines: summary.metasByCategoria.length
          ? summary.metasByCategoria.map(
              (m) =>
                `${m.name}: ${m.value} meta(s) · avance ${m.avgPct == null ? '—' : `${m.avgPct.toFixed(0)}%`}`,
            )
          : ['Sin metas'],
      },
      {
        heading: 'Umbrales por parámetro',
        lines: summary.umbralesByParam.length
          ? summary.umbralesByParam.map(
              (u) => `${u.name}: cumple ${u.cumple} · excede ${u.excede}`,
            )
          : ['Sin umbrales'],
      },
    ],
  })
}

async function exportCentroDocumental(format: 'pdf' | 'csv') {
  const summary = await loadDocumentosSummary()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('centro_documental_kpis', 'csv'),
      ['KPI', 'Valor', 'Hint'],
      summary.kpis.map((k) => [k.label, k.value, k.hint]),
    )
    return
  }
  downloadReportPdf({
    title: 'Centro documental',
    subtitle: `${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Centro documental',
    filename: stampFilename('centro_documental', 'pdf'),
    theme: 'expedientes',
    kpis: summary.kpis.slice(0, 4).map((k) => ({
      label: k.label,
      value: k.value,
    })),
    sections: [
      {
        heading: 'Por tema',
        lines: summary.byTema.length
          ? summary.byTema.map((t) => `${t.name}: ${t.value}`)
          : ['Sin datos por tema'],
      },
      {
        heading: 'Por tipo',
        lines: summary.byTipo.length
          ? summary.byTipo.map((t) => `${t.name}: ${t.value}`)
          : ['Sin datos por tipo'],
      },
    ],
  })
}

async function exportBiblioteca(format: 'pdf' | 'csv') {
  const docs = await loadBibliotecaDocs()
  if (format === 'csv') {
    downloadCsv(
      stampFilename('biblioteca', 'csv'),
      [
        'Título',
        'Categoría',
        'Archivo',
        'Páginas',
        'MB',
        'Copiloto',
        'Catálogo',
        'Resumen',
      ],
      docs.map((d) => [
        d.title,
        d.category,
        d.fileName,
        d.pages,
        d.sizeMb,
        d.enabledInCopilot ? 'Sí' : 'No',
        d.isCatalog ? 'Sí' : 'No',
        d.summary,
      ]),
    )
    return
  }
  downloadReportPdf({
    title: 'Biblioteca de conocimiento',
    subtitle: `${docs.length} documento(s) · ${todayLabel()}`,
    footer: 'Cementos Progreso Ambiente · Biblioteca',
    filename: stampFilename('biblioteca', 'pdf'),
    theme: 'expedientes',
    kpis: [
      { label: 'Total', value: String(docs.length) },
      {
        label: 'En copiloto',
        value: String(docs.filter((d) => d.enabledInCopilot).length),
      },
      {
        label: 'Catálogo',
        value: String(docs.filter((d) => d.isCatalog).length),
      },
      {
        label: 'Páginas',
        value: String(docs.reduce((s, d) => s + (d.pages || 0), 0)),
      },
    ],
    sections: [
      {
        heading: 'Índice',
        lines: docs.slice(0, 40).map(
          (d) =>
            `${d.title} · ${d.category} · ${d.pages} pág. · copiloto ${d.enabledInCopilot ? 'sí' : 'no'}`,
        ),
      },
    ],
  })
}
