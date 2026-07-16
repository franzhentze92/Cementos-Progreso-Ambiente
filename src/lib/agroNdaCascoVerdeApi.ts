import {
  AGRO_NDA_CV_TIPO,
  AGRO_NDA_CV_UNIDAD,
  buildFecha,
  coordsForSede,
  parseIntSafe,
  parseNum,
  weekFromFecha,
  type AgroNdaCascoVerdeFormRow,
  type AgroNdaCascoVerdeRecord,
  type MonitoringMonth,
} from '../data/agroNdaCascoVerde'
import { supabase } from './supabase'

type DbRow = {
  id: string
  fecha: string
  semana: number | null
  unidad_negocio: string
  planta_sede: string
  tipo_inspeccion: string
  no_inspeccion: number | null
  inspector: string
  nota: number | null
  hallazgos_criticos: number | null
  observaciones: string
  link: string
  latitud: number | null
  longitud: number | null
}

function mapRow(row: DbRow): AgroNdaCascoVerdeRecord {
  return {
    id: row.id,
    fecha: row.fecha,
    semana: row.semana,
    unidadNegocio: row.unidad_negocio ?? AGRO_NDA_CV_UNIDAD,
    plantaSede: row.planta_sede ?? '',
    tipoInspeccion: row.tipo_inspeccion ?? AGRO_NDA_CV_TIPO,
    noInspeccion: row.no_inspeccion,
    inspector: row.inspector ?? '',
    nota: row.nota,
    hallazgosCriticos: row.hallazgos_criticos ?? 0,
    observaciones: row.observaciones ?? '',
    link: row.link ?? '',
    latitud: row.latitud,
    longitud: row.longitud,
  }
}

const SELECT_COLS =
  'id, fecha, semana, unidad_negocio, planta_sede, tipo_inspeccion, no_inspeccion, inspector, nota, hallazgos_criticos, observaciones, link, latitud, longitud'

export async function loadAgroNdaCascoVerde(): Promise<
  AgroNdaCascoVerdeRecord[]
> {
  const { data, error } = await supabase
    .from('agro_nda_casco_verde')
    .select(SELECT_COLS)
    .eq('unidad_negocio', AGRO_NDA_CV_UNIDAD)
    .order('fecha', { ascending: false })
    .order('no_inspeccion')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

/** Reemplaza inspecciones Casco Verde del mes. */
export async function saveAgroNdaCascoVerdeMonth(
  year: number,
  month: MonitoringMonth,
  rows: AgroNdaCascoVerdeFormRow[],
): Promise<AgroNdaCascoVerdeRecord[]> {
  const monthPrefix = `${year}-${String(
    [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ].indexOf(month) + 1,
  ).padStart(2, '0')}`

  const { data: existing, error: loadErr } = await supabase
    .from('agro_nda_casco_verde')
    .select('id, fecha')
    .eq('unidad_negocio', AGRO_NDA_CV_UNIDAD)
    .gte('fecha', `${monthPrefix}-01`)
    .lte('fecha', `${monthPrefix}-31`)

  if (loadErr) throw loadErr

  const ids = (existing ?? []).map((r) => r.id as string)
  if (ids.length) {
    const { error: delError } = await supabase
      .from('agro_nda_casco_verde')
      .delete()
      .in('id', ids)
    if (delError) throw delError
  }

  const payload = rows
    .filter((r) => r.plantaSede.trim() && r.inspector.trim())
    .map((row) => {
      const dia = parseIntSafe(row.dia) ?? 1
      const fecha = buildFecha(year, month, dia)
      const coords = coordsForSede(row.plantaSede.trim())
      return {
        fecha,
        semana: weekFromFecha(fecha),
        unidad_negocio: AGRO_NDA_CV_UNIDAD,
        planta_sede: row.plantaSede.trim(),
        tipo_inspeccion: AGRO_NDA_CV_TIPO,
        no_inspeccion: parseIntSafe(row.noInspeccion),
        inspector: row.inspector.trim(),
        nota: parseNum(row.nota),
        hallazgos_criticos: parseIntSafe(row.hallazgosCriticos) ?? 0,
        observaciones: row.observaciones.trim(),
        link: row.link.trim(),
        latitud: coords.lat,
        longitud: coords.lng,
      }
    })

  if (!payload.length) return []

  const { data, error } = await supabase
    .from('agro_nda_casco_verde')
    .insert(payload)
    .select(SELECT_COLS)

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}
