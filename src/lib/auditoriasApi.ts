import type {
  AuditoriaChatMessage,
  AuditoriaKpis,
  AuditoriaRecord,
  AuditoriaSaveInput,
} from '../data/auditorias'
import { supabase } from './supabase'

type DbRow = {
  id: string
  codigo: string
  titulo: string
  dictamen_md: string
  resumen: string
  fuente: string
  estado: string
  generado_por: string
  kpis: unknown
  mensajes: unknown
  notas: string
  created_at: string
  updated_at: string
}

const SELECT_COLS =
  'id, codigo, titulo, dictamen_md, resumen, fuente, estado, generado_por, kpis, mensajes, notas, created_at, updated_at'

function emptyKpis(): AuditoriaKpis {
  return {
    total: 0,
    abiertos: 0,
    vencidos: 0,
    alerta: 0,
    sinEvidencia: 0,
  }
}

function parseKpis(raw: unknown): AuditoriaKpis {
  if (!raw || typeof raw !== 'object') return emptyKpis()
  const o = raw as Partial<AuditoriaKpis>
  return {
    total: Number(o.total) || 0,
    abiertos: Number(o.abiertos) || 0,
    vencidos: Number(o.vencidos) || 0,
    alerta: Number(o.alerta) || 0,
    sinEvidencia: Number(o.sinEvidencia) || 0,
  }
}

function parseMensajes(raw: unknown): AuditoriaChatMessage[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (m): m is AuditoriaChatMessage =>
      Boolean(m) &&
      typeof m === 'object' &&
      ((m as AuditoriaChatMessage).role === 'user' ||
        (m as AuditoriaChatMessage).role === 'assistant' ||
        (m as AuditoriaChatMessage).role === 'system') &&
      typeof (m as AuditoriaChatMessage).content === 'string',
  )
}

function mapRow(row: DbRow): AuditoriaRecord {
  return {
    id: row.id,
    codigo: row.codigo ?? '',
    titulo: row.titulo ?? '',
    dictamenMd: row.dictamen_md ?? '',
    resumen: row.resumen ?? '',
    fuente: row.fuente === 'local' ? 'local' : 'openai',
    estado: row.estado ?? 'Borrador',
    generadoPor: row.generado_por ?? '',
    kpis: parseKpis(row.kpis),
    mensajes: parseMensajes(row.mensajes),
    notas: row.notas ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function nextCodigo(existing: string[]): string {
  const year = new Date().getFullYear()
  const prefix = `AUD-${year}-`
  let max = 0
  for (const c of existing) {
    if (!c.startsWith(prefix)) continue
    const n = Number(c.slice(prefix.length))
    if (!Number.isNaN(n)) max = Math.max(max, n)
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

function extractResumen(dictamenMd: string): string {
  const lines = dictamenMd
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const body = lines.filter((l) => !/^#{1,3}\s/.test(l)).slice(0, 3)
  return body.join(' ').slice(0, 280)
}

export async function loadAuditorias(): Promise<AuditoriaRecord[]> {
  const { data, error } = await supabase
    .from('auditorias_compromisos')
    .select(SELECT_COLS)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function saveAuditoria(
  input: AuditoriaSaveInput,
): Promise<AuditoriaRecord> {
  const dictamen = input.dictamenMd.trim()
  if (!dictamen) throw new Error('El dictamen está vacío')

  let codigo = input.codigo?.trim() || ''
  if (!codigo) {
    const existing = await loadAuditorias()
    codigo = nextCodigo(existing.map((a) => a.codigo))
  }

  const titulo =
    input.titulo?.trim() ||
    `Auditoría de compromisos · ${new Date().toLocaleDateString('es-GT')}`

  const payload = {
    codigo,
    titulo,
    dictamen_md: dictamen,
    resumen: input.resumen?.trim() || extractResumen(dictamen),
    fuente: input.fuente ?? 'openai',
    estado: input.estado?.trim() || 'Emitida',
    generado_por: input.generadoPor?.trim() || '',
    kpis: input.kpis ?? emptyKpis(),
    mensajes: input.mensajes ?? [],
    notas: input.notas?.trim() || '',
  }

  if (input.id) {
    const { data, error } = await supabase
      .from('auditorias_compromisos')
      .update(payload)
      .eq('id', input.id)
      .select(SELECT_COLS)
      .single()
    if (error) throw error
    return mapRow(data as DbRow)
  }

  const { data, error } = await supabase
    .from('auditorias_compromisos')
    .insert(payload)
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  return mapRow(data as DbRow)
}

export async function deleteAuditoria(id: string): Promise<void> {
  const { error } = await supabase
    .from('auditorias_compromisos')
    .delete()
    .eq('id', id)
  if (error) throw error
}
