import {
  AGRO_MONITOREO_UNIDAD,
  buildFecha,
  parseIntSafe,
  parseNum,
  type AgroMonitoreoHeader,
  type AgroMonitoreoParamRow,
  type AgroMonitoreoRecord,
  type MonitoringMonth,
} from '../data/agroMonitoreos'
import { inferLabMedioFromParametro } from '../data/labMonitoreosCatalog'
import { supabase } from './supabase'

type DbRow = {
  id: string
  fecha: string
  unidad_negocio: string
  planta_sede: string
  punto_muestreo: string
  tipo_agua: string
  parametro: string
  resultado: number | null
  unidad: string
  limite_permisible: string
  cumple: string
  observaciones: string
  latitud: number | null
  longitud: number | null
  laboratorio?: string | null
  fuente_informe?: string | null
  medio?: string | null
}

let labMetaColumnsReady: boolean | null = null

async function hasLabMetaColumns(): Promise<boolean> {
  if (labMetaColumnsReady != null) return labMetaColumnsReady
  const { error } = await supabase
    .from('agro_monitoreos_ambientales')
    .select('laboratorio')
    .limit(1)
  labMetaColumnsReady = !error
  return labMetaColumnsReady
}

function mapRow(row: DbRow): AgroMonitoreoRecord {
  const medio =
    row.medio?.trim() ||
    row.tipo_agua?.trim() ||
    ''
  return {
    id: row.id,
    fecha: row.fecha,
    unidadNegocio: row.unidad_negocio ?? AGRO_MONITOREO_UNIDAD,
    plantaSede: row.planta_sede ?? '',
    puntoMuestreo: row.punto_muestreo ?? '',
    tipoAgua: row.tipo_agua ?? '',
    parametro: row.parametro ?? '',
    resultado: row.resultado,
    unidad: row.unidad ?? '',
    limitePermisible: row.limite_permisible ?? '',
    cumple: row.cumple ?? '',
    observaciones: row.observaciones ?? '',
    latitud: row.latitud,
    longitud: row.longitud,
    laboratorio: row.laboratorio ?? '',
    fuenteInforme: row.fuente_informe ?? '',
    medio,
  }
}

export async function loadAgroMonitoreos(): Promise<AgroMonitoreoRecord[]> {
  const { data, error } = await supabase
    .from('agro_monitoreos_ambientales')
    .select('*')
    .eq('unidad_negocio', AGRO_MONITOREO_UNIDAD)
    .order('fecha', { ascending: false })
    .order('parametro')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as unknown as DbRow))
}

/**
 * Guarda un muestreo completo (plantilla de parámetros) para una fecha.
 * Reemplaza filas de esa fecha + sede + punto.
 */
export async function saveAgroMonitoreoMuestreo(
  year: number,
  month: MonitoringMonth,
  header: AgroMonitoreoHeader,
  rows: AgroMonitoreoParamRow[],
): Promise<AgroMonitoreoRecord[]> {
  const dia = parseIntSafe(header.dia) ?? 1
  const fecha = buildFecha(year, month, dia)
  const sede = header.plantaSede.trim()
  const punto = header.puntoMuestreo.trim()
  const withMeta = await hasLabMetaColumns()

  const { error: delError } = await supabase
    .from('agro_monitoreos_ambientales')
    .delete()
    .eq('unidad_negocio', AGRO_MONITOREO_UNIDAD)
    .eq('fecha', fecha)
    .eq('planta_sede', sede)
    .eq('punto_muestreo', punto)

  if (delError) throw delError

  const lat = parseNum(header.latitud)
  const lon = parseNum(header.longitud)
  const medio = header.tipoAgua.trim()

  const payload = rows
    .filter((r) => r.parametro.trim())
    .map((row) => {
      const base: Record<string, unknown> = {
        fecha,
        unidad_negocio: AGRO_MONITOREO_UNIDAD,
        planta_sede: sede,
        punto_muestreo: punto,
        tipo_agua: medio,
        parametro: row.parametro.trim(),
        resultado: parseNum(row.resultado),
        unidad: row.unidad.trim(),
        limite_permisible: row.limitePermisible.trim() || 'No aplica',
        cumple: row.cumple.trim() || 'Si',
        observaciones: row.observaciones.trim(),
        latitud: lat,
        longitud: lon,
      }
      if (withMeta) {
        base.laboratorio = ''
        base.fuente_informe = ''
        base.medio = medio
      }
      return base
    })

  if (!payload.length) return []

  const { data, error } = await supabase
    .from('agro_monitoreos_ambientales')
    .insert(payload)
    .select('*')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as unknown as DbRow))
}

export async function loadLabMonitoreosByUnidad(
  unidadNegocio: string,
): Promise<AgroMonitoreoRecord[]> {
  const { data, error } = await supabase
    .from('agro_monitoreos_ambientales')
    .select('*')
    .eq('unidad_negocio', unidadNegocio)
    .order('fecha', { ascending: false })
    .order('punto_muestreo')
    .order('parametro')

  if (error) throw error
  return (data ?? []).map((row) => mapRow(row as unknown as DbRow))
}

export type LabMuestreoSaveInput = {
  fecha: string
  puntoMuestreo: string
  tipoMedio: string
  latitud: number | null
  longitud: number | null
  parametros: Array<{
    parametro: string
    resultado: number | null
    unidad: string
    limitePermisible: string
    cumple: string
    observaciones: string
  }>
}

/**
 * Guarda un informe de laboratorio completo (1+ puntos de muestreo).
 * Reemplaza por (unidad, fecha, sede, punto) cada punto (todos los medios juntos).
 * Asigna medio por parámetro (LAeq → Ruido, PM → Material particulado, etc.).
 */
export async function saveLabMonitoreoInforme(input: {
  unidadNegocio: string
  plantaSede: string
  fuenteInforme?: string
  laboratorio?: string | null
  medio?: string | null
  muestreos: LabMuestreoSaveInput[]
}): Promise<{ savedRows: number; puntos: number; metaColumns: boolean }> {
  const unidad = input.unidadNegocio.trim() || AGRO_MONITOREO_UNIDAD
  const sede = input.plantaSede.trim() || 'Alicon'
  const fuente = input.fuenteInforme?.trim() || ''
  const laboratorio = input.laboratorio?.trim() || ''
  const medioInforme = input.medio?.trim() || ''
  const withMeta = await hasLabMetaColumns()

  // Agrupa por fecha+punto para no borrar aire al guardar ruido del mismo punto.
  type Group = {
    fecha: string
    punto: string
    latitud: number | null
    longitud: number | null
    rows: Array<{
      medio: string
      parametro: string
      resultado: number | null
      unidad: string
      limitePermisible: string
      cumple: string
      observaciones: string
    }>
  }
  const groups = new Map<string, Group>()

  for (const m of input.muestreos) {
    const fecha = m.fecha?.trim()
    const punto = m.puntoMuestreo.trim()
    if (!fecha || !punto || !m.parametros.length) continue
    const key = `${fecha}|${punto}`
    const group = groups.get(key) ?? {
      fecha,
      punto,
      latitud: m.latitud,
      longitud: m.longitud,
      rows: [],
    }
    if (m.latitud != null) group.latitud = m.latitud
    if (m.longitud != null) group.longitud = m.longitud
    for (const row of m.parametros) {
      if (!row.parametro.trim()) continue
      const medio = inferLabMedioFromParametro(
        row.parametro,
        m.tipoMedio || medioInforme || 'Monitoreo',
      )
      group.rows.push({
        medio,
        parametro: row.parametro.trim(),
        resultado: row.resultado,
        unidad: row.unidad.trim(),
        limitePermisible: row.limitePermisible.trim(),
        cumple: row.cumple.trim(),
        observaciones: row.observaciones.trim(),
      })
    }
    groups.set(key, group)
  }

  let savedRows = 0

  for (const group of groups.values()) {
    const { error: delError } = await supabase
      .from('agro_monitoreos_ambientales')
      .delete()
      .eq('unidad_negocio', unidad)
      .eq('fecha', group.fecha)
      .eq('planta_sede', sede)
      .eq('punto_muestreo', group.punto)

    if (delError) throw delError

    const payload = group.rows.map((row) => {
      const obsParts = [row.observaciones]
      if (!withMeta) {
        if (laboratorio) obsParts.push(`Laboratorio: ${laboratorio}`)
        if (fuente) obsParts.push(`Fuente: ${fuente}`)
        if (medioInforme) obsParts.push(`Medio informe: ${medioInforme}`)
      }
      const base: Record<string, unknown> = {
        fecha: group.fecha,
        unidad_negocio: unidad,
        planta_sede: sede,
        punto_muestreo: group.punto,
        tipo_agua: row.medio,
        parametro: row.parametro,
        resultado: row.resultado,
        unidad: row.unidad,
        limite_permisible: row.limitePermisible || 'No aplica',
        cumple: row.cumple || '',
        observaciones: obsParts.filter(Boolean).join(' · '),
        latitud: group.latitud,
        longitud: group.longitud,
      }
      if (withMeta) {
        base.laboratorio = laboratorio
        base.fuente_informe = fuente
        base.medio = row.medio
      }
      return base
    })

    if (!payload.length) continue

    const { error } = await supabase
      .from('agro_monitoreos_ambientales')
      .insert(payload)

    if (error) throw error
    savedRows += payload.length
  }

  return {
    savedRows,
    puntos: groups.size,
    metaColumns: withMeta,
  }
}
