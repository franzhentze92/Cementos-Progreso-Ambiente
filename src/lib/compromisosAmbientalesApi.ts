import {
  type AsignacionRecord,
  type CompromisoForm,
  type CompromisoHito,
  type CompromisoHitoForm,
  type CompromisoRecord,
  type EvidenciaForm,
  type EvidenciaRecord,
  type SeguimientoForm,
  type SeguimientoRecord,
  deriveEstado,
} from '../data/compromisosAmbientales'
import { supabase } from './supabase'

type CompromisoDb = {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  unidad_negocio: string
  sitio: string
  area_operativa: string
  origen: string
  origen_ref: string
  tipo: string
  responsable_principal: string
  colaboradores: string
  revisor: string
  aprobador: string
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  proxima_ejecucion: string | null
  periodicidad: string
  prioridad: string
  criticidad: string
  estado: string
  porcentaje_avance: number
  criterio_cumplimiento: string
  evidencias_requeridas: string
  alerta_dias: number
  notas: string
  created_by: string
  created_at?: string
  updated_at?: string
}

type HitoDb = {
  id: string
  compromiso_id: string
  titulo: string
  descripcion: string
  fecha_objetivo: string | null
  estado: string
  orden: number
}

type EvidenciaDb = {
  id: string
  compromiso_id: string
  titulo: string
  tipo_evidencia: string
  descripcion: string
  fecha_cumplimiento: string | null
  periodo: string
  sitio: string
  area: string
  archivo_url: string
  archivo_nombre: string
  estado_revision: string
  revisado_por: string
  fecha_revision: string | null
  notas_revision: string
  version: number
  reemplaza_id: string | null
  cargado_por: string
  created_at?: string
}

type SeguimientoDb = {
  id: string
  compromiso_id: string
  tipo_evento: string
  descripcion: string
  comentario: string
  porcentaje_avance: number | null
  estado_anterior: string
  estado_nuevo: string
  fecha_anterior: string | null
  fecha_nueva: string | null
  bloqueo: string
  autor: string
  created_at: string
}

type AsignacionDb = {
  id: string
  compromiso_id: string
  persona: string
  rol: string
  sitio: string
  activo: boolean
}

const COMPROMISO_COLS =
  'id, codigo, titulo, descripcion, unidad_negocio, sitio, area_operativa, origen, origen_ref, tipo, responsable_principal, colaboradores, revisor, aprobador, fecha_inicio, fecha_vencimiento, proxima_ejecucion, periodicidad, prioridad, criticidad, estado, porcentaje_avance, criterio_cumplimiento, evidencias_requeridas, alerta_dias, notas, created_by, created_at, updated_at'

const HITO_COLS =
  'id, compromiso_id, titulo, descripcion, fecha_objetivo, estado, orden'

const EVIDENCIA_COLS =
  'id, compromiso_id, titulo, tipo_evidencia, descripcion, fecha_cumplimiento, periodo, sitio, area, archivo_url, archivo_nombre, estado_revision, revisado_por, fecha_revision, notas_revision, version, reemplaza_id, cargado_por, created_at'

const SEGUIMIENTO_COLS =
  'id, compromiso_id, tipo_evento, descripcion, comentario, porcentaje_avance, estado_anterior, estado_nuevo, fecha_anterior, fecha_nueva, bloqueo, autor, created_at'

const ASIGNACION_COLS = 'id, compromiso_id, persona, rol, sitio, activo'

function mapCompromiso(row: CompromisoDb): CompromisoRecord {
  return {
    id: row.id,
    codigo: row.codigo ?? '',
    titulo: row.titulo ?? '',
    descripcion: row.descripcion ?? '',
    unidadNegocio: row.unidad_negocio ?? '',
    sitio: row.sitio ?? '',
    areaOperativa: row.area_operativa ?? '',
    origen: row.origen ?? '',
    origenRef: row.origen_ref ?? '',
    tipo: row.tipo ?? '',
    responsablePrincipal: row.responsable_principal ?? '',
    colaboradores: row.colaboradores ?? '',
    revisor: row.revisor ?? '',
    aprobador: row.aprobador ?? '',
    fechaInicio: row.fecha_inicio,
    fechaVencimiento: row.fecha_vencimiento,
    proximaEjecucion: row.proxima_ejecucion,
    periodicidad: row.periodicidad ?? 'Única',
    prioridad: row.prioridad ?? 'Media',
    criticidad: row.criticidad ?? 'Media',
    estado: row.estado ?? 'Pendiente',
    porcentajeAvance: Number(row.porcentaje_avance ?? 0),
    criterioCumplimiento: row.criterio_cumplimiento ?? '',
    evidenciasRequeridas: row.evidencias_requeridas ?? '',
    alertaDias: Number(row.alerta_dias ?? 15),
    notas: row.notas ?? '',
    createdBy: row.created_by ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapHito(row: HitoDb): CompromisoHito {
  return {
    id: row.id,
    compromisoId: row.compromiso_id,
    titulo: row.titulo ?? '',
    descripcion: row.descripcion ?? '',
    fechaObjetivo: row.fecha_objetivo,
    estado: row.estado ?? 'Pendiente',
    orden: Number(row.orden ?? 0),
  }
}

function mapEvidencia(row: EvidenciaDb): EvidenciaRecord {
  return {
    id: row.id,
    compromisoId: row.compromiso_id,
    titulo: row.titulo ?? '',
    tipoEvidencia: row.tipo_evidencia ?? 'Informe',
    descripcion: row.descripcion ?? '',
    fechaCumplimiento: row.fecha_cumplimiento,
    periodo: row.periodo ?? '',
    sitio: row.sitio ?? '',
    area: row.area ?? '',
    archivoUrl: row.archivo_url ?? '',
    archivoNombre: row.archivo_nombre ?? '',
    estadoRevision: row.estado_revision ?? 'Pendiente de revisión',
    revisadoPor: row.revisado_por ?? '',
    fechaRevision: row.fecha_revision,
    notasRevision: row.notas_revision ?? '',
    version: Number(row.version ?? 1),
    reemplazaId: row.reemplaza_id,
    cargadoPor: row.cargado_por ?? '',
    createdAt: row.created_at,
  }
}

function mapSeguimiento(row: SeguimientoDb): SeguimientoRecord {
  return {
    id: row.id,
    compromisoId: row.compromiso_id,
    tipoEvento: row.tipo_evento ?? 'comentario',
    descripcion: row.descripcion ?? '',
    comentario: row.comentario ?? '',
    porcentajeAvance:
      row.porcentaje_avance == null ? null : Number(row.porcentaje_avance),
    estadoAnterior: row.estado_anterior ?? '',
    estadoNuevo: row.estado_nuevo ?? '',
    fechaAnterior: row.fecha_anterior,
    fechaNueva: row.fecha_nueva,
    bloqueo: row.bloqueo ?? '',
    autor: row.autor ?? '',
    createdAt: row.created_at,
  }
}

function mapAsignacion(row: AsignacionDb): AsignacionRecord {
  return {
    id: row.id,
    compromisoId: row.compromiso_id,
    persona: row.persona ?? '',
    rol: row.rol ?? 'Colaborador',
    sitio: row.sitio ?? '',
    activo: row.activo !== false,
  }
}

function compromisoPayload(form: CompromisoForm) {
  const avance = Math.min(
    100,
    Math.max(0, Number(form.porcentajeAvance) || 0),
  )
  const estado = deriveEstado(
    form.estado.trim() || 'Pendiente',
    form.fechaVencimiento || null,
    avance,
  )
  return {
    codigo: form.codigo.trim(),
    titulo: form.titulo.trim(),
    descripcion: form.descripcion.trim(),
    unidad_negocio: form.unidadNegocio.trim() || 'Agroprogreso',
    sitio: form.sitio.trim(),
    area_operativa: form.areaOperativa.trim(),
    origen: form.origen.trim() || 'Plan de manejo',
    origen_ref: form.origenRef.trim(),
    tipo: form.tipo.trim() || 'Monitoreo',
    responsable_principal: form.responsablePrincipal.trim(),
    colaboradores: form.colaboradores.trim(),
    revisor: form.revisor.trim(),
    aprobador: form.aprobador.trim(),
    fecha_inicio: form.fechaInicio || null,
    fecha_vencimiento: form.fechaVencimiento || null,
    proxima_ejecucion: form.proximaEjecucion || null,
    periodicidad: form.periodicidad.trim() || 'Única',
    prioridad: form.prioridad.trim() || 'Media',
    criticidad: form.criticidad.trim() || 'Media',
    estado,
    porcentaje_avance: avance,
    criterio_cumplimiento: form.criterioCumplimiento.trim(),
    evidencias_requeridas: form.evidenciasRequeridas.trim(),
    alerta_dias: Math.max(0, Number(form.alertaDias) || 15),
    notas: form.notas.trim(),
    created_by: form.createdBy.trim(),
  }
}

async function insertSeguimiento(payload: {
  compromiso_id: string
  tipo_evento: string
  descripcion?: string
  comentario?: string
  porcentaje_avance?: number | null
  estado_anterior?: string
  estado_nuevo?: string
  fecha_anterior?: string | null
  fecha_nueva?: string | null
  bloqueo?: string
  autor?: string
}) {
  const { error } = await supabase.from('compromisos_seguimiento').insert({
    compromiso_id: payload.compromiso_id,
    tipo_evento: payload.tipo_evento,
    descripcion: payload.descripcion ?? '',
    comentario: payload.comentario ?? '',
    porcentaje_avance: payload.porcentaje_avance ?? null,
    estado_anterior: payload.estado_anterior ?? '',
    estado_nuevo: payload.estado_nuevo ?? '',
    fecha_anterior: payload.fecha_anterior ?? null,
    fecha_nueva: payload.fecha_nueva ?? null,
    bloqueo: payload.bloqueo ?? '',
    autor: payload.autor ?? '',
  })
  if (error) throw error
}

async function replaceAsignaciones(
  compromisoId: string,
  form: CompromisoForm,
) {
  const { error: delError } = await supabase
    .from('compromisos_asignaciones')
    .delete()
    .eq('compromiso_id', compromisoId)
  if (delError) throw delError

  const rows: Array<{
    compromiso_id: string
    persona: string
    rol: string
    sitio: string
    activo: boolean
  }> = []

  const push = (persona: string, rol: string) => {
    const p = persona.trim()
    if (!p) return
    rows.push({
      compromiso_id: compromisoId,
      persona: p,
      rol,
      sitio: form.sitio.trim(),
      activo: true,
    })
  }

  push(form.responsablePrincipal, 'Propietario')
  push(form.revisor, 'Revisor')
  push(form.aprobador, 'Aprobador')
  for (const col of form.colaboradores.split(/[,;]/).map((s) => s.trim())) {
    if (col) push(col, 'Colaborador')
  }

  if (rows.length === 0) return
  const { error } = await supabase.from('compromisos_asignaciones').insert(rows)
  if (error) throw error
}

async function replaceHitos(
  compromisoId: string,
  hitos: CompromisoHitoForm[],
) {
  const { error: delError } = await supabase
    .from('compromisos_hitos')
    .delete()
    .eq('compromiso_id', compromisoId)
  if (delError) throw delError

  const valid = hitos.filter((h) => h.titulo.trim())
  if (valid.length === 0) return

  const { error } = await supabase.from('compromisos_hitos').insert(
    valid.map((h, i) => ({
      compromiso_id: compromisoId,
      titulo: h.titulo.trim(),
      descripcion: h.descripcion.trim(),
      fecha_objetivo: h.fechaObjetivo || null,
      estado: h.estado.trim() || 'Pendiente',
      orden: h.orden || i,
    })),
  )
  if (error) throw error
}

export async function loadCompromisos(): Promise<CompromisoRecord[]> {
  const { data, error } = await supabase
    .from('compromisos_ambientales')
    .select(COMPROMISO_COLS)
    .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
    .order('codigo', { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => mapCompromiso(row as CompromisoDb))
}

export async function loadCompromisoById(
  id: string,
): Promise<CompromisoRecord | null> {
  const { data, error } = await supabase
    .from('compromisos_ambientales')
    .select(COMPROMISO_COLS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ? mapCompromiso(data as CompromisoDb) : null
}

export async function loadHitos(
  compromisoId?: string,
): Promise<CompromisoHito[]> {
  let q = supabase
    .from('compromisos_hitos')
    .select(HITO_COLS)
    .order('orden', { ascending: true })
  if (compromisoId) q = q.eq('compromiso_id', compromisoId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row) => mapHito(row as HitoDb))
}

export async function upsertCompromiso(
  form: CompromisoForm,
  opts: { autor?: string } = {},
): Promise<CompromisoRecord> {
  if (!form.titulo.trim()) {
    throw new Error('El título del compromiso es obligatorio')
  }
  if (!form.criterioCumplimiento.trim()) {
    throw new Error(
      'Defina el criterio de cumplimiento (qué evidencia demuestra el cierre)',
    )
  }
  if (!form.responsablePrincipal.trim()) {
    throw new Error('Asigne un responsable principal')
  }

  const payload = compromisoPayload(form)
  const autor = (opts.autor ?? form.createdBy ?? '').trim() || 'Sistema'

  if (form.id) {
    const prev = await loadCompromisoById(form.id)
    const { data, error } = await supabase
      .from('compromisos_ambientales')
      .update(payload)
      .eq('id', form.id)
      .select(COMPROMISO_COLS)
      .single()
    if (error) throw error
    const saved = mapCompromiso(data as CompromisoDb)

    await replaceHitos(saved.id, form.hitos)
    await replaceAsignaciones(saved.id, form)

    if (prev) {
      if (prev.estado !== saved.estado) {
        await insertSeguimiento({
          compromiso_id: saved.id,
          tipo_evento: /cumplid/i.test(saved.estado)
            ? 'cerrado'
            : 'cambio_estado',
          descripcion: `Estado: ${prev.estado} → ${saved.estado}`,
          estado_anterior: prev.estado,
          estado_nuevo: saved.estado,
          porcentaje_avance: saved.porcentajeAvance,
          autor,
        })
      }
      if (prev.porcentajeAvance !== saved.porcentajeAvance) {
        await insertSeguimiento({
          compromiso_id: saved.id,
          tipo_evento: 'avance',
          descripcion: `Avance ${prev.porcentajeAvance}% → ${saved.porcentajeAvance}%`,
          porcentaje_avance: saved.porcentajeAvance,
          autor,
        })
      }
      if (prev.fechaVencimiento !== saved.fechaVencimiento) {
        await insertSeguimiento({
          compromiso_id: saved.id,
          tipo_evento: 'fecha_modificada',
          descripcion: 'Fecha de vencimiento modificada',
          fecha_anterior: prev.fechaVencimiento,
          fecha_nueva: saved.fechaVencimiento,
          autor,
        })
      }
      if (prev.responsablePrincipal !== saved.responsablePrincipal) {
        await insertSeguimiento({
          compromiso_id: saved.id,
          tipo_evento: 'asignado',
          descripcion: `Responsable: ${saved.responsablePrincipal}`,
          autor,
        })
      }
    }

    return saved
  }

  if (!payload.created_by) payload.created_by = autor

  const { data, error } = await supabase
    .from('compromisos_ambientales')
    .insert(payload)
    .select(COMPROMISO_COLS)
    .single()
  if (error) throw error
  const saved = mapCompromiso(data as CompromisoDb)

  await replaceHitos(saved.id, form.hitos)
  await replaceAsignaciones(saved.id, form)

  await insertSeguimiento({
    compromiso_id: saved.id,
    tipo_evento: 'creado',
    descripcion: `Compromiso ${saved.codigo || saved.titulo} registrado`,
    estado_nuevo: saved.estado,
    porcentaje_avance: saved.porcentajeAvance,
    autor,
  })

  if (saved.responsablePrincipal) {
    await insertSeguimiento({
      compromiso_id: saved.id,
      tipo_evento: 'asignado',
      descripcion: `Responsable principal: ${saved.responsablePrincipal}`,
      autor,
    })
  }

  return saved
}

export async function deleteCompromiso(id: string): Promise<void> {
  const { error } = await supabase
    .from('compromisos_ambientales')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function loadEvidencias(
  compromisoId?: string,
): Promise<EvidenciaRecord[]> {
  let q = supabase
    .from('compromisos_evidencias')
    .select(EVIDENCIA_COLS)
    .order('created_at', { ascending: false })
  if (compromisoId) q = q.eq('compromiso_id', compromisoId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row) => mapEvidencia(row as EvidenciaDb))
}

export async function upsertEvidencia(
  form: EvidenciaForm,
  opts: { autor?: string } = {},
): Promise<EvidenciaRecord> {
  if (!form.compromisoId) throw new Error('Seleccione un compromiso')
  if (!form.titulo.trim()) throw new Error('El título de la evidencia es obligatorio')

  const payload = {
    compromiso_id: form.compromisoId,
    titulo: form.titulo.trim(),
    tipo_evidencia: form.tipoEvidencia.trim() || 'Informe',
    descripcion: form.descripcion.trim(),
    fecha_cumplimiento: form.fechaCumplimiento || null,
    periodo: form.periodo.trim(),
    sitio: form.sitio.trim(),
    area: form.area.trim(),
    archivo_url: form.archivoUrl.trim(),
    archivo_nombre: form.archivoNombre.trim(),
    estado_revision: form.estadoRevision.trim() || 'Pendiente de revisión',
    revisado_por: form.revisadoPor.trim(),
    fecha_revision: form.fechaRevision || null,
    notas_revision: form.notasRevision.trim(),
    version: Math.max(1, Number(form.version) || 1),
    cargado_por: form.cargadoPor.trim() || opts.autor || '',
  }

  const autor = (opts.autor ?? form.cargadoPor ?? '').trim() || 'Sistema'

  if (form.id) {
    const prev = await supabase
      .from('compromisos_evidencias')
      .select('estado_revision')
      .eq('id', form.id)
      .maybeSingle()
    const { data, error } = await supabase
      .from('compromisos_evidencias')
      .update(payload)
      .eq('id', form.id)
      .select(EVIDENCIA_COLS)
      .single()
    if (error) throw error
    const saved = mapEvidencia(data as EvidenciaDb)

    const prevEstado = (prev.data as { estado_revision?: string } | null)
      ?.estado_revision
    if (prevEstado && prevEstado !== saved.estadoRevision) {
      await insertSeguimiento({
        compromiso_id: saved.compromisoId,
        tipo_evento: 'revision',
        descripcion: `Evidencia «${saved.titulo}»: ${prevEstado} → ${saved.estadoRevision}`,
        autor: saved.revisadoPor || autor,
      })
    }
    return saved
  }

  const { data, error } = await supabase
    .from('compromisos_evidencias')
    .insert(payload)
    .select(EVIDENCIA_COLS)
    .single()
  if (error) throw error
  const saved = mapEvidencia(data as EvidenciaDb)

  await insertSeguimiento({
    compromiso_id: saved.compromisoId,
    tipo_evento: 'evidencia',
    descripcion: `Evidencia cargada: ${saved.titulo} (${saved.tipoEvidencia})`,
    autor,
  })

  return saved
}

export async function deleteEvidencia(id: string): Promise<void> {
  const { error } = await supabase
    .from('compromisos_evidencias')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function loadSeguimiento(
  compromisoId?: string,
): Promise<SeguimientoRecord[]> {
  let q = supabase
    .from('compromisos_seguimiento')
    .select(SEGUIMIENTO_COLS)
    .order('created_at', { ascending: false })
  if (compromisoId) q = q.eq('compromiso_id', compromisoId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row) => mapSeguimiento(row as SeguimientoDb))
}

export async function createSeguimiento(
  form: SeguimientoForm,
): Promise<SeguimientoRecord> {
  if (!form.compromisoId) throw new Error('Seleccione un compromiso')
  if (!form.descripcion.trim() && !form.comentario.trim()) {
    throw new Error('Escriba una descripción o comentario')
  }

  const avanceRaw = form.porcentajeAvance.trim()
  const avance =
    avanceRaw === '' ? null : Math.min(100, Math.max(0, Number(avanceRaw) || 0))

  const { data, error } = await supabase
    .from('compromisos_seguimiento')
    .insert({
      compromiso_id: form.compromisoId,
      tipo_evento: form.tipoEvento.trim() || 'comentario',
      descripcion: form.descripcion.trim(),
      comentario: form.comentario.trim(),
      porcentaje_avance: avance,
      estado_anterior: form.estadoAnterior.trim(),
      estado_nuevo: form.estadoNuevo.trim(),
      fecha_anterior: form.fechaAnterior || null,
      fecha_nueva: form.fechaNueva || null,
      bloqueo: form.bloqueo.trim(),
      autor: form.autor.trim() || 'Sistema',
    })
    .select(SEGUIMIENTO_COLS)
    .single()
  if (error) throw error

  const saved = mapSeguimiento(data as SeguimientoDb)

  // Sync avance/estado onto the master commitment when provided
  if (avance != null || form.estadoNuevo.trim()) {
    const patch: Record<string, unknown> = {}
    if (avance != null) patch.porcentaje_avance = avance
    if (form.estadoNuevo.trim()) patch.estado = form.estadoNuevo.trim()
    if (Object.keys(patch).length > 0) {
      await supabase
        .from('compromisos_ambientales')
        .update(patch)
        .eq('id', form.compromisoId)
    }
  }

  return saved
}

export async function deleteSeguimiento(id: string): Promise<void> {
  const { error } = await supabase
    .from('compromisos_seguimiento')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function loadAsignaciones(
  compromisoId?: string,
): Promise<AsignacionRecord[]> {
  let q = supabase
    .from('compromisos_asignaciones')
    .select(ASIGNACION_COLS)
    .eq('activo', true)
    .order('persona', { ascending: true })
  if (compromisoId) q = q.eq('compromiso_id', compromisoId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row) => mapAsignacion(row as AsignacionDb))
}

export async function countEvidenciasByCompromiso(): Promise<
  Record<string, number>
> {
  const { data, error } = await supabase
    .from('compromisos_evidencias')
    .select('compromiso_id')
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const id = (row as { compromiso_id: string }).compromiso_id
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}
