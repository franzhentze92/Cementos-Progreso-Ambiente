/**
 * Carga señales multi-módulo y CRUD de briefings semanales.
 */

import {
  emptyKpis,
  nextCodigo,
  toIsoDate,
  startOfWeek,
  endOfWeek,
  weekLabel,
  type AnalistaKpis,
  type AnalistaSignal,
  type BriefingForm,
  type BriefingRecord,
} from '../data/analista'
import { buildAnalistaReport } from '../data/analistaReport'
import { buildCumplimientoReport } from '../data/cumplimientoReport'
import { buildCapaReport } from '../data/capaReport'
import { buildMetasReport } from '../data/metasReport'
import { buildUmbralesReport } from '../data/umbralesReport'
import { buildIntensidadReport } from '../data/intensidadReport'
import { buildCircularidadReport } from '../data/circularidadReport'
import { buildExpedientesReport } from '../data/expedientesReport'
import { buildCarbonReport } from '../data/carbonReport'
import {
  buildAgroAguaReport,
  availableYears as aguaYears,
} from '../data/agroConsumoAguaReport'
import { preferredYear } from '../data/dashboard'
import { loadCumplimiento } from './cumplimientoApi'
import { loadCapas } from './capaApi'
import { loadMetas } from './metasApi'
import { loadUmbrales } from './umbralesApi'
import { loadEscenarios } from './intensidadApi'
import { loadCircularidad } from './circularidadApi'
import { loadExpedientes } from './expedientesApi'
import { loadAgroMonitoreos } from './agroMonitoreosApi'
import { loadAgroResiduos } from './agroResiduosApi'
import { loadAgroConsumoAgua } from './agroConsumoAguaApi'
import { loadCarbonCampaign } from './carbonApi'
import { loadSiteRiskOverlay } from './siteRiskApi'
import { supabase } from './supabase'

type DbRow = {
  id: string
  codigo: string
  semana_inicio: string
  semana_fin: string
  titulo: string
  signals: unknown
  resumen: string
  borrador_md: string
  kpis: unknown
  estado: string
  generado_por: string
  notas: string
}

const SELECT_COLS =
  'id, codigo, semana_inicio, semana_fin, titulo, signals, resumen, borrador_md, kpis, estado, generado_por, notas'

function parseSignals(raw: unknown): AnalistaSignal[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (s): s is AnalistaSignal =>
      Boolean(s) &&
      typeof s === 'object' &&
      typeof (s as AnalistaSignal).title === 'string',
  )
}

function parseKpis(raw: unknown): AnalistaKpis {
  if (!raw || typeof raw !== 'object') return emptyKpis()
  return { ...emptyKpis(), ...(raw as Partial<AnalistaKpis>) }
}

function mapRow(row: DbRow): BriefingRecord {
  return {
    id: row.id,
    codigo: row.codigo ?? '',
    semanaInicio: row.semana_inicio,
    semanaFin: row.semana_fin,
    titulo: row.titulo ?? '',
    signals: parseSignals(row.signals),
    resumen: row.resumen ?? '',
    borradorMd: row.borrador_md ?? '',
    kpis: parseKpis(row.kpis),
    estado: row.estado ?? 'Borrador',
    generadoPor: row.generado_por ?? '',
    notas: row.notas ?? '',
  }
}

export async function computeLiveAnalistaReport(
  semanaInicio?: string,
  semanaFin?: string,
) {
  const start = semanaInicio
    ? new Date(`${semanaInicio}T12:00:00`)
    : startOfWeek()
  const end = semanaFin
    ? new Date(`${semanaFin}T12:00:00`)
    : endOfWeek(start)
  const ini = toIsoDate(start)
  const fin = toIsoDate(end)

  const [
    cum,
    capa,
    metas,
    umbrales,
    mon,
    esc,
    circ,
    exp,
    residuos,
    agua,
    siteRisk,
  ] = await Promise.all([
    loadCumplimiento().catch(() => []),
    loadCapas().catch(() => []),
    loadMetas().catch(() => []),
    loadUmbrales().catch(() => []),
    loadAgroMonitoreos().catch(() => []),
    loadEscenarios().catch(() => []),
    loadCircularidad().catch(() => []),
    loadExpedientes().catch(() => []),
    loadAgroResiduos().catch(() => []),
    loadAgroConsumoAgua().catch(() => []),
    loadSiteRiskOverlay().catch(() => []),
  ])

  let carbon = null
  try {
    const camp = await loadCarbonCampaign()
    carbon = buildCarbonReport(camp.state)
  } catch {
    carbon = null
  }

  return buildAnalistaReport({
    semanaInicio: ini,
    semanaFin: fin,
    cumplimiento: cum.length ? buildCumplimientoReport(cum) : null,
    capa: capa.length ? buildCapaReport(capa) : null,
    metas: metas.length ? buildMetasReport(metas) : null,
    umbrales: buildUmbralesReport(umbrales, mon),
    intensidad: buildIntensidadReport(carbon, esc),
    circularidad: buildCircularidadReport(circ, residuos),
    expedientes: exp.length ? buildExpedientesReport(exp) : null,
    carbon,
    agua: agua.length
      ? buildAgroAguaReport(agua, preferredYear(aguaYears(agua)))
      : null,
    siteRisk,
  })
}

export async function loadBriefings(): Promise<BriefingRecord[]> {
  const { data, error } = await supabase
    .from('briefings_semanales')
    .select(SELECT_COLS)
    .order('semana_inicio', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function loadBriefingByWeek(
  semanaInicio: string,
): Promise<BriefingRecord | null> {
  const { data, error } = await supabase
    .from('briefings_semanales')
    .select(SELECT_COLS)
    .eq('semana_inicio', semanaInicio)
    .maybeSingle()
  if (error) throw error
  return data ? mapRow(data as DbRow) : null
}

export async function upsertBriefing(
  form: BriefingForm,
  signals: AnalistaSignal[],
  kpis: AnalistaKpis,
): Promise<BriefingRecord> {
  const payload = {
    codigo: form.codigo.trim(),
    semana_inicio: form.semanaInicio,
    semana_fin: form.semanaFin,
    titulo: form.titulo.trim() || `Briefing ${weekLabel(form.semanaInicio, form.semanaFin)}`,
    signals,
    resumen: form.resumen.trim(),
    borrador_md: form.borradorMd.trim(),
    kpis,
    estado: form.estado.trim() || 'Borrador',
    generado_por: form.generadoPor.trim(),
    notas: form.notas.trim(),
  }

  if (form.id) {
    const { data, error } = await supabase
      .from('briefings_semanales')
      .update(payload)
      .eq('id', form.id)
      .select(SELECT_COLS)
      .single()
    if (error) throw error
    return mapRow(data as DbRow)
  }

  const { data, error } = await supabase
    .from('briefings_semanales')
    .insert(payload)
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  return mapRow(data as DbRow)
}

export async function deleteBriefing(id: string): Promise<void> {
  const { error } = await supabase
    .from('briefings_semanales')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Genera o refresca el briefing de la semana actual a partir de señales vivas. */
export async function generateWeeklyBriefing(options?: {
  generadoPor?: string
  keepBorrador?: boolean
  existingId?: string
}): Promise<BriefingRecord> {
  const report = await computeLiveAnalistaReport()
  const existing = await loadBriefings()
  const sameWeek = existing.find((b) => b.semanaInicio === report.semanaInicio)
  const codigo =
    sameWeek?.codigo ||
    nextCodigo(existing.map((b) => b.codigo).filter(Boolean))

  const form: BriefingForm = {
    localId: sameWeek?.id ?? crypto.randomUUID(),
    id: options?.existingId ?? sameWeek?.id,
    codigo,
    semanaInicio: report.semanaInicio,
    semanaFin: report.semanaFin,
    titulo: `Briefing semanal ${report.weekLabel}`,
    resumen: report.resumen,
    borradorMd:
      options?.keepBorrador && sameWeek?.borradorMd
        ? sameWeek.borradorMd
        : '',
    estado: sameWeek?.estado === 'Publicado' ? 'Publicado' : 'Borrador',
    generadoPor: options?.generadoPor ?? 'Analista automático',
    notas: sameWeek?.notas ?? '',
  }

  return upsertBriefing(form, report.signals, report.kpis)
}
