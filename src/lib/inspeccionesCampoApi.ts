import {
  buildFecha,
  monthFromFecha,
  weekFromFecha,
  type MonitoringMonth,
} from '../data/agroInspecciones'
import {
  buildNotaGeneral,
  inspeccionCampoDetailPath,
  scoreFromHallazgos,
  type InspeccionArea,
  type InspeccionCampoDetail,
  type InspeccionCampoRecord,
  type InspeccionClasificacion,
  type InspeccionHallazgoDraft,
  type InspeccionHallazgoRecord,
} from '../data/inspeccionesCampo'
import { supabase } from './supabase'

const FOTO_BUCKET = 'inspeccion-fotos'

type AreaRow = {
  id: string
  planta_sede: string
  unidad_negocio: string
  nombre: string
}

type CampoRow = {
  id: string
  fecha: string
  unidad_negocio: string
  planta_sede: string
  responsable: string
  comentario_general: string
  nota_general: string
  resultado_general: number | null
  nivel_riesgo: string
  requiere_accion_inmediata: string
  num_hallazgos: number
  estado: string
}

type HallazgoRow = {
  id: string
  inspeccion_id: string
  area_id: string | null
  area_nombre: string
  clasificacion: string
  comentario: string
  foto_urls: string[] | null
  orden: number
}

function mapArea(row: AreaRow): InspeccionArea {
  return {
    id: row.id,
    plantaSede: row.planta_sede,
    unidadNegocio: row.unidad_negocio,
    nombre: row.nombre,
  }
}

function mapCampo(row: CampoRow): InspeccionCampoRecord {
  return {
    id: row.id,
    fecha: row.fecha,
    unidadNegocio: row.unidad_negocio,
    plantaSede: row.planta_sede,
    responsable: row.responsable,
    comentarioGeneral: row.comentario_general,
    notaGeneral: row.nota_general,
    resultadoGeneral: row.resultado_general,
    nivelRiesgo: row.nivel_riesgo,
    requiereAccionInmediata: row.requiere_accion_inmediata,
    numHallazgos: row.num_hallazgos,
    estado: row.estado,
  }
}

function mapHallazgo(row: HallazgoRow): InspeccionHallazgoRecord {
  return {
    id: row.id,
    inspeccionId: row.inspeccion_id,
    areaId: row.area_id,
    areaNombre: row.area_nombre,
    clasificacion: row.clasificacion as InspeccionClasificacion,
    comentario: row.comentario,
    fotoUrls: row.foto_urls ?? [],
    orden: row.orden,
  }
}

/** Fecha local YYYY-MM-DD (evita desfase UTC en Guatemala). */
export function localDateISO(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function loadAreasForPlanta(
  plantaSede: string,
  unidadNegocio: string,
): Promise<InspeccionArea[]> {
  const { data, error } = await supabase
    .from('inspeccion_areas')
    .select('id, planta_sede, unidad_negocio, nombre')
    .eq('planta_sede', plantaSede)
    .eq('unidad_negocio', unidadNegocio)
    .order('nombre')

  if (error) throw error
  return (data ?? []).map((row) => mapArea(row as AreaRow))
}

export async function ensureArea(input: {
  plantaSede: string
  unidadNegocio: string
  nombre: string
}): Promise<InspeccionArea> {
  const nombre = input.nombre.trim()
  if (!nombre) throw new Error('El nombre del área es obligatorio')

  const existing = await loadAreasForPlanta(input.plantaSede, input.unidadNegocio)
  const found = existing.find(
    (a) => a.nombre.toLowerCase() === nombre.toLowerCase(),
  )
  if (found) return found

  const { data, error } = await supabase
    .from('inspeccion_areas')
    .insert({
      planta_sede: input.plantaSede,
      unidad_negocio: input.unidadNegocio,
      nombre,
    })
    .select('id, planta_sede, unidad_negocio, nombre')
    .single()

  if (error) {
    // Carrera: otra sesión pudo crear el mismo nombre
    if (error.code === '23505') {
      const again = await loadAreasForPlanta(input.plantaSede, input.unidadNegocio)
      const retry = again.find(
        (a) => a.nombre.toLowerCase() === nombre.toLowerCase(),
      )
      if (retry) return retry
    }
    throw new Error(`No se pudo guardar el área: ${error.message}`)
  }
  return mapArea(data as AreaRow)
}

function normalizeMime(file: File): string {
  const raw = (file.type || '').toLowerCase().trim()
  if (raw === 'image/jpg' || raw === 'image/pjpeg') return 'image/jpeg'
  if (raw.startsWith('image/')) return raw
  const name = file.name.toLowerCase()
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.heic')) return 'image/heic'
  if (name.endsWith('.heif')) return 'image/heif'
  return 'image/jpeg'
}

function extFromMime(mime: string): string {
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('heic')) return 'heic'
  if (mime.includes('heif')) return 'heif'
  return 'jpg'
}

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'general'
}

/** Sube evidencia al bucket `inspeccion-fotos` y devuelve URL pública. */
export async function uploadInspeccionFoto(
  file: File,
  opts?: { plantaSede?: string; inspeccionId?: string },
): Promise<string> {
  if (!file || file.size <= 0) {
    throw new Error('El archivo de foto está vacío')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('La foto supera 10 MB')
  }

  const mime = normalizeMime(file)
  const planta = slugPart(opts?.plantaSede ?? 'general')
  const inspeccion = slugPart(opts?.inspeccionId ?? 'draft')
  const ext = extFromMime(mime)
  const path = `${planta}/${inspeccion}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

  const { error } = await supabase.storage.from(FOTO_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: mime,
  })

  if (error) {
    throw new Error(`No se pudo subir la foto: ${error.message}`)
  }

  const { data } = supabase.storage.from(FOTO_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) {
    throw new Error('La foto se subió pero no se obtuvo URL pública')
  }
  return data.publicUrl
}

/** Crea la inspección en cuanto se elige el proyecto (estado en_curso). */
export async function createInspeccionCampoDraft(input: {
  plantaSede: string
  unidadNegocio: string
  responsable: string
  fecha?: string
}): Promise<InspeccionCampoRecord> {
  const fecha = input.fecha ?? localDateISO()

  const { data, error } = await supabase
    .from('inspecciones_campo')
    .insert({
      fecha,
      unidad_negocio: input.unidadNegocio,
      planta_sede: input.plantaSede,
      responsable: input.responsable.trim(),
      comentario_general: '',
      nota_general: '',
      resultado_general: null,
      nivel_riesgo: '',
      requiere_accion_inmediata: 'No',
      num_hallazgos: 0,
      estado: 'en_curso',
    })
    .select(
      'id, fecha, unidad_negocio, planta_sede, responsable, comentario_general, nota_general, resultado_general, nivel_riesgo, requiere_accion_inmediata, num_hallazgos, estado',
    )
    .single()

  if (error) {
    throw new Error(`No se pudo iniciar la inspección en DB: ${error.message}`)
  }
  return mapCampo(data as CampoRow)
}

/** Guarda un hallazgo de área de inmediato (fotos + clasificación + comentario). */
export async function saveHallazgoInmediato(input: {
  inspeccionId: string
  hallazgo: InspeccionHallazgoDraft
  orden: number
}): Promise<InspeccionHallazgoRecord> {
  const { data, error } = await supabase
    .from('inspeccion_hallazgos')
    .insert({
      inspeccion_id: input.inspeccionId,
      area_id: input.hallazgo.areaId,
      area_nombre: input.hallazgo.areaNombre,
      clasificacion: input.hallazgo.clasificacion,
      comentario: input.hallazgo.comentario.trim(),
      foto_urls: input.hallazgo.fotoUrls,
      orden: input.orden,
    })
    .select(
      'id, inspeccion_id, area_id, area_nombre, clasificacion, comentario, foto_urls, orden',
    )
    .single()

  if (error) {
    throw new Error(`No se pudo guardar el hallazgo: ${error.message}`)
  }
  return mapHallazgo(data as HallazgoRow)
}

export async function cancelInspeccionCampo(inspeccionId: string): Promise<void> {
  const { error } = await supabase
    .from('inspecciones_campo')
    .update({ estado: 'cancelada' })
    .eq('id', inspeccionId)
    .eq('estado', 'en_curso')

  if (error) {
    console.warn('[inspecciones] cancel:', error.message)
  }
}

/** Cierra la inspección: nota general, scoring y sync a ejecuciones_inspecciones. */
export async function completeInspeccionCampo(input: {
  inspeccionId: string
  plantaSede: string
  unidadNegocio: string
  responsable: string
  comentarioGeneral: string
  hallazgos: InspeccionHallazgoDraft[]
  fecha?: string
}): Promise<{
  inspeccion: InspeccionCampoRecord
  notaGeneral: string
}> {
  const fecha = input.fecha ?? localDateISO()
  const scoring = scoreFromHallazgos(input.hallazgos)
  const notaGeneral = buildNotaGeneral({
    plantaSede: input.plantaSede,
    hallazgos: input.hallazgos,
    comentarioGeneral: input.comentarioGeneral,
  })

  const { data, error } = await supabase
    .from('inspecciones_campo')
    .update({
      comentario_general: input.comentarioGeneral.trim(),
      nota_general: notaGeneral,
      resultado_general: scoring.resultado,
      nivel_riesgo: scoring.nivelRiesgo,
      requiere_accion_inmediata: scoring.requiereAccion,
      num_hallazgos: scoring.numHallazgos,
      estado: 'completada',
      responsable: input.responsable.trim(),
    })
    .eq('id', input.inspeccionId)
    .select(
      'id, fecha, unidad_negocio, planta_sede, responsable, comentario_general, nota_general, resultado_general, nivel_riesgo, requiere_accion_inmediata, num_hallazgos, estado',
    )
    .single()

  if (error) {
    throw new Error(`No se pudo completar la inspección: ${error.message}`)
  }

  await syncEjecucionInspeccion({
    fecha,
    unidadNegocio: input.unidadNegocio,
    plantaSede: input.plantaSede,
    responsable: input.responsable,
    scoring,
    notaGeneral,
    inspeccionCampoId: input.inspeccionId,
  })

  return { inspeccion: mapCampo(data as CampoRow), notaGeneral }
}

/** @deprecated Prefer create + saveHallazgo + complete. Mantiene compatibilidad. */
export async function saveInspeccionCampo(input: {
  plantaSede: string
  unidadNegocio: string
  responsable: string
  comentarioGeneral: string
  hallazgos: InspeccionHallazgoDraft[]
  fecha?: string
}): Promise<{
  inspeccion: InspeccionCampoRecord
  hallazgos: InspeccionHallazgoRecord[]
  notaGeneral: string
}> {
  const draft = await createInspeccionCampoDraft({
    plantaSede: input.plantaSede,
    unidadNegocio: input.unidadNegocio,
    responsable: input.responsable,
    fecha: input.fecha,
  })

  const hallazgos: InspeccionHallazgoRecord[] = []
  for (let i = 0; i < input.hallazgos.length; i++) {
    const saved = await saveHallazgoInmediato({
      inspeccionId: draft.id,
      hallazgo: input.hallazgos[i],
      orden: i + 1,
    })
    hallazgos.push(saved)
  }

  const { inspeccion, notaGeneral } = await completeInspeccionCampo({
    inspeccionId: draft.id,
    plantaSede: input.plantaSede,
    unidadNegocio: input.unidadNegocio,
    responsable: input.responsable,
    comentarioGeneral: input.comentarioGeneral,
    hallazgos: input.hallazgos,
    fecha: input.fecha ?? draft.fecha,
  })

  return { inspeccion, hallazgos, notaGeneral }
}

async function syncEjecucionInspeccion(input: {
  fecha: string
  unidadNegocio: string
  plantaSede: string
  responsable: string
  scoring: ReturnType<typeof scoreFromHallazgos>
  notaGeneral: string
  inspeccionCampoId: string
}) {
  const mes = monthFromFecha(input.fecha)
  if (!mes) {
    throw new Error(`Fecha inválida para sync de reporte: ${input.fecha}`)
  }

  const dia = Number(input.fecha.slice(8, 10)) || 1
  const anio = Number(input.fecha.slice(0, 4))
  const fechaCanon = buildFecha(anio, mes as MonitoringMonth, dia)
  const link = inspeccionCampoDetailPath(input.inspeccionCampoId)

  const payload = {
    dia,
    mes,
    anio,
    semana: weekFromFecha(fechaCanon),
    fecha: fechaCanon,
    unidad_negocio: input.unidadNegocio,
    planta_sede: input.plantaSede,
    responsable: input.responsable.trim(),
    resultado_general: input.scoring.resultado,
    num_hallazgos: input.scoring.numHallazgos,
    nivel_riesgo: input.scoring.nivelRiesgo,
    requiere_accion_inmediata: input.scoring.requiereAccion,
    observaciones: input.notaGeneral,
    informe: 'Abrir informe',
    link,
  }

  const { error } = await supabase.from('ejecuciones_inspecciones').upsert(payload, {
    onConflict: 'fecha,planta_sede,unidad_negocio',
  })

  if (error) {
    throw new Error(
      `Inspección guardada, pero falló el sync al reporte mensual: ${error.message}`,
    )
  }
}

export async function loadInspeccionCampoDetail(
  id: string,
): Promise<InspeccionCampoDetail | null> {
  const { data: campoData, error: campoError } = await supabase
    .from('inspecciones_campo')
    .select(
      'id, fecha, unidad_negocio, planta_sede, responsable, comentario_general, nota_general, resultado_general, nivel_riesgo, requiere_accion_inmediata, num_hallazgos, estado',
    )
    .eq('id', id)
    .maybeSingle()

  if (campoError) throw campoError
  if (!campoData) return null

  const { data: hallData, error: hallError } = await supabase
    .from('inspeccion_hallazgos')
    .select(
      'id, inspeccion_id, area_id, area_nombre, clasificacion, comentario, foto_urls, orden',
    )
    .eq('inspeccion_id', id)
    .order('orden', { ascending: true })

  if (hallError) throw hallError

  return {
    ...mapCampo(campoData as CampoRow),
    hallazgos: (hallData ?? []).map((row) => mapHallazgo(row as HallazgoRow)),
  }
}

/** Resuelve una inspección de campo a partir de fecha + sede (para Abrir legacy). */
export async function findInspeccionCampoId(input: {
  fecha: string
  plantaSede: string
  unidadNegocio: string
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('inspecciones_campo')
    .select('id')
    .eq('fecha', input.fecha)
    .eq('planta_sede', input.plantaSede)
    .eq('unidad_negocio', input.unidadNegocio)
    .eq('estado', 'completada')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
}
