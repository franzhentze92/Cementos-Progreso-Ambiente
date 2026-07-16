import {
  type AgroCompostajeFormRow,
  type AgroCompostajeFinca,
  type AgroCompostajeRecord,
  parseNum,
} from '../data/agroCompostaje'
import { supabase } from './supabase'

type DbRow = {
  id: string
  fecha: string
  finca: string
  toneladas: number | null
}

function mapRow(row: DbRow): AgroCompostajeRecord {
  return {
    id: row.id,
    fecha: row.fecha,
    finca: row.finca as AgroCompostajeFinca,
    toneladas: row.toneladas,
  }
}

export async function loadAgroCompostaje(): Promise<AgroCompostajeRecord[]> {
  const { data, error } = await supabase
    .from('agro_compostaje')
    .select('id, fecha, finca, toneladas')
    .order('fecha', { ascending: false })
    .order('finca')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}

export async function saveAgroCompostajeMonth(
  fecha: string,
  rows: AgroCompostajeFormRow[],
): Promise<AgroCompostajeRecord[]> {
  const payload = rows.map((row) => ({
    fecha,
    finca: row.finca,
    toneladas: parseNum(row.toneladas),
  }))

  const { data, error } = await supabase
    .from('agro_compostaje')
    .upsert(payload, { onConflict: 'fecha,finca' })
    .select('id, fecha, finca, toneladas')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as DbRow))
}
