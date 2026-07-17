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
import {
  buildAgroResiduosReport,
  availableYears as residuosYears,
} from '../data/agroResiduosReport'
import {
  buildAgroAguaReport,
  availableYears as aguaYears,
} from '../data/agroConsumoAguaReport'
import { preferredYear } from '../data/dashboard'
import {
  downloadCsv,
  downloadReportPdf,
  stampFilename,
} from './exportDownload'

export type ExportPackId =
  | 'dashboard'
  | 'cumplimiento'
  | 'capa'
  | 'metas'
  | 'umbrales'
  | 'intensidad'
  | 'circularidad'
  | 'expedientes'
  | 'analista'
  | 'licencias'
  | 'incidentes'
  | 'residuos'
  | 'agua'
  | 'carbono'

export type ExportPackDef = {
  id: ExportPackId
  title: string
  description: string
  formats: Array<'pdf' | 'csv'>
  audience: string
}

export const EXPORT_PACKS: ExportPackDef[] = [
  {
    id: 'dashboard',
    title: 'Resumen ejecutivo',
    description:
      'KPIs, hallazgos del periodo y estado de cumplimiento cruzado Agro + Alicón.',
    formats: ['pdf', 'csv'],
    audience: 'Gerencia / Ambiente',
  },
  {
    id: 'cumplimiento',
    title: 'Pack cumplimiento legal',
    description:
      'Obligaciones, vencimientos, criticidad y calendario de alertas (90/60/30).',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Auditoría',
  },
  {
    id: 'capa',
    title: 'Pack CAPA',
    description:
      'Acciones correctivas/preventivas, plazos, responsables y tasa de cierre.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Operaciones',
  },
  {
    id: 'metas',
    title: 'Pack metas / KPIs',
    description:
      'Portafolio de metas ambientales con avance, riesgo y responsables.',
    formats: ['pdf', 'csv'],
    audience: 'Gerencia / Ambiente',
  },
  {
    id: 'umbrales',
    title: 'Pack umbrales de monitoreo',
    description:
      'Catálogo de límites y excedencias automáticas de monitoreos Agro.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Laboratorio',
  },
  {
    id: 'intensidad',
    title: 'Pack intensidad / escenarios',
    description:
      'Intensidad operativa Alicón (kg CO₂e/t proxy) y escenarios qué-pasa-si.',
    formats: ['pdf', 'csv'],
    audience: 'Sostenibilidad / Gerencia',
  },
  {
    id: 'circularidad',
    title: 'Pack circularidad',
    description:
      'Flujos de valorización, manifiestos, gestores y tasa de aprovechamiento.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente',
  },
  {
    id: 'expedientes',
    title: 'Pack expedientes',
    description:
      'Repositorio documental por sitio/tema con ligue a módulos operativos.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / Auditoría',
  },
  {
    id: 'analista',
    title: 'Pack analista semanal',
    description:
      'Briefing predictivo: señales, KPIs de riesgo y borrador ejecutivo.',
    formats: ['pdf', 'csv'],
    audience: 'Gerencia / Ambiente',
  },
  {
    id: 'licencias',
    title: 'Licencias ambientales Agro',
    description: 'Catálogo de licencias con vigencia, estado y sede.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente',
  },
  {
    id: 'incidentes',
    title: 'Incidentes ambientales',
    description: 'Incidentes Agroprogreso + Planta Alicón consolidados.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente / SSO',
  },
  {
    id: 'residuos',
    title: 'Gestión de residuos Agro',
    description: 'Registros de residuos por sede, clasificación y ruta.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente',
  },
  {
    id: 'agua',
    title: 'Consumo de agua Agro',
    description: 'Consumos por finca/sitio en formato tabular.',
    formats: ['pdf', 'csv'],
    audience: 'Ambiente',
  },
  {
    id: 'carbono',
    title: 'Huella de carbono Alicón',
    description: 'Resumen de producción, energía y totales de la campaña activa.',
    formats: ['pdf', 'csv'],
    audience: 'Sostenibilidad',
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
    case 'cumplimiento':
      return exportCumplimiento(format)
    case 'capa':
      return exportCapa(format)
    case 'metas':
      return exportMetas(format)
    case 'umbrales':
      return exportUmbrales(format)
    case 'intensidad':
      return exportIntensidad(format)
    case 'circularidad':
      return exportCircularidad(format)
    case 'expedientes':
      return exportExpedientes(format)
    case 'analista':
      return exportAnalista(format)
    case 'licencias':
      return exportLicencias(format)
    case 'incidentes':
      return exportIncidentes(format)
    case 'residuos':
      return exportResiduos(format)
    case 'agua':
      return exportAgua(format)
    case 'carbono':
      return exportCarbono(format)
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
          'Aun no hay borrador generado. En Analista semanal use "Generar borrador" y vuelva a exportar.',
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
