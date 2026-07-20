import {
  AGRO_MONITOREO_UNIDAD,
  buildFecha,
  parseIntSafe,
  parseNum,
  type AgroMonitoreoHeader,
  type AgroMonitoreoParamRow,
  type AgroMonitoreoRecord,
  type MonitoringMonth,
} from '../data/agroMonitoreos'
import { supabase } from './supabase'

type DbRow = {
  id: string
  fecha: string
  unidad_negocio: string
  planta_sede: string
  punto_muestreo: string
  tipo_agua: string
  parametro: string
  resultado: number | null
  unidad: string
  limite_permisible: string
  cumple: string
  observaciones: string
  latitud: number | null
  longitud: number | null
}

function mapRow(row: DbRow): AgroMonitoreoRecord {
  return {
    id: row.id,
    fecha: row.fecha,
    unidadNegocio: row.unidad_negocio ?? AGRO_MONITOREO_UNIDAD,
    plantaSede: row.planta_sede ?? '',
    puntoMuestreo: row.punto_muestreo ?? '',
    tipoAgua: row.tipo_agua ?? '',
    parametro: row.parametro ?? '',
    resultado: row.resultado,
    unidad: row.unidad ?? '',
    limitePermisible: row.limite_permisible ?? '',
    cumple: row.cumple ?? '',
    observaciones: row.observaciones ?? '',
    latitud: row.latitud,
    longitud: row.longitud,
  }
}

const SELECT_COLS =
  'id, fecha, unidad_negocio, planta_sede, punto_muestreo, tipo_agua, parametro, resultado, unidad, limite_permisible, cumple, observaciones, latitud, longitud'

export async function loadAgroMonitoreos(): Promise<AgroMonitoreoRecord[]> {
  const { data, error } = await supabase
    .from('agro_monitoreos_ambientales')
    .select(SELECT_COLS)
    .eq('unidad_negocio', AGRO_MONITOREO_UNIDAD)
    .order('fecha', { ascending: false })
    .order('parametro')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

/**
 * Guarda un muestreo completo (plantilla de parámetros) para una fecha.
 * Reemplaza filas de esa fecha + sede + punto.
 */
export async function saveAgroMonitoreoMuestreo(
  year: number,
  month: MonitoringMonth,
  header: AgroMonitoreoHeader,
  rows: AgroMonitoreoParamRow[],
): Promise<AgroMonitoreoRecord[]> {
  const dia = parseIntSafe(header.dia) ?? 1
  const fecha = buildFecha(year, month, dia)
  const sede = header.plantaSede.trim()
  const punto = header.puntoMuestreo.trim()

  const { error: delError } = await supabase
    .from('agro_monitoreos_ambientales')
    .delete()
    .eq('unidad_negocio', AGRO_MONITOREO_UNIDAD)
    .eq('fecha', fecha)
    .eq('planta_sede', sede)
    .eq('punto_muestreo', punto)

  if (delError) throw delError

  const lat = parseNum(header.latitud)
  const lon = parseNum(header.longitud)

  const payload = rows
    .filter((r) => r.parametro.trim())
    .map((row) => ({
      fecha,
      unidad_negocio: AGRO_MONITOREO_UNIDAD,
      planta_sede: sede,
      punto_muestreo: punto,
      tipo_agua: header.tipoAgua.trim(),
      parametro: row.parametro.trim(),
      resultado: parseNum(row.resultado),
      unidad: row.unidad.trim(),
      limite_permisible: row.limitePermisible.trim() || 'No aplica',
      cumple: row.cumple.trim() || 'Si',
      observaciones: row.observaciones.trim(),
      latitud: lat,
      longitud: lon,
    }))

  if (!payload.length) return []

  const { data, error } = await supabase
    .from('agro_monitoreos_ambientales')
    .insert(payload)
    .select(SELECT_COLS)

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function loadLabMonitoreosByUnidad(
  unidadNegocio: string,
): Promise<AgroMonitoreoRecord[]> {
  const { data, error } = await supabase
    .from('agro_monitoreos_ambientales')
    .select(SELECT_COLS)
    .eq('unidad_negocio', unidadNegocio)
    .order('fecha', { ascending: false })
    .order('punto_muestreo')
    .order('parametro')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export type LabMuestreoSaveInput = {
  fecha: string
  puntoMuestreo: string
  tipoMedio: string
  latitud: number | null
  longitud: number | null
  parametros: Array<{
    parametro: string
    resultado: number | null
    unidad: string
    limitePermisible: string
    cumple: string
    observaciones: string
  }>
}

/**
 * Guarda un informe de laboratorio completo (1+ puntos de muestreo).
 * Reemplaza por (unidad, fecha, sede, punto) cada muestreo.
 */
export async function saveLabMonitoreoInforme(input: {
  unidadNegocio: string
  plantaSede: string
  fuenteInforme?: string
  muestreos: LabMuestreoSaveInput[]
}): Promise<{ savedRows: number; puntos: number }> {
  const unidad = input.unidadNegocio.trim() || AGRO_MONITOREO_UNIDAD
  const sede = input.plantaSede.trim() || 'Alicon'
  let savedRows = 0

  for (const m of input.muestreos) {
    const fecha = m.fecha?.trim()
    const punto = m.puntoMuestreo.trim()
    if (!fecha || !punto || !m.parametros.length) continue

    const { error: delError } = await supabase
      .from('agro_monitoreos_ambientales')
      .delete()
      .eq('unidad_negocio', unidad)
      .eq('fecha', fecha)
      .eq('planta_sede', sede)
      .eq('punto_muestreo', punto)

    if (delError) throw delError

    const fuente = input.fuenteInforme?.trim()
    const payload = m.parametros
      .filter((r) => r.parametro.trim())
      .map((row) => {
        const obs = [row.observaciones.trim(), fuente ? `Fuente: ${fuente}` : '']
          .filter(Boolean)
          .join(' · ')
        return {
          fecha,
          unidad_negocio: unidad,
          planta_sede: sede,
          punto_muestreo: punto,
          tipo_agua: m.tipoMedio.trim() || 'Monitoreo',
          parametro: row.parametro.trim(),
          resultado: row.resultado,
          unidad: row.unidad.trim(),
          limite_permisible: row.limitePermisible.trim() || 'No aplica',
          cumple: row.cumple.trim() || '',
          observaciones: obs,
          latitud: m.latitud,
          longitud: m.longitud,
        }
      })

    if (!payload.length) continue

    const { error } = await supabase
      .from('agro_monitoreos_ambientales')
      .insert(payload)

    if (error) throw error
    savedRows += payload.length
  }

  return {
    savedRows,
    puntos: input.muestreos.filter((m) => m.parametros.length > 0).length,
  }
}
