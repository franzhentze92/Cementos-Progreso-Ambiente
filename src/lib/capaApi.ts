import { type CapaForm, type CapaRecord } from '../data/capa'
import { supabase } from './supabase'

type DbRow = {
  id: string
  codigo: string
  unidad_negocio: string
  sitio: string
  tipo_accion: string
  origen_tipo: string
  origen_ref: string
  hallazgo: string
  causa_raiz: string
  accion: string
  responsable: string
  verificador: string
  prioridad: string
  estado: string
  fecha_apertura: string
  fecha_compromiso: string | null
  fecha_cierre: string | null
  evidencia_url: string
  evidencia_nota: string
  verificacion: string
  eficacia: string
  notas: string
}

const SELECT_COLS =
  'id, codigo, unidad_negocio, sitio, tipo_accion, origen_tipo, origen_ref, hallazgo, causa_raiz, accion, responsable, verificador, prioridad, estado, fecha_apertura, fecha_compromiso, fecha_cierre, evidencia_url, evidencia_nota, verificacion, eficacia, notas'

function mapRow(row: DbRow): CapaRecord {
  return {
    id: row.id,
    codigo: row.codigo ?? '',
    unidadNegocio: row.unidad_negocio ?? '',
    sitio: row.sitio ?? '',
    tipoAccion: row.tipo_accion ?? 'Correctiva',
    origenTipo: row.origen_tipo ?? '',
    origenRef: row.origen_ref ?? '',
    hallazgo: row.hallazgo ?? '',
    causaRaiz: row.causa_raiz ?? '',
    accion: row.accion ?? '',
    responsable: row.responsable ?? '',
    verificador: row.verificador ?? '',
    prioridad: row.prioridad ?? 'Media',
    estado: row.estado ?? 'Abierta',
    fechaApertura: row.fecha_apertura,
    fechaCompromiso: row.fecha_compromiso,
    fechaCierre: row.fecha_cierre,
    evidenciaUrl: row.evidencia_url ?? '',
    evidenciaNota: row.evidencia_nota ?? '',
    verificacion: row.verificacion ?? '',
    eficacia: row.eficacia ?? '',
    notas: row.notas ?? '',
  }
}

function toPayload(form: CapaForm) {
  return {
    codigo: form.codigo.trim(),
    unidad_negocio: form.unidadNegocio.trim() || 'Agroprogreso',
    sitio: form.sitio.trim(),
    tipo_accion: form.tipoAccion.trim() || 'Correctiva',
    origen_tipo: form.origenTipo.trim() || 'Inspección',
    origen_ref: form.origenRef.trim(),
    hallazgo: form.hallazgo.trim(),
    causa_raiz: form.causaRaiz.trim(),
    accion: form.accion.trim(),
    responsable: form.responsable.trim(),
    verificador: form.verificador.trim(),
    prioridad: form.prioridad.trim() || 'Media',
    estado: form.estado.trim() || 'Abierta',
    fecha_apertura: form.fechaApertura || new Date().toISOString().slice(0, 10),
    fecha_compromiso: form.fechaCompromiso || null,
    fecha_cierre: form.fechaCierre || null,
    evidencia_url: form.evidenciaUrl.trim(),
    evidencia_nota: form.evidenciaNota.trim(),
    verificacion: form.verificacion.trim(),
    eficacia: form.eficacia.trim(),
    notas: form.notas.trim(),
  }
}

export async function loadCapas(): Promise<CapaRecord[]> {
  const { data, error } = await supabase
    .from('capa_acciones')
    .select(SELECT_COLS)
    .order('fecha_compromiso', { ascending: true })
    .order('fecha_apertura', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function upsertCapa(form: CapaForm): Promise<CapaRecord> {
  if (!form.hallazgo.trim()) {
    throw new Error('El hallazgo es obligatorio')
  }
  if (!form.accion.trim()) {
    throw new Error('La acción correctiva/preventiva es obligatoria')
  }
  const payload = toPayload(form)

  if (form.id) {
    const { data, error } = await supabase
      .from('capa_acciones')
      .update(payload)
      .eq('id', form.id)
      .select(SELECT_COLS)
      .single()
    if (error) throw error
    return mapRow(data as DbRow)
  }

  const { data, error } = await supabase
    .from('capa_acciones')
    .insert(payload)
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  return mapRow(data as DbRow)
}

export async function deleteCapa(id: string): Promise<void> {
  const { error } = await supabase.from('capa_acciones').delete().eq('id', id)
  if (error) throw error
}
