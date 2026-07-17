import type { CarbonReport } from './carbonReport'
import {
  DEFAULT_EF_DIESEL,
  DEFAULT_EF_ELECTRICIDAD,
  applyEscenario,
  computeIntensidadKgT,
  formatNum,
  type EscenarioRecord,
  type IntensidadBaseline,
  type IntensidadProyectada,
} from './intensidad'

export type InsightLevel = 'Crítico' | 'Atención' | 'Positivo'

export type IntensidadReport = {
  baseline: IntensidadBaseline
  kpis: Array<{
    id: string
    label: string
    value: string
    hint: string
    tone: 'default' | 'warn' | 'ok' | 'dark'
  }>
  scenarios: Array<IntensidadProyectada & { codigo: string; estado: string }>
  comparison: Array<{
    name: string
    intensidad: number
    kwhPerTon: number | null
    galPerTon: number | null
  }>
  insights: Array<{ id: string; level: InsightLevel; title: string; text: string }>
}

export function baselineFromCarbon(
  carbon: CarbonReport,
  efElec = DEFAULT_EF_ELECTRICIDAD,
  efDiesel = DEFAULT_EF_DIESEL,
): IntensidadBaseline {
  const totalCementT = carbon.totals.totalCement
  const totalElecKwh = carbon.totals.totalElec
  const totalDieselGal = carbon.totals.totalDiesel
  const avgM3PerTon =
    totalCementT > 0
      ? Math.round((carbon.totals.totalWater / totalCementT) * 1000) / 1000
      : null
  const avgGalPerTon =
    totalCementT > 0
      ? Math.round((totalDieselGal / totalCementT) * 1000) / 1000
      : null

  return {
    year: carbon.meta.year,
    plant: carbon.meta.plant,
    totalCementT,
    totalElecKwh,
    totalDieselGal,
    avgClinkerFactorPct: carbon.totals.avgFactorPlanta,
    avgKwhPerTon: carbon.totals.avgKwhPerTon,
    avgGalPerTon,
    avgM3PerTon,
    diversionRate: carbon.totals.diversionRate,
    intensidadKgT: computeIntensidadKgT(
      totalCementT,
      totalElecKwh,
      totalDieselGal,
      efElec,
      efDiesel,
    ),
    efElectricidad: efElec,
    efDiesel,
  }
}

export function buildIntensidadReport(
  carbon: CarbonReport | null,
  escenarios: EscenarioRecord[],
): IntensidadReport {
  const baseline = carbon
    ? baselineFromCarbon(carbon)
    : {
        year: String(new Date().getFullYear()),
        plant: 'Alicon',
        totalCementT: 0,
        totalElecKwh: 0,
        totalDieselGal: 0,
        avgClinkerFactorPct: null,
        avgKwhPerTon: null,
        avgGalPerTon: null,
        avgM3PerTon: null,
        diversionRate: null,
        intensidadKgT: null,
        efElectricidad: DEFAULT_EF_ELECTRICIDAD,
        efDiesel: DEFAULT_EF_DIESEL,
      }

  const scenarios = escenarios.map((e) => ({
    ...applyEscenario(baseline, e),
    codigo: e.codigo,
    estado: e.estado,
  }))

  const comparison = [
    {
      name: 'Línea base',
      intensidad: baseline.intensidadKgT ?? 0,
      kwhPerTon: baseline.avgKwhPerTon,
      galPerTon: baseline.avgGalPerTon,
    },
    ...scenarios
      .filter((s) => s.estado !== 'Archivado')
      .map((s) => ({
        name: s.escenarioNombre,
        intensidad: s.intensidadKgT ?? 0,
        kwhPerTon: s.avgKwhPerTon,
        galPerTon: s.avgGalPerTon,
      })),
  ]

  const insights: IntensidadReport['insights'] = []
  if (!carbon || baseline.totalCementT <= 0) {
    insights.push({
      id: 'sin-carbon',
      level: 'Atención',
      title: 'Sin campaña de monitoreo Alicón',
      text: 'Cargue la campaña de huella/monitoreo para calcular intensidades reales.',
    })
  } else if (baseline.intensidadKgT != null) {
    insights.push({
      id: 'base',
      level: 'Positivo',
      title: `Intensidad base ${formatNum(baseline.intensidadKgT, 1)} kg CO₂e/t`,
      text: `Proxy operativo con EF electricidad ${baseline.efElectricidad} kg/kWh y diesel ${baseline.efDiesel} kg/gal (editables por escenario).`,
    })
  }

  const best = scenarios
    .filter((s) => s.intensidadKgT != null)
    .sort((a, b) => (a.intensidadKgT as number) - (b.intensidadKgT as number))[0]
  if (best && best.deltaVsBasePct != null && best.deltaVsBasePct < 0) {
    insights.push({
      id: 'best',
      level: 'Positivo',
      title: `Mejor escenario: ${best.escenarioNombre}`,
      text: `Proyecta ${formatNum(best.deltaVsBasePct, 1)}% vs línea base (${formatNum(best.intensidadKgT, 1)} kg CO₂e/t).`,
    })
  }

  const failMeta = scenarios.filter((s) => s.cumpleMeta === false)
  if (failMeta.length) {
    insights.push({
      id: 'meta',
      level: 'Atención',
      title: `${failMeta.length} escenario(s) sobre meta de intensidad`,
      text: 'Ajustar deltas operativos o revisar la meta kg CO₂e/t.',
    })
  }

  return {
    baseline,
    kpis: [
      {
        id: 'int',
        label: 'Intensidad base',
        value:
          baseline.intensidadKgT == null
            ? '—'
            : `${formatNum(baseline.intensidadKgT, 1)}`,
        hint: 'kg CO₂e/t (proxy)',
        tone: 'dark',
      },
      {
        id: 'kwh',
        label: 'Electricidad específica',
        value:
          baseline.avgKwhPerTon == null
            ? '—'
            : formatNum(baseline.avgKwhPerTon, 1),
        hint: 'kWh/t cemento',
        tone: 'default',
      },
      {
        id: 'clinker',
        label: 'Factor clinker',
        value:
          baseline.avgClinkerFactorPct == null
            ? '—'
            : `${formatNum(baseline.avgClinkerFactorPct, 1)}%`,
        hint: 'Promedio planta',
        tone: 'default',
      },
      {
        id: 'esc',
        label: 'Escenarios',
        value: formatNum(escenarios.length),
        hint: `${escenarios.filter((e) => e.estado === 'Activo').length} activos`,
        tone: 'ok',
      },
    ],
    scenarios,
    comparison,
    insights,
  }
}
