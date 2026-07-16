import {
  ROLE_FALLBACK,
  normalizeRoleCode,
  type AppPermission,
  type AppRole,
  type AppRoleInput,
  type AppUser,
  type AppUserInput,
  type AppUserWithPassword,
} from '../data/users'
import { supabase } from './supabase'

type RoleRow = {
  code: string
  label: string
  description: string
  sort_order: number
  permissions: unknown
}

type UserRow = {
  id: string
  username: string
  password: string
  name: string
  email: string
  role_code: string
  department: string
  active: boolean
  created_at: string
  updated_at: string
}

function parsePermissions(raw: unknown): AppPermission[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((p): p is string => typeof p === 'string')
}

function mapRole(row: RoleRow): AppRole {
  const fallback = ROLE_FALLBACK[row.code]
  const perms = parsePermissions(row.permissions)
  return {
    code: row.code,
    label: row.label || fallback?.label || row.code,
    description: row.description || fallback?.description || '',
    sortOrder: row.sort_order ?? 99,
    permissions: perms.length ? perms : fallback?.permissions ?? [],
  }
}

function mapUser(row: UserRow): AppUser {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    role: row.role_code,
    department: row.department ?? '',
    active: row.active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapUserWithPassword(row: UserRow): AppUserWithPassword {
  return { ...mapUser(row), password: row.password }
}

const USER_SELECT =
  'id, username, password, name, email, role_code, department, active, created_at, updated_at'

export async function loadAppRoles(): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from('app_roles')
    .select('code, label, description, sort_order, permissions')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data as RoleRow[] | null)?.map(mapRole) ?? []
}

export async function createAppRole(input: AppRoleInput): Promise<AppRole> {
  const code = normalizeRoleCode(input.code)
  if (!code) throw new Error('El código del rol es obligatorio')
  if (!input.label.trim()) throw new Error('El nombre del rol es obligatorio')

  const { data, error } = await supabase
    .from('app_roles')
    .insert({
      code,
      label: input.label.trim(),
      description: input.description.trim(),
      sort_order: input.sortOrder ?? 99,
      permissions: input.permissions,
    })
    .select('code, label, description, sort_order, permissions')
    .single()

  if (error) throw new Error(error.message)
  return mapRole(data as RoleRow)
}

export async function updateAppRole(
  code: string,
  input: Omit<AppRoleInput, 'code'>,
): Promise<AppRole> {
  if (!input.label.trim()) throw new Error('El nombre del rol es obligatorio')

  const { data, error } = await supabase
    .from('app_roles')
    .update({
      label: input.label.trim(),
      description: input.description.trim(),
      sort_order: input.sortOrder ?? 99,
      permissions: input.permissions,
    })
    .eq('code', code)
    .select('code, label, description, sort_order, permissions')
    .single()

  if (error) throw new Error(error.message)
  return mapRole(data as RoleRow)
}

export async function deleteAppRole(code: string): Promise<void> {
  const { count, error: countError } = await supabase
    .from('app_users')
    .select('id', { count: 'exact', head: true })
    .eq('role_code', code)

  if (countError) throw new Error(countError.message)
  if ((count ?? 0) > 0) {
    throw new Error(
      `No se puede eliminar el rol "${code}": hay ${count} usuario(s) asignados. Cámbiales el rol primero.`,
    )
  }

  const { error } = await supabase.from('app_roles').delete().eq('code', code)
  if (error) throw new Error(error.message)
}

export async function loadAppUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from('app_users')
    .select(USER_SELECT)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data as UserRow[] | null)?.map(mapUser) ?? []
}

export async function loadAppUserById(id: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('app_users')
    .select(USER_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapUser(data as UserRow)
}

/**
 * Login simulado: valida username + password contra app_users activos.
 */
export async function authenticateAppUser(
  username: string,
  password: string,
): Promise<AppUser | null> {
  const normalized = username.trim().toLowerCase()
  if (!normalized || !password) return null

  const { data, error } = await supabase
    .from('app_users')
    .select(USER_SELECT)
    .eq('active', true)

  if (error) throw new Error(error.message)

  const row = ((data as UserRow[] | null) ?? []).find(
    (u) =>
      u.username.toLowerCase() === normalized && u.password === password,
  )
  if (!row) return null
  return mapUser(row)
}

async function assertRoleExists(roleCode: string) {
  const { data, error } = await supabase
    .from('app_roles')
    .select('code')
    .eq('code', roleCode)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error(`El rol "${roleCode}" no existe. Créalo primero.`)
}

export async function createAppUser(input: AppUserInput): Promise<AppUser> {
  if (!input.password?.trim()) {
    throw new Error('La contraseña es obligatoria para un usuario nuevo')
  }
  if (!input.role.trim()) throw new Error('El rol es obligatorio')
  await assertRoleExists(input.role)

  const { data, error } = await supabase
    .from('app_users')
    .insert({
      username: input.username.trim(),
      password: input.password,
      name: input.name.trim(),
      email: input.email.trim(),
      role_code: input.role,
      department: input.department.trim(),
      active: input.active ?? true,
    })
    .select(USER_SELECT)
    .single()

  if (error) throw new Error(error.message)
  return mapUser(data as UserRow)
}

export async function updateAppUser(
  id: string,
  input: AppUserInput,
): Promise<AppUser> {
  if (!input.role.trim()) throw new Error('El rol es obligatorio')
  await assertRoleExists(input.role)

  const patch: Record<string, unknown> = {
    username: input.username.trim(),
    name: input.name.trim(),
    email: input.email.trim(),
    role_code: input.role,
    department: input.department.trim(),
    active: input.active ?? true,
  }
  if (input.password?.trim()) {
    patch.password = input.password
  }

  const { data, error } = await supabase
    .from('app_users')
    .update(patch)
    .eq('id', id)
    .select(USER_SELECT)
    .single()

  if (error) throw new Error(error.message)
  return mapUser(data as UserRow)
}

export async function setAppUserPassword(
  id: string,
  password: string,
): Promise<void> {
  if (!password.trim()) throw new Error('La contraseña no puede estar vacía')
  const { error } = await supabase
    .from('app_users')
    .update({ password })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function setAppUserActive(
  id: string,
  active: boolean,
): Promise<AppUser> {
  const { data, error } = await supabase
    .from('app_users')
    .update({ active })
    .eq('id', id)
    .select(USER_SELECT)
    .single()

  if (error) throw new Error(error.message)
  return mapUser(data as UserRow)
}

export async function deleteAppUser(id: string): Promise<void> {
  const { error } = await supabase.from('app_users').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function loadAppUserWithPassword(
  id: string,
): Promise<AppUserWithPassword | null> {
  const { data, error } = await supabase
    .from('app_users')
    .select(USER_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapUserWithPassword(data as UserRow)
}

export function roleLabel(code: string): string {
  return ROLE_FALLBACK[code]?.label ?? code
}
