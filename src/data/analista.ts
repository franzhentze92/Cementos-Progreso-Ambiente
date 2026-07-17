/** Analista predictivo / briefing semanal (Fase 4). */

export const ANALISTA_ESTADOS = ['Borrador', 'Publicado', 'Archivado'] as const

export type AnalistaSignalLevel = 'Crítico' | 'Atención' | 'Positivo' | 'Info'

export type AnalistaSignalCategory =
  | 'vencimientos'
  | 'anomalias'
  | 'metas'
  | 'operativo'
  | 'evidencia'

export type AnalistaSignal = {
  id: string
  category: AnalistaSignalCategory
  level: AnalistaSignalLevel
  title: string
  text: string
  href?: string
  score: number
}

export type AnalistaKpis = {
  criticos: number
  atencion: number
  positivos: number
  vencimientos: number
  anomalias: number
  metasRiesgo: number
  sitiosCriticos: number
}

export type BriefingRecord = {
  id: string
  codigo: string
  semanaInicio: string
  semanaFin: string
  titulo: string
  signals: AnalistaSignal[]
  resumen: string
  borradorMd: string
  kpis: AnalistaKpis
  estado: string
  generadoPor: string
  notas: string
}

export type BriefingForm = {
  localId: string
  id?: string
  codigo: string
  semanaInicio: string
  semanaFin: string
  titulo: string
  resumen: string
  borradorMd: string
  estado: string
  generadoPor: string
  notas: string
}

/** Lunes de la semana ISO que contiene `d`. */
export function startOfWeek(d = new Date()): Date {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

export function endOfWeek(start: Date): Date {
  const x = new Date(start)
  x.setDate(x.getDate() + 6)
  return x
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function weekLabel(inicio: string, fin: string): string {
  const a = new Date(`${inicio}T12:00:00`)
  const b = new Date(`${fin}T12:00:00`)
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
  }
  return `${a.toLocaleDateString('es-GT', opts)} – ${b.toLocaleDateString('es-GT', {
    ...opts,
    year: 'numeric',
  })}`
}

export function emptyKpis(): AnalistaKpis {
  return {
    criticos: 0,
    atencion: 0,
    positivos: 0,
    vencimientos: 0,
    anomalias: 0,
    metasRiesgo: 0,
    sitiosCriticos: 0,
  }
}

export function kpisFromSignals(signals: AnalistaSignal[]): AnalistaKpis {
  const k = emptyKpis()
  for (const s of signals) {
    if (s.level === 'Crítico') k.criticos += 1
    else if (s.level === 'Atención') k.atencion += 1
    else if (s.level === 'Positivo') k.positivos += 1
    if (s.category === 'vencimientos') k.vencimientos += 1
    if (s.category === 'anomalias') k.anomalias += 1
    if (s.category === 'metas') k.metasRiesgo += 1
    if (s.category === 'operativo' && s.level === 'Crítico') k.sitiosCriticos += 1
  }
  return k
}

export function resumenFromSignals(signals: AnalistaSignal[]): string {
  const top = [...signals]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
  if (!top.length) {
    return 'Sin señales relevantes en esta ventana. El portafolio ambiental opera estable.'
  }
  return top.map((s) => `• [${s.level}] ${s.title}`).join('\n')
}

export function emptyBriefingForm(patch: Partial<BriefingForm> = {}): BriefingForm {
  const start = startOfWeek()
  const end = endOfWeek(start)
  return {
    localId: crypto.randomUUID(),
    codigo: '',
    semanaInicio: toIsoDate(start),
    semanaFin: toIsoDate(end),
    titulo: `Briefing semanal ${weekLabel(toIsoDate(start), toIsoDate(end))}`,
    resumen: '',
    borradorMd: '',
    estado: 'Borrador',
    generadoPor: '',
    notas: '',
    ...patch,
  }
}

export function formFromRecord(row: BriefingRecord): BriefingForm {
  return {
    localId: row.id,
    id: row.id,
    codigo: row.codigo,
    semanaInicio: row.semanaInicio,
    semanaFin: row.semanaFin,
    titulo: row.titulo,
    resumen: row.resumen,
    borradorMd: row.borradorMd,
    estado: row.estado,
    generadoPor: row.generadoPor,
    notas: row.notas,
  }
}

export function formatNum(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function nextCodigo(existing: string[]): string {
  const re = /^BRF-(\d+)$/i
  let max = 0
  for (const code of existing) {
    const m = code.match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `BRF-${String(max + 1).padStart(3, '0')}`
}

export const CATEGORY_LABEL: Record<AnalistaSignalCategory, string> = {
  vencimientos: 'Vencimientos',
  anomalias: 'Anomalías',
  metas: 'Metas / forecast',
  operativo: 'Riesgo operativo',
  evidencia: 'Evidencia',
}

export const WEEKLY_DRAFT_PROMPT = `Eres el analista ambiental proactivo de Cementos Progreso.
Con el contexto de dominios y señales del briefing semanal, redacta un borrador ejecutivo en español (Guatemala) con:

1. Encabezado: "Briefing ambiental semanal"
2. 3-5 hallazgos priorizados (críticos primero)
3. Acciones recomendadas (máximo 5, concretas, con módulo sugerido)
4. Un párrafo corto para gerencia (tono formal, sin jerga técnica innecesaria)

Usa solo datos del contexto. No inventes cifras. Formato markdown simple.`
