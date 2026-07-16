import catalog from './chat/knowledge/catalog.json'
import { extractPdfText } from './pdfExtract'
import { supabase } from './supabase'

const BUCKET = 'biblioteca-docs'
const MAX_UPLOAD_BYTES = 40 * 1024 * 1024

export type BibliotecaDoc = {
  /** Id estable para UI / copiloto (uuid o catalog_id). */
  id: string
  dbId: string | null
  catalogId: string | null
  title: string
  category: string
  sourcePath: string
  fileName: string | null
  fileUrl: string | null
  storagePath: string | null
  pages: number
  sizeMb: number
  charCount: number
  summary: string
  text: string
  note: string | null
  truncated: boolean
  enabledInCopilot: boolean
  /** true = viene del catálogo estático (puede tener override en DB). */
  isCatalog: boolean
  /** true = subido / gestionado solo en Supabase. */
  isManaged: boolean
  updatedAt: string | null
}

type DbRow = {
  id: string
  catalog_id: string | null
  title: string
  category: string
  file_name: string | null
  storage_path: string | null
  file_url: string | null
  size_mb: number | string
  pages: number
  char_count: number
  summary: string
  body_text: string
  note: string | null
  truncated: boolean
  enabled_in_copilot: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

type CatalogDoc = (typeof catalog.documents)[number]

export type BibliotecaDocInput = {
  title: string
  category: string
  enabledInCopilot?: boolean
  file?: File | null
}

let cache: BibliotecaDoc[] | null = null
let cachePromise: Promise<BibliotecaDoc[]> | null = null

export function invalidateBibliotecaCache() {
  cache = null
  cachePromise = null
}

function num(v: number | string | null | undefined) {
  const n = typeof v === 'string' ? Number(v) : v
  return Number.isFinite(n) ? (n as number) : 0
}

function fromCatalog(doc: CatalogDoc): BibliotecaDoc {
  return {
    id: doc.id,
    dbId: null,
    catalogId: doc.id,
    title: doc.title,
    category: doc.category,
    sourcePath: doc.sourcePath,
    fileName: doc.sourcePath.split('/').pop() ?? null,
    fileUrl: null,
    storagePath: null,
    pages: doc.pages ?? 0,
    sizeMb: doc.sizeMb ?? 0,
    charCount: doc.charCount ?? 0,
    summary: doc.summary ?? '',
    text: doc.text ?? '',
    note: doc.note ?? null,
    truncated: Boolean(doc.truncated),
    enabledInCopilot: (doc.charCount ?? 0) > 80,
    isCatalog: true,
    isManaged: false,
    updatedAt: catalog.generatedAt,
  }
}

function fromDbRow(row: DbRow, base?: BibliotecaDoc): BibliotecaDoc {
  const catalogId = row.catalog_id
  const isCatalog = Boolean(catalogId)
  return {
    id: catalogId || row.id,
    dbId: row.id,
    catalogId,
    title: row.title,
    category: row.category,
    sourcePath:
      row.file_url ||
      base?.sourcePath ||
      (row.file_name ? `biblioteca/${row.file_name}` : 'biblioteca'),
    fileName: row.file_name ?? base?.fileName ?? null,
    fileUrl: row.file_url ?? base?.fileUrl ?? null,
    storagePath: row.storage_path ?? base?.storagePath ?? null,
    pages: row.pages ?? base?.pages ?? 0,
    sizeMb: num(row.size_mb) || base?.sizeMb || 0,
    charCount: row.char_count ?? base?.charCount ?? 0,
    summary: row.summary || base?.summary || '',
    text: row.body_text || base?.text || '',
    note: row.note ?? base?.note ?? null,
    truncated: row.truncated ?? base?.truncated ?? false,
    enabledInCopilot: row.enabled_in_copilot,
    isCatalog,
    isManaged: !isCatalog || Boolean(row.storage_path),
    updatedAt: row.updated_at,
  }
}

async function fetchDbRows(): Promise<DbRow[]> {
  const { data, error } = await supabase
    .from('biblioteca_documentos')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as DbRow[] | null) ?? []
}

/** Lista unificada: catálogo + uploads/overrides de Supabase. */
export async function loadBibliotecaDocs(force = false): Promise<BibliotecaDoc[]> {
  if (!force && cache) return cache
  if (!force && cachePromise) return cachePromise

  cachePromise = (async () => {
    let rows: DbRow[] = []
    try {
      rows = await fetchDbRows()
    } catch (err) {
      console.warn('[biblioteca] Supabase no disponible, usando solo catálogo', err)
    }
    const byCatalog = new Map<string, DbRow>()
    const uploads: DbRow[] = []

    for (const row of rows) {
      if (row.catalog_id) byCatalog.set(row.catalog_id, row)
      else if (!row.is_deleted) uploads.push(row)
    }

    const catalogDocs = (catalog.documents ?? []) as CatalogDoc[]
    const merged: BibliotecaDoc[] = []

    for (const doc of catalogDocs) {
      const ov = byCatalog.get(doc.id)
      if (ov?.is_deleted) continue
      if (ov) merged.push(fromDbRow(ov, fromCatalog(doc)))
      else merged.push(fromCatalog(doc))
    }

    for (const row of uploads) {
      merged.push(fromDbRow(row))
    }

    merged.sort((a, b) => a.title.localeCompare(b.title, 'es'))
    cache = merged
    return merged
  })()

  try {
    return await cachePromise
  } catch (err) {
    cachePromise = null
    throw err
  }
}

/** Documentos activos para el copiloto. */
export async function loadKnowledgeDocsForCopilot(): Promise<
  Array<{
    id: string
    title: string
    category: string
    sourcePath: string
    pages: number
    sizeMb: number
    truncated?: boolean
    note?: string
    charCount: number
    summary: string
    text: string
  }>
> {
  const docs = await loadBibliotecaDocs()
  return docs
    .filter((d) => d.enabledInCopilot && d.charCount > 80)
    .map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      sourcePath: d.sourcePath,
      pages: d.pages,
      sizeMb: d.sizeMb,
      truncated: d.truncated,
      note: d.note ?? undefined,
      charCount: d.charCount,
      summary: d.summary,
      text: d.text,
    }))
}

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80)
}

async function uploadPdf(file: File): Promise<{ path: string; url: string }> {
  if (!file || file.size <= 0) throw new Error('El archivo PDF está vacío')
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('El PDF supera el límite de 40 MB')
  }
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
    throw new Error('Solo se permiten archivos PDF')
  }

  const path = `${Date.now()}-${slugify(file.name) || 'documento'}.pdf`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'application/pdf',
  })
  if (error) throw new Error(`No se pudo subir el PDF: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) {
    throw new Error('El PDF se subió pero no se obtuvo URL pública')
  }
  return { path, url: data.publicUrl }
}

async function removeStorage(path: string | null | undefined) {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}

/** Sube un PDF nuevo y lo registra en la biblioteca. */
export async function createBibliotecaDoc(
  input: BibliotecaDocInput,
): Promise<BibliotecaDoc> {
  if (!input.file) throw new Error('Selecciona un archivo PDF')
  const title = input.title.trim()
  const category = input.category.trim() || 'General'
  if (!title) throw new Error('El título es obligatorio')

  const extracted = await extractPdfText(input.file)
  const uploaded = await uploadPdf(input.file)
  const enabled =
    input.enabledInCopilot ?? extracted.charCount > 80

  const { data, error } = await supabase
    .from('biblioteca_documentos')
    .insert({
      catalog_id: null,
      title,
      category,
      file_name: input.file.name,
      storage_path: uploaded.path,
      file_url: uploaded.url,
      size_mb: Number((input.file.size / (1024 * 1024)).toFixed(2)),
      pages: extracted.pages,
      char_count: extracted.charCount,
      summary: extracted.summary,
      body_text: extracted.text,
      note: extracted.note,
      truncated: extracted.truncated,
      enabled_in_copilot: enabled && extracted.charCount > 80,
      is_deleted: false,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    await removeStorage(uploaded.path)
    throw new Error(error.message)
  }

  invalidateBibliotecaCache()
  return fromDbRow(data as DbRow)
}

async function upsertCatalogOverride(
  catalogId: string,
  patch: Partial<DbRow> & { title: string; category: string },
): Promise<DbRow> {
  const existing = await supabase
    .from('biblioteca_documentos')
    .select('id')
    .eq('catalog_id', catalogId)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)

  if (existing.data?.id) {
    const { data, error } = await supabase
      .from('biblioteca_documentos')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', existing.data.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as DbRow
  }

  const base = ((catalog.documents ?? []) as CatalogDoc[]).find(
    (d) => d.id === catalogId,
  )
  const { data, error } = await supabase
    .from('biblioteca_documentos')
    .insert({
      catalog_id: catalogId,
      file_name: base?.sourcePath.split('/').pop() ?? null,
      storage_path: null,
      file_url: null,
      size_mb: base?.sizeMb ?? 0,
      pages: base?.pages ?? 0,
      char_count: base?.charCount ?? 0,
      summary: base?.summary ?? '',
      body_text: base?.text ?? '',
      note: base?.note ?? null,
      truncated: Boolean(base?.truncated),
      enabled_in_copilot: true,
      is_deleted: false,
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as DbRow
}

/** Actualiza metadatos y/o reemplaza el PDF. */
export async function updateBibliotecaDoc(
  doc: BibliotecaDoc,
  input: BibliotecaDocInput,
): Promise<BibliotecaDoc> {
  const title = input.title.trim()
  const category = input.category.trim() || 'General'
  if (!title) throw new Error('El título es obligatorio')

  let extractPatch: Partial<DbRow> = {}
  let newStorage: { path: string; url: string } | null = null
  const oldStorage = doc.storagePath

  if (input.file) {
    const extracted = await extractPdfText(input.file)
    newStorage = await uploadPdf(input.file)
    extractPatch = {
      file_name: input.file.name,
      storage_path: newStorage.path,
      file_url: newStorage.url,
      size_mb: Number((input.file.size / (1024 * 1024)).toFixed(2)),
      pages: extracted.pages,
      char_count: extracted.charCount,
      summary: extracted.summary,
      body_text: extracted.text,
      note: extracted.note,
      truncated: extracted.truncated,
    }
  }

  const enabled =
    input.enabledInCopilot ??
    (extractPatch.char_count != null
      ? extractPatch.char_count > 80
      : doc.enabledInCopilot)

  const patch = {
    title,
    category,
    enabled_in_copilot: Boolean(enabled) && (extractPatch.char_count ?? doc.charCount) > 80,
    ...extractPatch,
  }

  try {
    let row: DbRow
    if (doc.dbId) {
      const { data, error } = await supabase
        .from('biblioteca_documentos')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', doc.dbId)
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      row = data as DbRow
    } else if (doc.catalogId) {
      row = await upsertCatalogOverride(doc.catalogId, patch)
    } else {
      throw new Error('Documento sin identificador')
    }

    if (newStorage && oldStorage && oldStorage !== newStorage.path) {
      await removeStorage(oldStorage)
    }

    invalidateBibliotecaCache()
    return fromDbRow(row, doc)
  } catch (err) {
    if (newStorage) await removeStorage(newStorage.path)
    throw err
  }
}

/** Activa/desactiva uso en el copiloto. */
export async function setBibliotecaDocEnabled(
  doc: BibliotecaDoc,
  enabled: boolean,
): Promise<BibliotecaDoc> {
  if (doc.charCount <= 80 && enabled) {
    throw new Error('Este documento no tiene texto útil para el copiloto')
  }

  if (doc.dbId) {
    const { data, error } = await supabase
      .from('biblioteca_documentos')
      .update({
        enabled_in_copilot: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', doc.dbId)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    invalidateBibliotecaCache()
    return fromDbRow(data as DbRow, doc)
  }

  if (doc.catalogId) {
    const row = await upsertCatalogOverride(doc.catalogId, {
      title: doc.title,
      category: doc.category,
      enabled_in_copilot: enabled,
    })
    invalidateBibliotecaCache()
    return fromDbRow(row, doc)
  }

  throw new Error('Documento sin identificador')
}

/** Elimina un upload o oculta un documento del catálogo. */
export async function deleteBibliotecaDoc(doc: BibliotecaDoc): Promise<void> {
  if (doc.catalogId) {
    if (doc.storagePath) await removeStorage(doc.storagePath)
    await upsertCatalogOverride(doc.catalogId, {
      title: doc.title,
      category: doc.category,
      is_deleted: true,
      enabled_in_copilot: false,
      storage_path: null,
      file_url: null,
    })
    invalidateBibliotecaCache()
    return
  }

  if (!doc.dbId) throw new Error('No se puede eliminar este documento')

  const { error } = await supabase
    .from('biblioteca_documentos')
    .delete()
    .eq('id', doc.dbId)
  if (error) throw new Error(error.message)

  await removeStorage(doc.storagePath)
  invalidateBibliotecaCache()
}
