import {
  AGRO_INCIDENTE_UNIDAD,
  anioMesFromFecha,
  buildFecha,
  mesTextoFromFecha,
  monthFromFecha,
  parseIntSafe,
  pctToValor,
  yearFromFecha,
  type AgroIncidenteFormRow,
  type AgroIncidenteRecord,
  type MonitoringMonth,
} from '../data/agroIncidentes'
import { supabase } from './supabase'

type DbRow = {
  id: string
  fecha: string
  anio_mes: string
  mes_texto: string
  unidad_negocio: string
  planta_sede: string
  instrumento: string
  descripcion: string
  valor_incidente: number | null
  estado: string
  comentarios: string
  acciones_realizadas: string
  responsables: string
  link: string
}

function mapRow(row: DbRow): AgroIncidenteRecord {
  return {
    id: row.id,
    fecha: row.fecha,
    anioMes: row.anio_mes,
    mesTexto: row.mes_texto ?? '',
    unidadNegocio: row.unidad_negocio ?? '',
    plantaSede: row.planta_sede ?? '',
    instrumento: row.instrumento ?? '',
    descripcion: row.descripcion ?? '',
    valorIncidente: row.valor_incidente,
    estado: row.estado ?? '',
    comentarios: row.comentarios ?? '',
    accionesRealizadas: row.acciones_realizadas ?? '',
    responsables: row.responsables ?? '',
    link: row.link ?? '',
  }
}

const SELECT_COLS =
  'id, fecha, anio_mes, mes_texto, unidad_negocio, planta_sede, instrumento, descripcion, valor_incidente, estado, comentarios, acciones_realizadas, responsables, link'

export async function loadAgroIncidentes(): Promise<AgroIncidenteRecord[]> {
  const { data, error } = await supabase
    .from('incidentes_ambientales')
    .select(SELECT_COLS)
    .eq('unidad_negocio', AGRO_INCIDENTE_UNIDAD)
    .order('fecha', { ascending: false })
    .order('planta_sede')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function saveAgroIncidentesMonth(
  year: number,
  month: MonitoringMonth,
  rows: AgroIncidenteFormRow[],
): Promise<AgroIncidenteRecord[]> {
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
  const anioMes = `${year}-${monthNum}-01`

  const { error: delError } = await supabase
    .from('incidentes_ambientales')
    .delete()
    .eq('unidad_negocio', AGRO_INCIDENTE_UNIDAD)
    .eq('anio_mes', anioMes)

  if (delError) throw delError

  if (!rows.length) return []

  const payload = rows.map((row) => {
    const dia = parseIntSafe(row.dia) ?? 1
    const fecha = buildFecha(year, month, dia)
    return {
      fecha,
      anio_mes: anioMesFromFecha(fecha),
      mes_texto: mesTextoFromFecha(fecha),
      unidad_negocio: AGRO_INCIDENTE_UNIDAD,
      planta_sede: row.plantaSede.trim(),
      instrumento: row.instrumento.trim(),
      descripcion: row.descripcion.trim(),
      valor_incidente: pctToValor(row.valorPct),
      estado: row.estado.trim(),
      comentarios: row.comentarios.trim(),
      acciones_realizadas: row.accionesRealizadas.trim(),
      responsables: row.responsables.trim(),
      link: row.link.trim(),
    }
  })

  const { data, error } = await supabase
    .from('incidentes_ambientales')
    .insert(payload)
    .select(SELECT_COLS)

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function deleteAgroIncidente(id: string): Promise<void> {
  const { error } = await supabase
    .from('incidentes_ambientales')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export { monthFromFecha, yearFromFecha }
