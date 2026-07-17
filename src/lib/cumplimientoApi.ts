import {
  type CumplimientoForm,
  type CumplimientoRecord,
} from '../data/cumplimiento'
import { loadAgroLicencias } from './agroLicenciasApi'
import { loadAgroGestionTramites } from './agroGestionTramitesApi'
import { supabase } from './supabase'

type DbRow = {
  id: string
  codigo: string
  unidad_negocio: string
  sitio: string
  tipo_obligacion: string
  titulo: string
  descripcion: string
  autoridad: string
  instrumento: string
  expediente: string
  responsable: string
  criticidad: string
  estado: string
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  alerta_dias: number
  evidencia_url: string
  evidencia_nota: string
  origen: string
  origen_ref: string
  notas: string
}

const SELECT_COLS =
  'id, codigo, unidad_negocio, sitio, tipo_obligacion, titulo, descripcion, autoridad, instrumento, expediente, responsable, criticidad, estado, fecha_inicio, fecha_vencimiento, alerta_dias, evidencia_url, evidencia_nota, origen, origen_ref, notas'

function mapRow(row: DbRow): CumplimientoRecord {
  return {
    id: row.id,
    codigo: row.codigo ?? '',
    unidadNegocio: row.unidad_negocio ?? '',
    sitio: row.sitio ?? '',
    tipoObligacion: row.tipo_obligacion ?? '',
    titulo: row.titulo ?? '',
    descripcion: row.descripcion ?? '',
    autoridad: row.autoridad ?? '',
    instrumento: row.instrumento ?? '',
    expediente: row.expediente ?? '',
    responsable: row.responsable ?? '',
    criticidad: row.criticidad ?? 'Media',
    estado: row.estado ?? 'Vigente',
    fechaInicio: row.fecha_inicio,
    fechaVencimiento: row.fecha_vencimiento,
    alertaDias: row.alerta_dias ?? 90,
    evidenciaUrl: row.evidencia_url ?? '',
    evidenciaNota: row.evidencia_nota ?? '',
    origen: row.origen ?? 'manual',
    origenRef: row.origen_ref ?? '',
    notas: row.notas ?? '',
  }
}

function toPayload(form: CumplimientoForm) {
  const alerta = Number(form.alertaDias)
  return {
    codigo: form.codigo.trim(),
    unidad_negocio: form.unidadNegocio.trim() || 'Agroprogreso',
    sitio: form.sitio.trim(),
    tipo_obligacion: form.tipoObligacion.trim() || 'Licencia',
    titulo: form.titulo.trim(),
    descripcion: form.descripcion.trim(),
    autoridad: form.autoridad.trim(),
    instrumento: form.instrumento.trim(),
    expediente: form.expediente.trim(),
    responsable: form.responsable.trim(),
    criticidad: form.criticidad.trim() || 'Media',
    estado: form.estado.trim() || 'Vigente',
    fecha_inicio: form.fechaInicio || null,
    fecha_vencimiento: form.fechaVencimiento || null,
    alerta_dias: Number.isFinite(alerta) && alerta > 0 ? alerta : 90,
    evidencia_url: form.evidenciaUrl.trim(),
    evidencia_nota: form.evidenciaNota.trim(),
    origen: form.origen.trim() || 'manual',
    origen_ref: form.origenRef.trim(),
    notas: form.notas.trim(),
  }
}

export async function loadCumplimiento(): Promise<CumplimientoRecord[]> {
  const { data, error } = await supabase
    .from('cumplimiento_obligaciones')
    .select(SELECT_COLS)
    .order('fecha_vencimiento', { ascending: true })
    .order('titulo')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function upsertCumplimiento(
  form: CumplimientoForm,
): Promise<CumplimientoRecord> {
  if (!form.titulo.trim()) {
    throw new Error('El título de la obligación es obligatorio')
  }
  const payload = toPayload(form)

  if (form.id) {
    const { data, error } = await supabase
      .from('cumplimiento_obligaciones')
      .update(payload)
      .eq('id', form.id)
      .select(SELECT_COLS)
      .single()
    if (error) throw error
    return mapRow(data as DbRow)
  }

  const { data, error } = await supabase
    .from('cumplimiento_obligaciones')
    .insert(payload)
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  return mapRow(data as DbRow)
}

export async function deleteCumplimiento(id: string): Promise<void> {
  const { error } = await supabase
    .from('cumplimiento_obligaciones')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Importa licencias Agro como obligaciones (sin duplicar por origen_ref). */
export async function syncLicenciasToCumplimiento(): Promise<number> {
  const licencias = await loadAgroLicencias()
  const existing = await loadCumplimiento()
  const refs = new Set(
    existing
      .filter((r) => r.origen === 'licencias')
      .map((r) => r.origenRef),
  )

  const toInsert = licencias
    .filter((l) => !refs.has(l.id))
    .map((l) => ({
      codigo: l.expediente ? `LIC-${l.expediente}` : '',
      unidad_negocio: 'Agroprogreso',
      sitio: l.plantaSede,
      tipo_obligacion: 'Licencia',
      titulo: l.licencia || `Licencia ${l.expediente || l.plantaSede}`,
      descripcion: `Categoría ${l.categoria || '—'}. Vigencia: ${l.vigencia || '—'}`,
      autoridad: 'MARN / autoridad ambiental',
      instrumento: l.licencia,
      expediente: l.expediente,
      responsable: '',
      criticidad: /A\b|B1/i.test(l.categoria) ? 'Alta' : 'Media',
      estado: l.estado || 'Vigente',
      fecha_inicio: l.vigenciaInicio,
      fecha_vencimiento: l.vigenciaFin,
      alerta_dias: 90,
      evidencia_url: '',
      evidencia_nota: '',
      origen: 'licencias',
      origen_ref: l.id,
      notas: 'Sincronizado desde Licencias ambientales Agroprogreso',
    }))

  if (!toInsert.length) return 0

  const { error } = await supabase
    .from('cumplimiento_obligaciones')
    .insert(toInsert)
  if (error) throw error
  return toInsert.length
}

/** Importa trámites Agro como obligaciones en trámite. */
export async function syncTramitesToCumplimiento(): Promise<number> {
  const tramites = await loadAgroGestionTramites()
  const existing = await loadCumplimiento()
  const refs = new Set(
    existing.filter((r) => r.origen === 'tramites').map((r) => r.origenRef),
  )

  const toInsert = tramites
    .filter((t) => !refs.has(t.id) && !/cerrado/i.test(t.estado))
    .map((t) => ({
      codigo: '',
      unidad_negocio: 'Agroprogreso',
      sitio: t.plantaSede || '',
      tipo_obligacion: 'Trámite',
      titulo: t.nombreProyecto || 'Trámite ambiental',
      descripcion: t.observaciones || '',
      autoridad: '',
      instrumento: t.nombreProyecto || '',
      expediente: '',
      responsable: t.asignadoA || '',
      criticidad: /alta/i.test(t.prioridad || '') ? 'Alta' : 'Media',
      estado: 'En trámite',
      fecha_inicio: t.fechaSolicitud || null,
      fecha_vencimiento: null,
      alerta_dias: 60,
      evidencia_url: '',
      evidencia_nota: '',
      origen: 'tramites',
      origen_ref: t.id,
      notas: `Sincronizado desde Gestión de trámites · estado origen: ${t.estado}`,
    }))

  if (!toInsert.length) return 0

  const { error } = await supabase
    .from('cumplimiento_obligaciones')
    .insert(toInsert)
  if (error) throw error
  return toInsert.length
}
