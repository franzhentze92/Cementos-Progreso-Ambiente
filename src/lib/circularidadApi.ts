import {
  CIRCULARIDAD_SEED,
  type CircularidadForm,
  type CircularidadRecord,
} from '../data/circularidad'
import { supabase } from './supabase'

type DbRow = {
  id: string
  codigo: string
  unidad_negocio: string
  sede: string
  tipo_residuo: string
  clasificacion: string
  ruta: string
  gestor: string
  manifiesto: string
  cantidad_lbs: number | null
  costo_gtq: number | null
  fecha: string | null
  valorizado: boolean
  estado: string
  evidencia_url: string
  notas: string
}

const SELECT_COLS =
  'id, codigo, unidad_negocio, sede, tipo_residuo, clasificacion, ruta, gestor, manifiesto, cantidad_lbs, costo_gtq, fecha, valorizado, estado, evidencia_url, notas'

function mapRow(row: DbRow): CircularidadRecord {
  return {
    id: row.id,
    codigo: row.codigo ?? '',
    unidadNegocio: row.unidad_negocio ?? '',
    sede: row.sede ?? '',
    tipoResiduo: row.tipo_residuo ?? '',
    clasificacion: row.clasificacion ?? '',
    ruta: row.ruta ?? '',
    gestor: row.gestor ?? '',
    manifiesto: row.manifiesto ?? '',
    cantidadLbs: row.cantidad_lbs == null ? null : Number(row.cantidad_lbs),
    costoGtq: row.costo_gtq == null ? null : Number(row.costo_gtq),
    fecha: row.fecha,
    valorizado: Boolean(row.valorizado),
    estado: row.estado ?? 'Registrado',
    evidenciaUrl: row.evidencia_url ?? '',
    notas: row.notas ?? '',
  }
}

function toPayload(form: CircularidadForm) {
  const cantidadLbs =
    form.cantidadLbs.trim() === '' ? null : Number(form.cantidadLbs)
  const costoGtq =
    form.costoGtq.trim() === '' ? null : Number(form.costoGtq)
  if (cantidadLbs != null && !Number.isFinite(cantidadLbs)) {
    throw new Error('Cantidad lbs inválida')
  }
  if (costoGtq != null && !Number.isFinite(costoGtq)) {
    throw new Error('Costo inválido')
  }
  return {
    codigo: form.codigo.trim(),
    unidad_negocio: form.unidadNegocio.trim() || 'Agroprogreso',
    sede: form.sede.trim(),
    tipo_residuo: form.tipoResiduo.trim(),
    clasificacion: form.clasificacion.trim() || 'Ordinario',
    ruta: form.ruta.trim() || 'Reciclaje',
    gestor: form.gestor.trim(),
    manifiesto: form.manifiesto.trim(),
    cantidad_lbs: cantidadLbs,
    costo_gtq: costoGtq,
    fecha: form.fecha || null,
    valorizado: form.valorizado,
    estado: form.estado.trim() || 'Registrado',
    evidencia_url: form.evidenciaUrl.trim(),
    notas: form.notas.trim(),
  }
}

export async function loadCircularidad(): Promise<CircularidadRecord[]> {
  const { data, error } = await supabase
    .from('circularidad_flujos')
    .select(SELECT_COLS)
    .order('fecha', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function upsertCircularidad(
  form: CircularidadForm,
): Promise<CircularidadRecord> {
  if (!form.sede.trim() && !form.tipoResiduo.trim()) {
    throw new Error('Indique sede o tipo de residuo')
  }
  const payload = toPayload(form)
  if (form.id) {
    const { data, error } = await supabase
      .from('circularidad_flujos')
      .update(payload)
      .eq('id', form.id)
      .select(SELECT_COLS)
      .single()
    if (error) throw error
    return mapRow(data as DbRow)
  }
  const { data, error } = await supabase
    .from('circularidad_flujos')
    .insert(payload)
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  return mapRow(data as DbRow)
}

export async function deleteCircularidad(id: string): Promise<void> {
  const { error } = await supabase
    .from('circularidad_flujos')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function seedCircularidadIfEmpty(): Promise<number> {
  const existing = await loadCircularidad()
  if (existing.length > 0) return 0
  const payload = CIRCULARIDAD_SEED.map((f) => ({
    codigo: f.codigo,
    unidad_negocio: f.unidadNegocio,
    sede: f.sede,
    tipo_residuo: f.tipoResiduo,
    clasificacion: f.clasificacion,
    ruta: f.ruta,
    gestor: f.gestor,
    manifiesto: f.manifiesto,
    cantidad_lbs: f.cantidadLbs ? Number(f.cantidadLbs) : null,
    costo_gtq: f.costoGtq ? Number(f.costoGtq) : null,
    fecha: f.fecha || null,
    valorizado: f.valorizado,
    estado: f.estado,
    evidencia_url: f.evidenciaUrl,
    notas: f.notas,
  }))
  const { error } = await supabase.from('circularidad_flujos').insert(payload)
  if (error) throw error
  return payload.length
}
