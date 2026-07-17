import {
  ESCENARIOS_SEED,
  type EscenarioForm,
  type EscenarioRecord,
} from '../data/intensidad'
import { supabase } from './supabase'

type DbRow = {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  anio_base: number
  planta: string
  delta_produccion_pct: number
  delta_electricidad_pct: number
  delta_diesel_pct: number
  delta_clinker_pct: number
  delta_agua_pct: number
  ef_electricidad_kg_kwh: number
  ef_diesel_kg_gal: number
  meta_intensidad_kg_t: number | null
  responsable: string
  estado: string
  notas: string
}

const SELECT_COLS =
  'id, codigo, nombre, descripcion, anio_base, planta, delta_produccion_pct, delta_electricidad_pct, delta_diesel_pct, delta_clinker_pct, delta_agua_pct, ef_electricidad_kg_kwh, ef_diesel_kg_gal, meta_intensidad_kg_t, responsable, estado, notas'

function mapRow(row: DbRow): EscenarioRecord {
  return {
    id: row.id,
    codigo: row.codigo ?? '',
    nombre: row.nombre ?? '',
    descripcion: row.descripcion ?? '',
    anioBase: Number(row.anio_base),
    planta: row.planta ?? 'Alicon',
    deltaProduccionPct: Number(row.delta_produccion_pct ?? 0),
    deltaElectricidadPct: Number(row.delta_electricidad_pct ?? 0),
    deltaDieselPct: Number(row.delta_diesel_pct ?? 0),
    deltaClinkerPct: Number(row.delta_clinker_pct ?? 0),
    deltaAguaPct: Number(row.delta_agua_pct ?? 0),
    efElectricidadKgKwh: Number(row.ef_electricidad_kg_kwh ?? 0.45),
    efDieselKgGal: Number(row.ef_diesel_kg_gal ?? 10.21),
    metaIntensidadKgT:
      row.meta_intensidad_kg_t == null ? null : Number(row.meta_intensidad_kg_t),
    responsable: row.responsable ?? '',
    estado: row.estado ?? 'Borrador',
    notas: row.notas ?? '',
  }
}

function num(v: string, fallback = 0): number {
  if (v.trim() === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`Valor numérico inválido: ${v}`)
  return n
}

function toPayload(form: EscenarioForm) {
  const meta =
    form.metaIntensidadKgT.trim() === ''
      ? null
      : num(form.metaIntensidadKgT)
  return {
    codigo: form.codigo.trim(),
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim(),
    anio_base: num(form.anioBase, new Date().getFullYear()),
    planta: form.planta.trim() || 'Alicon',
    delta_produccion_pct: num(form.deltaProduccionPct),
    delta_electricidad_pct: num(form.deltaElectricidadPct),
    delta_diesel_pct: num(form.deltaDieselPct),
    delta_clinker_pct: num(form.deltaClinkerPct),
    delta_agua_pct: num(form.deltaAguaPct),
    ef_electricidad_kg_kwh: num(form.efElectricidadKgKwh, 0.45),
    ef_diesel_kg_gal: num(form.efDieselKgGal, 10.21),
    meta_intensidad_kg_t: meta,
    responsable: form.responsable.trim(),
    estado: form.estado.trim() || 'Borrador',
    notas: form.notas.trim(),
  }
}

export async function loadEscenarios(): Promise<EscenarioRecord[]> {
  const { data, error } = await supabase
    .from('carbon_escenarios')
    .select(SELECT_COLS)
    .order('anio_base', { ascending: false })
    .order('nombre')
  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function upsertEscenario(
  form: EscenarioForm,
): Promise<EscenarioRecord> {
  if (!form.nombre.trim()) throw new Error('El nombre del escenario es obligatorio')
  const payload = toPayload(form)
  if (form.id) {
    const { data, error } = await supabase
      .from('carbon_escenarios')
      .update(payload)
      .eq('id', form.id)
      .select(SELECT_COLS)
      .single()
    if (error) throw error
    return mapRow(data as DbRow)
  }
  const { data, error } = await supabase
    .from('carbon_escenarios')
    .insert(payload)
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  return mapRow(data as DbRow)
}

export async function deleteEscenario(id: string): Promise<void> {
  const { error } = await supabase.from('carbon_escenarios').delete().eq('id', id)
  if (error) throw error
}

export async function seedEscenariosIfEmpty(): Promise<number> {
  const existing = await loadEscenarios()
  if (existing.length > 0) return 0
  const payload = ESCENARIOS_SEED.map((e) => ({
    codigo: e.codigo,
    nombre: e.nombre,
    descripcion: e.descripcion,
    anio_base: Number(e.anioBase),
    planta: e.planta,
    delta_produccion_pct: Number(e.deltaProduccionPct) || 0,
    delta_electricidad_pct: Number(e.deltaElectricidadPct) || 0,
    delta_diesel_pct: Number(e.deltaDieselPct) || 0,
    delta_clinker_pct: Number(e.deltaClinkerPct) || 0,
    delta_agua_pct: Number(e.deltaAguaPct) || 0,
    ef_electricidad_kg_kwh: Number(e.efElectricidadKgKwh) || 0.45,
    ef_diesel_kg_gal: Number(e.efDieselKgGal) || 10.21,
    meta_intensidad_kg_t:
      e.metaIntensidadKgT.trim() === '' ? null : Number(e.metaIntensidadKgT),
    responsable: e.responsable,
    estado: e.estado,
    notas: e.notas,
  }))
  const { error } = await supabase.from('carbon_escenarios').insert(payload)
  if (error) throw error
  return payload.length
}
