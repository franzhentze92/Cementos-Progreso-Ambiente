import {
  AGRO_NDA_UNIDAD,
  computeNda,
  coordsForSede,
  parseNum,
  semanaFromMonth,
  type AgroNdaGeneralFormRow,
  type AgroNdaGeneralRecord,
  type MonitoringMonth,
} from '../data/agroNdaGeneral'
import { supabase } from './supabase'

type DbRow = {
  id: string
  fecha: string
  semana: number | null
  unidad_negocio: string
  planta_sede: string
  nota_ida: number | null
  casco_verde: number | null
  incidentes: number | null
  compromisos: number | null
  nda: number | null
  proyecto_matriz: string
  latitud: number | null
  longitud: number | null
}

function mapRow(row: DbRow): AgroNdaGeneralRecord {
  return {
    id: row.id,
    fecha: row.fecha,
    semana: row.semana,
    unidadNegocio: row.unidad_negocio ?? AGRO_NDA_UNIDAD,
    plantaSede: row.planta_sede ?? '',
    notaIda: row.nota_ida,
    cascoVerde: row.casco_verde,
    incidentes: row.incidentes,
    compromisos: row.compromisos,
    nda: row.nda,
    proyectoMatriz: row.proyecto_matriz ?? '',
    latitud: row.latitud,
    longitud: row.longitud,
  }
}

const SELECT_COLS =
  'id, fecha, semana, unidad_negocio, planta_sede, nota_ida, casco_verde, incidentes, compromisos, nda, proyecto_matriz, latitud, longitud'

export async function loadAgroNdaGeneral(): Promise<AgroNdaGeneralRecord[]> {
  const { data, error } = await supabase
    .from('agro_nda_general')
    .select(SELECT_COLS)
    .eq('unidad_negocio', AGRO_NDA_UNIDAD)
    .order('fecha', { ascending: false })
    .order('planta_sede')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

/** Upsert de las filas del mes (día 28). */
export async function saveAgroNdaGeneralMonth(
  fecha: string,
  month: MonitoringMonth,
  rows: AgroNdaGeneralFormRow[],
): Promise<AgroNdaGeneralRecord[]> {
  const payload = rows
    .filter((r) => {
      const hasAny =
        parseNum(r.notaIda) != null ||
        parseNum(r.cascoVerde) != null ||
        parseNum(r.incidentes) != null ||
        parseNum(r.compromisos) != null
      return r.plantaSede.trim() && hasAny
    })
    .map((row) => {
      const ida = parseNum(row.notaIda)
      const casco = parseNum(row.cascoVerde)
      const incidentes = parseNum(row.incidentes)
      const compromisos = parseNum(row.compromisos)
      const coords = coordsForSede(row.plantaSede.trim())
      return {
        fecha,
        semana: semanaFromMonth(month),
        unidad_negocio: AGRO_NDA_UNIDAD,
        planta_sede: row.plantaSede.trim(),
        nota_ida: ida,
        casco_verde: casco,
        incidentes,
        compromisos,
        nda: computeNda(ida, casco, incidentes, compromisos),
        proyecto_matriz: row.proyectoMatriz.trim() || row.plantaSede.trim(),
        latitud: coords.lat,
        longitud: coords.lng,
      }
    })

  // Clear empty sedes for the month, then upsert filled ones
  const { error: delError } = await supabase
    .from('agro_nda_general')
    .delete()
    .eq('unidad_negocio', AGRO_NDA_UNIDAD)
    .eq('fecha', fecha)

  if (delError) throw delError

  if (!payload.length) return []

  const { data, error } = await supabase
    .from('agro_nda_general')
    .insert(payload)
    .select(SELECT_COLS)

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}
