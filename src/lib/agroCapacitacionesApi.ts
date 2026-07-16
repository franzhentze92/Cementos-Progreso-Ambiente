import {
  AGRO_CAPACITACION_TIPO,
  AGRO_CAPACITACION_UNIDAD,
  buildFecha,
  coordsForSede,
  parseIntSafe,
  type AgroCapacitacionFormRow,
  type AgroCapacitacionRecord,
  type MonitoringMonth,
} from '../data/agroCapacitaciones'
import { supabase } from './supabase'

type DbRow = {
  id: string
  anio: number
  unidad_negocio: string
  planta_sede: string
  tipo_ejecucion: string
  detalle: string
  publico_objetivo: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  comentarios: string
  latitud: number | null
  longitud: number | null
}

function mapRow(row: DbRow): AgroCapacitacionRecord {
  return {
    id: row.id,
    anio: row.anio,
    unidadNegocio: row.unidad_negocio ?? AGRO_CAPACITACION_UNIDAD,
    plantaSede: row.planta_sede ?? '',
    tipoEjecucion: row.tipo_ejecucion ?? AGRO_CAPACITACION_TIPO,
    detalle: row.detalle ?? '',
    publicoObjetivo: row.publico_objetivo ?? '',
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    estado: row.estado ?? '',
    comentarios: row.comentarios ?? '',
    latitud: row.latitud,
    longitud: row.longitud,
  }
}

const SELECT_COLS =
  'id, anio, unidad_negocio, planta_sede, tipo_ejecucion, detalle, publico_objetivo, fecha_inicio, fecha_fin, estado, comentarios, latitud, longitud'

export async function loadAgroCapacitaciones(): Promise<
  AgroCapacitacionRecord[]
> {
  const { data, error } = await supabase
    .from('agro_capacitaciones')
    .select(SELECT_COLS)
    .eq('unidad_negocio', AGRO_CAPACITACION_UNIDAD)
    .eq('tipo_ejecucion', AGRO_CAPACITACION_TIPO)
    .order('fecha_inicio', { ascending: false })
    .order('planta_sede')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

/** Reemplaza capacitaciones Agro del mes (por fecha_inicio). */
export async function saveAgroCapacitacionesMonth(
  year: number,
  month: MonitoringMonth,
  rows: AgroCapacitacionFormRow[],
): Promise<AgroCapacitacionRecord[]> {
  const monthNum = String(
    {
      Enero: 1,
      Febrero: 2,
      Marzo: 3,
      Abril: 4,
      Mayo: 5,
      Junio: 6,
      Julio: 7,
      Agosto: 8,
      Septiembre: 9,
      Octubre: 10,
      Noviembre: 11,
      Diciembre: 12,
    }[month],
  ).padStart(2, '0')
  const from = `${year}-${monthNum}-01`
  const lastDay = new Date(year, Number(monthNum), 0).getDate()
  const to = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`

  const { error: delError } = await supabase
    .from('agro_capacitaciones')
    .delete()
    .eq('unidad_negocio', AGRO_CAPACITACION_UNIDAD)
    .eq('tipo_ejecucion', AGRO_CAPACITACION_TIPO)
    .gte('fecha_inicio', from)
    .lte('fecha_inicio', to)

  if (delError) throw delError

  if (!rows.length) return []

  const payload = rows.map((row) => {
    const diaI = parseIntSafe(row.diaInicio) ?? 1
    const diaF = parseIntSafe(row.diaFin) ?? diaI
    const fechaInicio = buildFecha(year, month, diaI)
    const fechaFin = buildFecha(year, month, diaF)
    const coords = coordsForSede(row.plantaSede.trim())
    return {
      anio: year,
      unidad_negocio: AGRO_CAPACITACION_UNIDAD,
      planta_sede: row.plantaSede.trim(),
      tipo_ejecucion: AGRO_CAPACITACION_TIPO,
      detalle: row.detalle.trim(),
      publico_objetivo: row.publicoObjetivo.trim(),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: row.estado.trim(),
      comentarios: row.comentarios.trim(),
      latitud: coords.lat,
      longitud: coords.lng,
    }
  })

  const { data, error } = await supabase
    .from('agro_capacitaciones')
    .insert(payload)
    .select(SELECT_COLS)

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}
