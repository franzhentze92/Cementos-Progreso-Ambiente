import {
  parseNum,
  type AgroResiduosFormRow,
  type AgroResiduosRecord,
} from '../data/agroResiduos'
import { supabase } from './supabase'

type DbRow = {
  id: string
  fecha: string
  sede: string
  clasificacion_operativa: string
  tipo_residuos: string
  clasificacion_tecnica: string
  cantidad_lbs: number | null
  ruta_gestion: string
  gestor_planta: string
}

function mapRow(row: DbRow): AgroResiduosRecord {
  return {
    id: row.id,
    fecha: row.fecha,
    sede: row.sede,
    clasificacionOperativa: row.clasificacion_operativa ?? '',
    tipoResiduos: row.tipo_residuos ?? '',
    clasificacionTecnica: row.clasificacion_tecnica ?? '',
    cantidadLbs: row.cantidad_lbs,
    rutaGestion: row.ruta_gestion ?? '',
    gestorPlanta: row.gestor_planta ?? '',
  }
}

export async function loadAgroResiduos(): Promise<AgroResiduosRecord[]> {
  const { data, error } = await supabase
    .from('agro_gestion_residuos')
    .select(
      'id, fecha, sede, clasificacion_operativa, tipo_residuos, clasificacion_tecnica, cantidad_lbs, ruta_gestion, gestor_planta',
    )
    .order('fecha', { ascending: false })
    .order('sede')
    .order('tipo_residuos')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function saveAgroResiduosMonth(
  fecha: string,
  rows: AgroResiduosFormRow[],
): Promise<AgroResiduosRecord[]> {
  const { error: delError } = await supabase
    .from('agro_gestion_residuos')
    .delete()
    .eq('fecha', fecha)

  if (delError) throw delError

  if (!rows.length) return []

  const payload = rows.map((row) => ({
    fecha,
    sede: row.sede.trim(),
    clasificacion_operativa: row.clasificacionOperativa.trim(),
    tipo_residuos: row.tipoResiduos.trim(),
    clasificacion_tecnica: row.clasificacionTecnica.trim(),
    cantidad_lbs: parseNum(row.cantidadLbs),
    ruta_gestion: row.rutaGestion.trim(),
    gestor_planta: row.gestorPlanta.trim(),
  }))

  const { data, error } = await supabase
    .from('agro_gestion_residuos')
    .insert(payload)
    .select(
      'id, fecha, sede, clasificacion_operativa, tipo_residuos, clasificacion_tecnica, cantidad_lbs, ruta_gestion, gestor_planta',
    )

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function deleteAgroResiduosRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from('agro_gestion_residuos')
    .delete()
    .eq('id', id)
  if (error) throw error
}
