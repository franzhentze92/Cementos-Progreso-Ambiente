import { ASSIGNABLE_MODULES, APP_MODULE_IDS } from '../data/appModules'
import { supabase } from './supabase'

export async function loadRoleModuleIds(roleCode: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('app_role_modules')
    .select('module_id')
    .eq('role_code', roleCode)

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => r.module_id as string)
}

export async function loadAllRoleModules(): Promise<
  Record<string, string[]>
> {
  const { data, error } = await supabase
    .from('app_role_modules')
    .select('role_code, module_id')

  if (error) throw new Error(error.message)

  const map: Record<string, string[]> = {}
  for (const row of data ?? []) {
    const role = row.role_code as string
    const mod = row.module_id as string
    if (!map[role]) map[role] = []
    map[role].push(mod)
  }
  return map
}

/**
 * Reemplaza el set completo de módulos asignables de un rol.
 * No toca módulos admin (usuarios/accesos) — esos van por cuenta.
 */
export async function setRoleModules(
  roleCode: string,
  moduleIds: string[],
): Promise<void> {
  const allowed = new Set(ASSIGNABLE_MODULES.map((m) => m.id))
  const next = [...new Set(moduleIds.filter((id) => allowed.has(id)))]

  // Siempre incluir perfil si falta (mínimo útil)
  if (!next.includes('perfil')) next.push('perfil')

  const { error: delError } = await supabase
    .from('app_role_modules')
    .delete()
    .eq('role_code', roleCode)

  if (delError) throw new Error(delError.message)

  if (next.length === 0) return

  const { error: insError } = await supabase.from('app_role_modules').insert(
    next.map((module_id) => ({
      role_code: roleCode,
      module_id,
    })),
  )

  if (insError) throw new Error(insError.message)
}

export async function grantAllAssignableModules(
  roleCode: string,
): Promise<void> {
  await setRoleModules(
    roleCode,
    ASSIGNABLE_MODULES.map((m) => m.id),
  )
}

export function isKnownModuleId(id: string): boolean {
  return APP_MODULE_IDS.includes(id)
}
