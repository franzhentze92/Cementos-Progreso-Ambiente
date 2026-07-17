/**
 * Motor de señales predictivas: reutiliza reportes Fase 1–3 + sitio.
 * No inventa GHG; proyecta riesgo con reglas transparentes.
 */

import type { CumplimientoReport } from './cumplimientoReport'
import type { CapaReport } from './capaReport'
import type { MetasReport } from './metasReport'
import type { UmbralesReport } from './umbralesReport'
import type { IntensidadReport } from './intensidadReport'
import type { CircularidadReport } from './circularidadReport'
import type { ExpedientesReport } from './expedientesReport'
import type { SiteRiskCard } from './siteRiskBridge'
import type { CarbonReport } from './carbonReport'
import type { AgroAguaReport } from './agroConsumoAguaReport'
import {
  formatNum,
  kpisFromSignals,
  resumenFromSignals,
  weekLabel,
  type AnalistaKpis,
  type AnalistaSignal,
} from './analista'

export type AnalistaReportInput = {
  semanaInicio: string
  semanaFin: string
  cumplimiento: CumplimientoReport | null
  capa: CapaReport | null
  metas: MetasReport | null
  umbrales: UmbralesReport | null
  intensidad: IntensidadReport | null
  circularidad: CircularidadReport | null
  expedientes: ExpedientesReport | null
  carbon: CarbonReport | null
  agua: AgroAguaReport | null
  siteRisk: SiteRiskCard[]
}

export type AnalistaReport = {
  semanaInicio: string
  semanaFin: string
  weekLabel: string
  signals: AnalistaSignal[]
  byCategory: Array<{ name: string; value: number; criticos: number }>
  kpis: AnalistaKpis
  resumen: string
  forecastLines: string[]
}

function daysBetween(iso: string | null | undefined, from = new Date()): number | null {
  if (!iso) return null
  const t = new Date(`${iso}T12:00:00`).getTime()
  if (Number.isNaN(t)) return null
  const a = new Date(from)
  a.setHours(12, 0, 0, 0)
  return Math.round((t - a.getTime()) / 86400000)
}

export function buildAnalistaReport(input: AnalistaReportInput): AnalistaReport {
  const signals: AnalistaSignal[] = []
  let n = 0
  const push = (s: Omit<AnalistaSignal, 'id'>) => {
    n += 1
    signals.push({ ...s, id: `sig-${n}` })
  }

  // ── Vencimientos (cumplimiento) ─────────────────────────────────────────
  if (input.cumplimiento) {
    const c = input.cumplimiento
    if (c.meta.vencidos > 0) {
      push({
        category: 'vencimientos',
        level: 'Crítico',
        title: `${formatNum(c.meta.vencidos)} obligación(es) vencida(s)`,
        text: 'Riesgo regulatorio activo. Priorizar renovación o evidencia de trámite.',
        href: '/cumplimiento',
        score: 100 + c.meta.vencidos * 10,
      })
    }
    if (c.meta.porVencer > 0) {
      push({
        category: 'vencimientos',
        level: 'Atención',
        title: `${formatNum(c.meta.porVencer)} obligación(es) por vencer`,
        text: 'Dentro de la ventana de alerta. Programar responsables y evidencias.',
        href: '/cumplimiento',
        score: 70 + c.meta.porVencer * 5,
      })
    }
    for (const item of c.calendar.slice(0, 6)) {
      if (item.risk === 'ok' || item.risk === 'sin-fecha') continue
      push({
        category: 'vencimientos',
        level: item.risk === 'vencido' || item.risk === 'critico' ? 'Crítico' : 'Atención',
        title: item.titulo,
        text: `${item.sitio || 'Sin sitio'} · vence ${item.fecha || '—'} · ${item.estado}`,
        href: '/cumplimiento',
        score: item.risk === 'vencido' ? 95 : item.risk === 'critico' ? 85 : 60,
      })
    }
  }

  // ── CAPA ────────────────────────────────────────────────────────────────
  if (input.capa) {
    if (input.capa.meta.vencidas > 0) {
      push({
        category: 'operativo',
        level: 'Crítico',
        title: `${formatNum(input.capa.meta.vencidas)} CAPA con compromiso vencido`,
        text: 'Ciclo de mejora abierta fuera de plazo. Verificar eficacia o reprogramar.',
        href: '/capa',
        score: 90 + input.capa.meta.vencidas * 8,
      })
    } else if (input.capa.meta.abiertas > 0) {
      push({
        category: 'operativo',
        level: 'Atención',
        title: `${formatNum(input.capa.meta.abiertas)} CAPA abierta(s)`,
        text: `Tasa de cierre ${formatNum(input.capa.meta.pctCierre, 1)}%.`,
        href: '/capa',
        score: 45,
      })
    }
  }

  // ── Metas / forecast ────────────────────────────────────────────────────
  if (input.metas) {
    for (const row of input.metas.detailRows) {
      if (row.risk !== 'critico' && row.risk !== 'atencion') continue
      const daysLeft = daysBetween(row.fechaFin)
      const progress = row.progress
      let forecast = 'Avance bajo umbral de atención.'
      if (daysLeft != null && daysLeft >= 0 && progress != null) {
        // Extrapolación lineal simple al cierre del periodo
        const elapsedHint = Math.max(1, 365 - daysLeft)
        const rate = progress / elapsedHint
        const projected = Math.round(rate * 365 * 10) / 10
        forecast =
          projected < 100
            ? `Forecast lineal al cierre ≈ ${formatNum(projected, 1)}% (faltan ${daysLeft} d). Riesgo de incumplimiento.`
            : `Con el ritmo actual podría cerrar cerca de ${formatNum(projected, 1)}%. Vigilar.`
      }
      push({
        category: 'metas',
        level: row.risk === 'critico' ? 'Crítico' : 'Atención',
        title: row.indicador,
        text: `${row.sitio || row.unidadNegocio} · avance ${formatNum(progress, 1)}% · ${forecast}`,
        href: '/metas',
        score: row.risk === 'critico' ? 88 : 55,
      })
    }
    if (input.metas.meta.avgProgress != null && input.metas.meta.avgProgress >= 95) {
      push({
        category: 'metas',
        level: 'Positivo',
        title: `Avance promedio de metas ${formatNum(input.metas.meta.avgProgress, 1)}%`,
        text: 'El portafolio de KPIs opera en zona saludable.',
        href: '/metas',
        score: 15,
      })
    }
  }

  // ── Anomalías monitoreo / umbrales ──────────────────────────────────────
  if (input.umbrales) {
    if (input.umbrales.meta.excede > 0) {
      push({
        category: 'anomalias',
        level: 'Crítico',
        title: `${formatNum(input.umbrales.meta.excede)} excedencia(s) de monitoreo`,
        text: `Cumplimiento automático ${formatNum(input.umbrales.meta.cumplePct, 1)}%. Abrir CAPA o verificar laboratorio.`,
        href: '/umbrales',
        score: 92 + input.umbrales.meta.excede,
      })
    }
    for (const e of input.umbrales.excedencias.slice(0, 5)) {
      push({
        category: 'anomalias',
        level: e.criticidad === 'Alta' ? 'Crítico' : 'Atención',
        title: `${e.parametro} fuera de umbral · ${e.sede}`,
        text: `${e.fecha} · resultado ${formatNum(e.resultado, 3)} vs ${e.umbral}`,
        href: '/umbrales',
        score: e.criticidad === 'Alta' ? 80 : 50,
      })
    }
  }

  // ── Carbono / intensidad ────────────────────────────────────────────────
  if (input.carbon?.totals.avgKwhPerTon != null) {
    const peak = [...input.carbon.monthlyElectricity].sort(
      (a, b) => (b.kwhPerTon ?? 0) - (a.kwhPerTon ?? 0),
    )[0]
    const avg = input.carbon.totals.avgKwhPerTon
    if (peak?.kwhPerTon != null && avg > 0 && peak.kwhPerTon > avg * 1.08) {
      push({
        category: 'anomalias',
        level: 'Atención',
        title: `Pico eléctrico ${peak.month}: ${formatNum(peak.kwhPerTon, 0)} kWh/t`,
        text: `+${formatNum(((peak.kwhPerTon - avg) / avg) * 100, 0)}% vs promedio ${formatNum(avg, 0)} kWh/t.`,
        href: '/operaciones/planta-alicon/huella-de-carbono',
        score: 58,
      })
    }
  }

  if (input.intensidad) {
    const fail = input.intensidad.scenarios.filter((s) => s.cumpleMeta === false)
    if (fail.length) {
      push({
        category: 'metas',
        level: 'Atención',
        title: `${formatNum(fail.length)} escenario(s) sobre meta de intensidad`,
        text: `Base ${formatNum(input.intensidad.baseline.intensidadKgT, 1)} kg CO₂e/t (proxy). Revisar deltas.`,
        href: '/intensidad',
        score: 52,
      })
    }
  }

  // ── Agua MoM ────────────────────────────────────────────────────────────
  if (input.agua?.monthlyTotal && input.agua.monthlyTotal.length >= 2) {
    const series = input.agua.monthlyTotal
    const last = series[series.length - 1]
    const prev = series[series.length - 2]
    if (prev.total > 0) {
      const delta = ((last.total - prev.total) / prev.total) * 100
      if (Math.abs(delta) >= 50) {
        push({
          category: 'anomalias',
          level: delta > 0 ? 'Atención' : 'Info',
          title: `Consumo de agua ${delta > 0 ? 'subió' : 'bajó'} ${formatNum(Math.abs(delta), 0)}% MoM`,
          text: `${last.month || 'Último mes'}: ${formatNum(last.total, 0)} m³ vs ${formatNum(prev.total, 0)} m³.`,
          href: '/operaciones/agroprogreso/consumo-de-agua',
          score: Math.abs(delta) >= 80 ? 65 : 40,
        })
      }
    }
  }

  // ── Circularidad ────────────────────────────────────────────────────────
  if (input.circularidad?.meta.tasaValorizacionPct != null) {
    const pct = input.circularidad.meta.tasaValorizacionPct
    if (pct < 50) {
      push({
        category: 'operativo',
        level: 'Crítico',
        title: `Valorización de residuos ${formatNum(pct, 1)}%`,
        text: 'Menos de la mitad de libras se aprovechan. Revisar disposición final.',
        href: '/circularidad',
        score: 75,
      })
    } else if (pct >= 70) {
      push({
        category: 'operativo',
        level: 'Positivo',
        title: `Valorización ${formatNum(pct, 1)}%`,
        text: 'Circularidad en rango saludable.',
        href: '/circularidad',
        score: 12,
      })
    }
  }

  // ── Expedientes ─────────────────────────────────────────────────────────
  if (input.expedientes) {
    const sinArchivo =
      input.expedientes.meta.total - input.expedientes.meta.conArchivo
    if (sinArchivo > 0 && input.expedientes.meta.total > 0) {
      push({
        category: 'evidencia',
        level: 'Atención',
        title: `${formatNum(sinArchivo)} expediente(s) sin URL de archivo`,
        text: 'Falta evidencia enlazada para auditoría / copiloto.',
        href: '/expedientes',
        score: 35,
      })
    }
  }

  // ── Sitios ──────────────────────────────────────────────────────────────
  const critSites = input.siteRisk.filter((s) => s.level === 'critico')
  for (const s of critSites.slice(0, 4)) {
    push({
      category: 'operativo',
      level: 'Crítico',
      title: `Sitio en semáforo crítico: ${s.name}`,
      text: s.headlines.slice(0, 2).join(' · ') || 'Acumulación de señales operativas.',
      href: '/mapa',
      score: 70 + s.score / 10,
    })
  }

  signals.sort((a, b) => b.score - a.score)

  const byCatMap = new Map<string, { value: number; criticos: number }>()
  for (const s of signals) {
    const cur = byCatMap.get(s.category) ?? { value: 0, criticos: 0 }
    cur.value += 1
    if (s.level === 'Crítico') cur.criticos += 1
    byCatMap.set(s.category, cur)
  }

  const kpis = kpisFromSignals(signals)
  const forecastLines = signals
    .filter((s) => s.category === 'metas' || s.category === 'vencimientos')
    .slice(0, 8)
    .map((s) => `${s.title}: ${s.text}`)

  return {
    semanaInicio: input.semanaInicio,
    semanaFin: input.semanaFin,
    weekLabel: weekLabel(input.semanaInicio, input.semanaFin),
    signals,
    byCategory: [...byCatMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.value - a.value),
    kpis,
    resumen: resumenFromSignals(signals),
    forecastLines,
  }
}
