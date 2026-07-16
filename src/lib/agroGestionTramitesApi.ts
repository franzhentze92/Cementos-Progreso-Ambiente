import {
  AGRO_TRAMITES_UNIDAD,
  coordsForSede,
  type AgroTramiteFormRow,
  type AgroTramiteRecord,
} from '../data/agroGestionTramites'
import { supabase } from './supabase'

type DbRow = {
  id: string
  fecha_solicitud: string
  unidad_negocio: string
  planta_sede: string
  nombre_proyecto: string
  estado: string
  asignado_a: string
  prioridad: string
  observaciones: string
  latitud: number | null
  longitud: number | null
}

function mapRow(row: DbRow): AgroTramiteRecord {
  return {
    id: row.id,
    fechaSolicitud: row.fecha_solicitud,
    unidadNegocio: row.unidad_negocio ?? AGRO_TRAMITES_UNIDAD,
    plantaSede: row.planta_sede ?? '',
    nombreProyecto: row.nombre_proyecto ?? '',
    estado: row.estado ?? '',
    asignadoA: row.asignado_a ?? '',
    prioridad: row.prioridad ?? '',
    observaciones: row.observaciones ?? '',
    latitud: row.latitud,
    longitud: row.longitud,
  }
}

const SELECT_COLS =
  'id, fecha_solicitud, unidad_negocio, planta_sede, nombre_proyecto, estado, asignado_a, prioridad, observaciones, latitud, longitud'

export async function loadAgroGestionTramites(): Promise<AgroTramiteRecord[]> {
  const { data, error } = await supabase
    .from('agro_gestion_tramites')
    .select(SELECT_COLS)
    .eq('unidad_negocio', AGRO_TRAMITES_UNIDAD)
    .order('fecha_solicitud', { ascending: false })
    .order('planta_sede')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

/** Reemplaza el catálogo completo Agroprogreso. */
export async function saveAgroGestionTramites(
  rows: AgroTramiteFormRow[],
): Promise<AgroTramiteRecord[]> {
  const { error: delError } = await supabase
    .from('agro_gestion_tramites')
    .delete()
    .eq('unidad_negocio', AGRO_TRAMITES_UNIDAD)

  if (delError) throw delError

  const payload = rows
    .filter((r) => r.nombreProyecto.trim() && r.fechaSolicitud.trim())
    .map((row) => {
      const coords = coordsForSede(row.plantaSede.trim())
      return {
        fecha_solicitud: row.fechaSolicitud.trim(),
        unidad_negocio: AGRO_TRAMITES_UNIDAD,
        planta_sede: row.plantaSede.trim(),
        nombre_proyecto: row.nombreProyecto.trim(),
        estado: row.estado.trim(),
        asignado_a: row.asignadoA.trim(),
        prioridad: row.prioridad.trim(),
        observaciones: row.observaciones.trim(),
        latitud: coords.lat,
        longitud: coords.lng,
      }
    })

  if (!payload.length) return []

  const { data, error } = await supabase
    .from('agro_gestion_tramites')
    .insert(payload)
    .select(SELECT_COLS)

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}
