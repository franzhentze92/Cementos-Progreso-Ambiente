import { type UmbralForm, type UmbralRecord, UMBRALES_SEED } from '../data/umbrales'
import { supabase } from './supabase'

type DbRow = {
  id: string
  parametro: string
  tipo_agua: string
  unidad_medida: string
  operador: string
  limite_min: number | null
  limite_max: number | null
  unidad_negocio: string
  autoridad_ref: string
  criticidad: string
  activo: boolean
  notas: string
}

const SELECT_COLS =
  'id, parametro, tipo_agua, unidad_medida, operador, limite_min, limite_max, unidad_negocio, autoridad_ref, criticidad, activo, notas'

function mapRow(row: DbRow): UmbralRecord {
  return {
    id: row.id,
    parametro: row.parametro ?? '',
    tipoAgua: row.tipo_agua ?? '',
    unidadMedida: row.unidad_medida ?? '',
    operador: row.operador ?? 'entre',
    limiteMin: row.limite_min == null ? null : Number(row.limite_min),
    limiteMax: row.limite_max == null ? null : Number(row.limite_max),
    unidadNegocio: row.unidad_negocio ?? '',
    autoridadRef: row.autoridad_ref ?? '',
    criticidad: row.criticidad ?? 'Media',
    activo: Boolean(row.activo),
    notas: row.notas ?? '',
  }
}

function toPayload(form: UmbralForm) {
  const limiteMin =
    form.limiteMin.trim() === '' ? null : Number(form.limiteMin)
  const limiteMax =
    form.limiteMax.trim() === '' ? null : Number(form.limiteMax)
  if (limiteMin != null && !Number.isFinite(limiteMin)) {
    throw new Error('Límite mínimo inválido')
  }
  if (limiteMax != null && !Number.isFinite(limiteMax)) {
    throw new Error('Límite máximo inválido')
  }
  return {
    parametro: form.parametro.trim(),
    tipo_agua: form.tipoAgua.trim(),
    unidad_medida: form.unidadMedida.trim(),
    operador: form.operador || 'entre',
    limite_min: limiteMin,
    limite_max: limiteMax,
    unidad_negocio: form.unidadNegocio.trim() || 'Agroprogreso',
    autoridad_ref: form.autoridadRef.trim(),
    criticidad: form.criticidad || 'Media',
    activo: form.activo,
    notas: form.notas.trim(),
  }
}

export async function loadUmbrales(): Promise<UmbralRecord[]> {
  const { data, error } = await supabase
    .from('monitoreo_umbrales')
    .select(SELECT_COLS)
    .order('parametro')
  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function upsertUmbral(form: UmbralForm): Promise<UmbralRecord> {
  if (!form.parametro.trim()) throw new Error('El parámetro es obligatorio')
  const payload = toPayload(form)
  if (form.id) {
    const { data, error } = await supabase
      .from('monitoreo_umbrales')
      .update(payload)
      .eq('id', form.id)
      .select(SELECT_COLS)
      .single()
    if (error) throw error
    return mapRow(data as DbRow)
  }
  const { data, error } = await supabase
    .from('monitoreo_umbrales')
    .insert(payload)
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  return mapRow(data as DbRow)
}

export async function deleteUmbral(id: string): Promise<void> {
  const { error } = await supabase.from('monitoreo_umbrales').delete().eq('id', id)
  if (error) throw error
}

export async function seedUmbralesIfEmpty(): Promise<number> {
  const existing = await loadUmbrales()
  if (existing.length > 0) return 0
  const payload = UMBRALES_SEED.map((u) => ({
    parametro: u.parametro,
    tipo_agua: u.tipoAgua,
    unidad_medida: u.unidadMedida,
    operador: u.operador,
    limite_min: u.limiteMin ? Number(u.limiteMin) : null,
    limite_max: u.limiteMax ? Number(u.limiteMax) : null,
    unidad_negocio: u.unidadNegocio,
    autoridad_ref: u.autoridadRef,
    criticidad: u.criticidad,
    activo: u.activo,
    notas: u.notas,
  }))
  const { error } = await supabase.from('monitoreo_umbrales').insert(payload)
  if (error) throw error
  return payload.length
}
