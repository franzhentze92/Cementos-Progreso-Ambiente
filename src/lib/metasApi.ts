import { type MetaForm, type MetaRecord, METAS_SEED } from '../data/metas'
import { supabase } from './supabase'

type DbRow = {
  id: string
  codigo: string
  indicador: string
  categoria: string
  unidad_negocio: string
  sitio: string
  unidad_medida: string
  meta_valor: number
  valor_actual: number | null
  sentido: string
  periodo_anio: number
  periodo_tipo: string
  fecha_inicio: string | null
  fecha_fin: string | null
  responsable: string
  estado: string
  umbral_atencion_pct: number
  umbral_critico_pct: number
  fuente_dato: string
  notas: string
}

const SELECT_COLS =
  'id, codigo, indicador, categoria, unidad_negocio, sitio, unidad_medida, meta_valor, valor_actual, sentido, periodo_anio, periodo_tipo, fecha_inicio, fecha_fin, responsable, estado, umbral_atencion_pct, umbral_critico_pct, fuente_dato, notas'

function mapRow(row: DbRow): MetaRecord {
  return {
    id: row.id,
    codigo: row.codigo ?? '',
    indicador: row.indicador ?? '',
    categoria: row.categoria ?? '',
    unidadNegocio: row.unidad_negocio ?? '',
    sitio: row.sitio ?? '',
    unidadMedida: row.unidad_medida ?? '',
    metaValor: Number(row.meta_valor),
    valorActual: row.valor_actual == null ? null : Number(row.valor_actual),
    sentido: row.sentido ?? 'menor_mejor',
    periodoAnio: Number(row.periodo_anio),
    periodoTipo: row.periodo_tipo ?? 'Anual',
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    responsable: row.responsable ?? '',
    estado: row.estado ?? 'En curso',
    umbralAtencionPct: Number(row.umbral_atencion_pct ?? 85),
    umbralCriticoPct: Number(row.umbral_critico_pct ?? 70),
    fuenteDato: row.fuente_dato ?? 'manual',
    notas: row.notas ?? '',
  }
}

function toPayload(form: MetaForm) {
  const metaValor = Number(form.metaValor)
  const valorActual =
    form.valorActual.trim() === '' ? null : Number(form.valorActual)
  if (!Number.isFinite(metaValor)) throw new Error('La meta debe ser numérica')
  if (valorActual != null && !Number.isFinite(valorActual)) {
    throw new Error('El valor actual debe ser numérico')
  }
  return {
    codigo: form.codigo.trim(),
    indicador: form.indicador.trim(),
    categoria: form.categoria.trim() || 'Operativo',
    unidad_negocio: form.unidadNegocio.trim() || 'Agroprogreso',
    sitio: form.sitio.trim(),
    unidad_medida: form.unidadMedida.trim(),
    meta_valor: metaValor,
    valor_actual: valorActual,
    sentido: form.sentido || 'menor_mejor',
    periodo_anio: Number(form.periodoAnio) || new Date().getFullYear(),
    periodo_tipo: form.periodoTipo || 'Anual',
    fecha_inicio: form.fechaInicio || null,
    fecha_fin: form.fechaFin || null,
    responsable: form.responsable.trim(),
    estado: form.estado.trim() || 'En curso',
    umbral_atencion_pct: Number(form.umbralAtencionPct) || 85,
    umbral_critico_pct: Number(form.umbralCriticoPct) || 70,
    fuente_dato: form.fuenteDato.trim() || 'manual',
    notas: form.notas.trim(),
  }
}

export async function loadMetas(): Promise<MetaRecord[]> {
  const { data, error } = await supabase
    .from('metas_ambientales')
    .select(SELECT_COLS)
    .order('periodo_anio', { ascending: false })
    .order('indicador')
  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function upsertMeta(form: MetaForm): Promise<MetaRecord> {
  if (!form.indicador.trim()) throw new Error('El indicador es obligatorio')
  const payload = toPayload(form)
  if (form.id) {
    const { data, error } = await supabase
      .from('metas_ambientales')
      .update(payload)
      .eq('id', form.id)
      .select(SELECT_COLS)
      .single()
    if (error) throw error
    return mapRow(data as DbRow)
  }
  const { data, error } = await supabase
    .from('metas_ambientales')
    .insert(payload)
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  return mapRow(data as DbRow)
}

export async function deleteMeta(id: string): Promise<void> {
  const { error } = await supabase.from('metas_ambientales').delete().eq('id', id)
  if (error) throw error
}

export async function seedMetasIfEmpty(): Promise<number> {
  const existing = await loadMetas()
  if (existing.length > 0) return 0
  const payload = METAS_SEED.map((m) => ({
    codigo: m.codigo,
    indicador: m.indicador,
    categoria: m.categoria,
    unidad_negocio: m.unidadNegocio,
    sitio: m.sitio,
    unidad_medida: m.unidadMedida,
    meta_valor: Number(m.metaValor),
    valor_actual: m.valorActual.trim() === '' ? null : Number(m.valorActual),
    sentido: m.sentido,
    periodo_anio: Number(m.periodoAnio),
    periodo_tipo: m.periodoTipo,
    fecha_inicio: m.fechaInicio || null,
    fecha_fin: m.fechaFin || null,
    responsable: m.responsable,
    estado: m.estado,
    umbral_atencion_pct: Number(m.umbralAtencionPct) || 85,
    umbral_critico_pct: Number(m.umbralCriticoPct) || 70,
    fuente_dato: m.fuenteDato,
    notas: m.notas,
  }))
  const { error } = await supabase.from('metas_ambientales').insert(payload)
  if (error) throw error
  return payload.length
}
