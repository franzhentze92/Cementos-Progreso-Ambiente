import {
  AGRO_INSPECCION_UNIDAD,
  buildFecha,
  parseIntSafe,
  parseNum,
  weekFromFecha,
  type AgroInspeccionFormRow,
  type AgroInspeccionRecord,
  type MonitoringMonth,
} from '../data/agroInspecciones'
import { supabase } from './supabase'

type DbRow = {
  id: string
  dia: number
  mes: string
  anio: number
  semana: number | null
  fecha: string
  unidad_negocio: string
  planta_sede: string
  responsable: string
  resultado_general: number | null
  num_hallazgos: number | null
  nivel_riesgo: string
  requiere_accion_inmediata: string
  observaciones: string
  informe: string
  link: string
}

function mapRow(row: DbRow): AgroInspeccionRecord {
  return {
    id: row.id,
    dia: row.dia,
    mes: row.mes as MonitoringMonth,
    anio: row.anio,
    semana: row.semana,
    fecha: row.fecha,
    unidadNegocio: row.unidad_negocio ?? '',
    plantaSede: row.planta_sede ?? '',
    responsable: row.responsable ?? '',
    resultadoGeneral: row.resultado_general,
    numHallazgos: row.num_hallazgos,
    nivelRiesgo: row.nivel_riesgo ?? '',
    requiereAccionInmediata: row.requiere_accion_inmediata ?? '',
    observaciones: row.observaciones ?? '',
    informe: row.informe ?? 'Abrir informe',
    link: row.link ?? '',
  }
}

const SELECT_COLS =
  'id, dia, mes, anio, semana, fecha, unidad_negocio, planta_sede, responsable, resultado_general, num_hallazgos, nivel_riesgo, requiere_accion_inmediata, observaciones, informe, link'

/** Solo filas Agroprogreso (entrada / reporte Agro). */
export async function loadAgroInspecciones(): Promise<AgroInspeccionRecord[]> {
  const { data, error } = await supabase
    .from('ejecuciones_inspecciones')
    .select(SELECT_COLS)
    .eq('unidad_negocio', AGRO_INSPECCION_UNIDAD)
    .order('fecha', { ascending: false })
    .order('planta_sede')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function saveAgroInspeccionesMonth(
  year: number,
  month: MonitoringMonth,
  rows: AgroInspeccionFormRow[],
): Promise<AgroInspeccionRecord[]> {
  const { error: delError } = await supabase
    .from('ejecuciones_inspecciones')
    .delete()
    .eq('unidad_negocio', AGRO_INSPECCION_UNIDAD)
    .eq('anio', year)
    .eq('mes', month)

  if (delError) throw delError

  if (!rows.length) return []

  const payload = rows.map((row) => {
    const dia = parseIntSafe(row.dia) ?? 1
    const fecha = buildFecha(year, month, dia)
    return {
      dia,
      mes: month,
      anio: year,
      semana: weekFromFecha(fecha),
      fecha,
      unidad_negocio: AGRO_INSPECCION_UNIDAD,
      planta_sede: row.plantaSede.trim(),
      responsable: row.responsable.trim(),
      resultado_general: parseNum(row.resultadoGeneral),
      num_hallazgos: parseIntSafe(row.numHallazgos),
      nivel_riesgo: row.nivelRiesgo.trim(),
      requiere_accion_inmediata: row.requiereAccionInmediata.trim(),
      observaciones: row.observaciones.trim(),
      informe: row.informe.trim() || 'Abrir informe',
      link: row.link.trim(),
    }
  })

  // Evitar choque unique si dos filas mismos fecha+sede
  const seen = new Set<string>()
  const deduped = payload.filter((p) => {
    const k = `${p.fecha}|${p.planta_sede}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const { data, error } = await supabase
    .from('ejecuciones_inspecciones')
    .insert(deduped)
    .select(SELECT_COLS)

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function deleteAgroInspeccion(id: string): Promise<void> {
  const { error } = await supabase
    .from('ejecuciones_inspecciones')
    .delete()
    .eq('id', id)
  if (error) throw error
}
