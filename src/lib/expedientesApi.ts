import {
  EXPEDIENTES_SEED,
  type ExpedienteForm,
  type ExpedienteRecord,
} from '../data/expedientes'
import { supabase } from './supabase'

type DbRow = {
  id: string
  codigo: string
  titulo: string
  unidad_negocio: string
  sitio: string
  tema: string
  tipo_documento: string
  version: string
  fecha_documento: string | null
  responsable: string
  estado: string
  archivo_url: string
  archivo_nombre: string
  modulo_ligado: string
  ref_ligada: string
  tags: string
  notas: string
}

const SELECT_COLS =
  'id, codigo, titulo, unidad_negocio, sitio, tema, tipo_documento, version, fecha_documento, responsable, estado, archivo_url, archivo_nombre, modulo_ligado, ref_ligada, tags, notas'

function mapRow(row: DbRow): ExpedienteRecord {
  return {
    id: row.id,
    codigo: row.codigo ?? '',
    titulo: row.titulo ?? '',
    unidadNegocio: row.unidad_negocio ?? '',
    sitio: row.sitio ?? '',
    tema: row.tema ?? '',
    tipoDocumento: row.tipo_documento ?? '',
    version: row.version ?? '1.0',
    fechaDocumento: row.fecha_documento,
    responsable: row.responsable ?? '',
    estado: row.estado ?? 'Vigente',
    archivoUrl: row.archivo_url ?? '',
    archivoNombre: row.archivo_nombre ?? '',
    moduloLigado: row.modulo_ligado ?? '',
    refLigada: row.ref_ligada ?? '',
    tags: row.tags ?? '',
    notas: row.notas ?? '',
  }
}

function toPayload(form: ExpedienteForm) {
  return {
    codigo: form.codigo.trim(),
    titulo: form.titulo.trim(),
    unidad_negocio: form.unidadNegocio.trim() || 'Agroprogreso',
    sitio: form.sitio.trim(),
    tema: form.tema.trim() || 'General',
    tipo_documento: form.tipoDocumento.trim() || 'Otro',
    version: form.version.trim() || '1.0',
    fecha_documento: form.fechaDocumento || null,
    responsable: form.responsable.trim(),
    estado: form.estado.trim() || 'Vigente',
    archivo_url: form.archivoUrl.trim(),
    archivo_nombre: form.archivoNombre.trim(),
    modulo_ligado: form.moduloLigado.trim(),
    ref_ligada: form.refLigada.trim(),
    tags: form.tags.trim(),
    notas: form.notas.trim(),
  }
}

export async function loadExpedientes(): Promise<ExpedienteRecord[]> {
  const { data, error } = await supabase
    .from('expedientes_ambientales')
    .select(SELECT_COLS)
    .order('fecha_documento', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function upsertExpediente(
  form: ExpedienteForm,
): Promise<ExpedienteRecord> {
  if (!form.titulo.trim()) throw new Error('El título es obligatorio')
  const payload = toPayload(form)
  if (form.id) {
    const { data, error } = await supabase
      .from('expedientes_ambientales')
      .update(payload)
      .eq('id', form.id)
      .select(SELECT_COLS)
      .single()
    if (error) throw error
    return mapRow(data as DbRow)
  }
  const { data, error } = await supabase
    .from('expedientes_ambientales')
    .insert(payload)
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  return mapRow(data as DbRow)
}

export async function deleteExpediente(id: string): Promise<void> {
  const { error } = await supabase
    .from('expedientes_ambientales')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function seedExpedientesIfEmpty(): Promise<number> {
  const existing = await loadExpedientes()
  if (existing.length > 0) return 0
  const payload = EXPEDIENTES_SEED.map((e) => ({
    codigo: e.codigo,
    titulo: e.titulo,
    unidad_negocio: e.unidadNegocio,
    sitio: e.sitio,
    tema: e.tema,
    tipo_documento: e.tipoDocumento,
    version: e.version,
    fecha_documento: e.fechaDocumento || null,
    responsable: e.responsable,
    estado: e.estado,
    archivo_url: e.archivoUrl,
    archivo_nombre: e.archivoNombre,
    modulo_ligado: e.moduloLigado,
    ref_ligada: e.refLigada,
    tags: e.tags,
    notas: e.notas,
  }))
  const { error } = await supabase.from('expedientes_ambientales').insert(payload)
  if (error) throw error
  return payload.length
}
