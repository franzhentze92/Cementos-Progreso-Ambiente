import {
  AGRO_LICENCIA_UNIDAD,
  coordsForSede,
  parseVigencia,
  type AgroLicenciaFormRow,
  type AgroLicenciaRecord,
} from '../data/agroLicencias'
import { supabase } from './supabase'

type DbRow = {
  id: string
  unidad_negocio: string
  planta_sede: string
  licencia: string
  expediente: string
  categoria: string
  vigencia: string
  vigencia_inicio: string | null
  vigencia_fin: string | null
  estado: string
  latitud: number | null
  longitud: number | null
}

function mapRow(row: DbRow): AgroLicenciaRecord {
  return {
    id: row.id,
    unidadNegocio: row.unidad_negocio ?? AGRO_LICENCIA_UNIDAD,
    plantaSede: row.planta_sede ?? '',
    licencia: row.licencia ?? '',
    expediente: row.expediente ?? '',
    categoria: row.categoria ?? '',
    vigencia: row.vigencia ?? '',
    vigenciaInicio: row.vigencia_inicio,
    vigenciaFin: row.vigencia_fin,
    estado: row.estado ?? '',
    latitud: row.latitud,
    longitud: row.longitud,
  }
}

const SELECT_COLS =
  'id, unidad_negocio, planta_sede, licencia, expediente, categoria, vigencia, vigencia_inicio, vigencia_fin, estado, latitud, longitud'

export async function loadAgroLicencias(): Promise<AgroLicenciaRecord[]> {
  const { data, error } = await supabase
    .from('agro_licencias_ambientales')
    .select(SELECT_COLS)
    .eq('unidad_negocio', AGRO_LICENCIA_UNIDAD)
    .order('planta_sede')
    .order('licencia')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

/** Reemplaza el catálogo completo Agroprogreso. */
export async function saveAgroLicencias(
  rows: AgroLicenciaFormRow[],
): Promise<AgroLicenciaRecord[]> {
  const { error: delError } = await supabase
    .from('agro_licencias_ambientales')
    .delete()
    .eq('unidad_negocio', AGRO_LICENCIA_UNIDAD)

  if (delError) throw delError

  if (!rows.length) return []

  const payload = rows
    .filter((r) => r.licencia.trim() || r.expediente.trim())
    .map((row) => {
      const parsed = parseVigencia(row.vigencia)
      const coords = coordsForSede(row.plantaSede.trim())
      return {
        unidad_negocio: AGRO_LICENCIA_UNIDAD,
        planta_sede: row.plantaSede.trim(),
        licencia: row.licencia.trim(),
        expediente: row.expediente.trim(),
        categoria: row.categoria.trim(),
        vigencia: parsed.label,
        vigencia_inicio: parsed.inicio,
        vigencia_fin: parsed.fin,
        estado: row.estado.trim().toUpperCase(),
        latitud: coords.lat,
        longitud: coords.lng,
      }
    })

  if (!payload.length) return []

  const { data, error } = await supabase
    .from('agro_licencias_ambientales')
    .insert(payload)
    .select(SELECT_COLS)

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}
