import {
  type AgroConsumoAguaRecord,
  type AgroConsumoFormRow,
  type AgroSede,
  parseNum,
} from '../data/agroConsumoAgua'
import { supabase } from './supabase'

type DbRow = {
  id: string
  fecha: string
  sede: string
  sitio_consumo: string
  consumo_m3: number | null
}

function mapRow(row: DbRow): AgroConsumoAguaRecord {
  return {
    id: row.id,
    fecha: row.fecha,
    sede: row.sede as AgroSede,
    sitioConsumo: row.sitio_consumo,
    consumoM3: row.consumo_m3,
  }
}

export async function loadAgroConsumoAgua(): Promise<AgroConsumoAguaRecord[]> {
  const { data, error } = await supabase
    .from('agro_consumo_agua')
    .select('id, fecha, sede, sitio_consumo, consumo_m3')
    .order('fecha', { ascending: false })
    .order('sede')
    .order('sitio_consumo')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function saveAgroConsumoAguaMonth(
  fecha: string,
  rows: AgroConsumoFormRow[],
): Promise<AgroConsumoAguaRecord[]> {
  const payload = rows.map((row) => ({
    fecha,
    sede: row.sede,
    sitio_consumo: row.sitioConsumo,
    consumo_m3: parseNum(row.consumoM3),
  }))

  const { data, error } = await supabase
    .from('agro_consumo_agua')
    .upsert(payload, { onConflict: 'fecha,sede,sitio_consumo' })
    .select('id, fecha, sede, sitio_consumo, consumo_m3')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function deleteAgroConsumoAguaRecord(id: string): Promise<void> {
  const { error } = await supabase.from('agro_consumo_agua').delete().eq('id', id)
  if (error) throw error
}
