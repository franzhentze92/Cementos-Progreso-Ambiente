import {
  ALICON_MONITOREO_SEDES,
  ALICON_MONITOREO_UNIDAD,
  monthFromFecha,
  parseIntSafe,
  yearFromFecha,
  type AliconMonitoreoFormRow,
  type AliconMonitoreoRecord,
  type MonitoringMonth,
} from '../data/aliconMonitoreos'
import { supabase } from './supabase'

type DbRow = {
  id: string
  anio: number
  unidad_negocio: string
  planta_sede: string
  tipo_monitoreo: string
  parametro: string
  puntos: number | null
  referencia: string
  comparacion: string
  motivo: string
  fecha_inicio: string
  fecha_fin: string | null
  estado: string
  comentarios: string
}

function mapRow(row: DbRow): AliconMonitoreoRecord {
  return {
    id: row.id,
    anio: row.anio,
    unidadNegocio: row.unidad_negocio ?? '',
    plantaSede: row.planta_sede ?? '',
    tipoMonitoreo: row.tipo_monitoreo ?? '',
    parametro: row.parametro ?? '',
    puntos: row.puntos,
    referencia: row.referencia ?? '',
    comparacion: row.comparacion ?? '',
    motivo: row.motivo ?? '',
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    estado: row.estado ?? '',
    comentarios: row.comentarios ?? '',
  }
}

const SELECT_COLS =
  'id, anio, unidad_negocio, planta_sede, tipo_monitoreo, parametro, puntos, referencia, comparacion, motivo, fecha_inicio, fecha_fin, estado, comentarios'

const SEDES = [...ALICON_MONITOREO_SEDES]

/** Solo sedes Alicon / Subestación Alicon. */
export async function loadAliconMonitoreos(): Promise<AliconMonitoreoRecord[]> {
  const { data, error } = await supabase
    .from('ejecuciones_monitoreos')
    .select(SELECT_COLS)
    .in('planta_sede', SEDES)
    .order('fecha_inicio', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function saveAliconMonitoreosMonth(
  year: number,
  month: MonitoringMonth,
  rows: AliconMonitoreoFormRow[],
): Promise<AliconMonitoreoRecord[]> {
  const existing = await loadAliconMonitoreos()
  const toDelete = existing.filter(
    (r) =>
      yearFromFecha(r.fechaInicio) === year &&
      monthFromFecha(r.fechaInicio) === month,
  )

  if (toDelete.length) {
    const { error: delError } = await supabase
      .from('ejecuciones_monitoreos')
      .delete()
      .in(
        'id',
        toDelete.map((r) => r.id),
      )
    if (delError) throw delError
  }

  if (!rows.length) return []

  const payload = rows.map((row) => {
    const fechaInicio = row.fechaInicio.trim()
    const fechaFin = row.fechaFin.trim() || fechaInicio
    return {
      anio: yearFromFecha(fechaInicio) || year,
      unidad_negocio: ALICON_MONITOREO_UNIDAD,
      planta_sede: row.plantaSede.trim() || 'Alicon',
      tipo_monitoreo: row.tipoMonitoreo.trim(),
      parametro: row.parametro.trim(),
      puntos: parseIntSafe(row.puntos),
      referencia: row.referencia.trim(),
      comparacion: row.comparacion.trim(),
      motivo: row.motivo.trim(),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: row.estado.trim(),
      comentarios: row.comentarios.trim(),
    }
  })

  const seen = new Set<string>()
  const deduped = payload.filter((p) => {
    const k = `${p.fecha_inicio}|${p.planta_sede}|${p.parametro}|${p.tipo_monitoreo}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const { data, error } = await supabase
    .from('ejecuciones_monitoreos')
    .insert(deduped)
    .select(SELECT_COLS)

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}
