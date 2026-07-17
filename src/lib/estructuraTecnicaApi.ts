import { supabase } from './supabase'
import {
  buildStructureModules,
  type StructureModuleNode,
} from '../data/estructuraTecnica'

export type ModuleLiveStats = {
  moduleId: string
  rowCount: number
  tables: string[]
}

async function countTable(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (error) return 0
  return count ?? 0
}

/** Conteo exacto de filas por módulo (suma de tablas asociadas). */
export async function loadStructureLiveStats(
  modules: StructureModuleNode[] = buildStructureModules(),
): Promise<Record<string, ModuleLiveStats>> {
  const withTables = modules.filter((m) => m.tables.length > 0)
  const uniqueTables = [...new Set(withTables.flatMap((m) => m.tables))]

  const counts = await Promise.all(
    uniqueTables.map(async (table) => [table, await countTable(table)] as const),
  )
  const byTable = Object.fromEntries(counts) as Record<string, number>

  const out: Record<string, ModuleLiveStats> = {}
  for (const m of withTables) {
    const rowCount = m.tables.reduce((sum, t) => sum + (byTable[t] ?? 0), 0)
    out[m.id] = { moduleId: m.id, rowCount, tables: m.tables }
  }
  return out
}
