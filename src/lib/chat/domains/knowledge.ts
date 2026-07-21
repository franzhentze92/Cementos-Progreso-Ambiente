import {
  loadKnowledgeDocsForCopilot,
  invalidateBibliotecaCache,
} from '../../bibliotecaApi'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

type KnowledgeDoc = {
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
}

/**
 * Capacidad total del dominio documental en el prompt.
 * Cabe el reglamento más grande (~140k) + un manual relacionado + margen.
 * El API acepta hasta ~350k de contexto combinado.
 */
const MAX_KNOWLEDGE_CHARS = 320_000
/** Mínimo de score para incluir un doc cuando hay pregunta (además del top-1). */
const MIN_RELEVANCE_SCORE = 120
/** Máximo de documentos completos por pregunta. */
const MAX_DOCS_PER_QUESTION = 3

function scoreDoc(doc: KnowledgeDoc, question: string): number {
  const q = question.toLowerCase()
  const title = doc.title.toLowerCase()
  const cat = doc.category.toLowerCase()
  let score = 0

  if (doc.charCount > 80) score += 50
  else score -= 100
  if (/legislaci/i.test(doc.category)) score += 30
  if (doc.sizeMb > 20 && doc.charCount < 200) score -= 40

  const tokens = q
    .split(/[^a-z0-9áéíóúñü]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)

  for (const t of tokens) {
    if (title.includes(t)) score += 40
    if (cat.includes(t)) score += 10
    if (doc.summary?.toLowerCase().includes(t)) score += 5
    if (doc.text?.toLowerCase().includes(t)) score += 2
  }

  if (/164-?2021|gesti[oó]n de residuos/.test(q) && /164-?2021|residuos/i.test(title + ' ' + (doc.summary || ''))) {
    score += 200
  }
  if (/236-?2006|descargas|reuso|reúso/.test(q) && /236-?2006|descargas/i.test(title + ' ' + (doc.summary || ''))) {
    score += 200
  }
  if (/194-?2018|pcb/.test(q) && /194-?2018|pcb/i.test(title + ' ' + (doc.summary || ''))) {
    score += 200
  }
  if (/137-?2016/.test(q)) {
    if (/137-?2016/i.test(doc.summary || '') || /137-?2016/i.test(doc.text || '')) {
      score += 280
    }
    if (/control y seguimiento/i.test(title)) score += 220
    if (/317-?2019/.test(title) && doc.charCount < 80) score -= 200
  }
  if (/317-?2019/.test(q) && /317-?2019/i.test(title)) {
    score += doc.charCount > 80 ? 200 : -50
  }
  if (/control y seguimiento/.test(q) && /control y seguimiento/i.test(title)) {
    score += 200
  }
  if (/manual.*descargas|lodos/.test(q) && /manual|lodos/i.test(title)) {
    score += 200
  }

  return score
}

function docBody(doc: KnowledgeDoc): string {
  return (doc.text?.trim() || doc.note || doc.summary || '').trim()
}

/**
 * Con pregunta: incluye documentos relevantes COMPLETOS (sin cortar texto).
 * Sin pregunta (preload): solo índice + resúmenes, para no inflar el prompt.
 */
function pickDocs(
  docs: KnowledgeDoc[],
  question = '',
): { included: KnowledgeDoc[]; omitted: string[] } {
  const q = question.trim()

  if (!q) {
    return { included: [], omitted: [] }
  }

  const ranked = [...docs]
    .map((doc) => ({ doc, score: scoreDoc(doc, q) }))
    .sort((a, b) => b.score - a.score)

  const included: KnowledgeDoc[] = []
  const omitted: string[] = []
  let used = 0

  for (let i = 0; i < ranked.length; i++) {
    const { doc, score } = ranked[i]
    const body = docBody(doc)
    if (!body) {
      omitted.push(doc.title)
      continue
    }

    // Siempre el más relevante; el resto solo si supera el umbral.
    if (i > 0 && score < MIN_RELEVANCE_SCORE) {
      omitted.push(doc.title)
      continue
    }
    if (included.length >= MAX_DOCS_PER_QUESTION) {
      omitted.push(doc.title)
      continue
    }

    const cost = body.length + doc.title.length + 80
    if (used + cost > MAX_KNOWLEDGE_CHARS && included.length > 0) {
      omitted.push(doc.title)
      continue
    }

    included.push({ ...doc, text: body })
    used += cost
  }

  return { included, omitted }
}

async function buildContext(question = ''): Promise<{
  summary: string
  context: string
  docCount: number
  withText: number
}> {
  let docs: KnowledgeDoc[] = []
  try {
    docs = await loadKnowledgeDocsForCopilot()
  } catch (err) {
    console.warn('[knowledge] No se pudo cargar biblioteca', err)
    invalidateBibliotecaCache()
  }

  const { included, omitted } = pickDocs(docs, question)
  const withText = docs.filter((d) => d.charCount > 80).length

  const index = docs
    .map(
      (d) =>
        `- [${d.category}] ${d.title} (${d.charCount} chars${d.note ? '; nota: documento con texto limitado' : ''}${d.truncated ? '; páginas limitadas por tamaño de archivo' : ''})`,
    )
    .join('\n')

  const bodies = included
    .map((d) => {
      const body = d.text?.trim() || `_(${d.note || 'sin texto extraíble'})_`
      return [
        `### ${d.title}`,
        `Categoría: ${d.category}`,
        `Fuente: ${d.sourcePath}`,
        d.note ? `Nota: ${d.note}` : null,
        `Caracteres: ${d.charCount} (texto completo)`,
        '',
        body,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n-----\n\n')

  const preloadNote = !question.trim()
    ? '\n(Sin pregunta aún: solo índice. El texto completo se inyecta al responder según relevancia.)\n'
    : ''

  const context = `
DOMINIO: Documentos de contexto del departamento de ambiente
Fuente: Biblioteca (catálogo Contexto Chatbot + documentos subidos)
Documentos activos en copiloto: ${docs.length} (${withText} con texto útil)
Incluidos en este prompt (completos): ${included.map((d) => d.title).join('; ') || 'ninguno'}
${omitted.length ? `No incluidos en este turno: ${omitted.join('; ')}` : ''}
${preloadNote}
ÍNDICE COMPLETO
${index || '- Sin documentos activos. Sube PDFs en Biblioteca o ejecuta npm run chat:extract-knowledge'}

CONTENIDO DOCUMENTAL (texto completo de los documentos priorizados)
${bodies || '- Sin contenido documental en este turno. Si la pregunta es sobre un reglamento del índice, reformula mencionando el número de acuerdo.'}

REGLAS
- Usa estos documentos para preguntas de legislación, permisos, reglamentos, expedientes e instrumentos.
- El texto incluido está completo (sin truncar por caracteres). Si un PDF es escaneado y no tiene texto, dilo y cita el título.
- No inventes artículos ni números de acuerdo si no aparecen en el texto.
`.trim()

  return {
    summary: `${docs.length} docs · ${withText} con texto`,
    context,
    docCount: docs.length,
    withText,
  }
}

/** Contexto documental. Si hay pregunta, prioriza el PDF más relevante. */
export const loadKnowledgeDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const built = await buildContext('')
    return {
      id: 'knowledge',
      label: 'Documentos / legislación',
      summary: built.summary,
      context: built.context,
    }
  }

/** Reconstruye el dominio documental priorizando la pregunta del usuario. */
export async function knowledgeDomainForQuestion(
  question: string,
): Promise<ChatDomainSnapshot> {
  const built = await buildContext(question)
  return {
    id: 'knowledge',
    label: 'Documentos / legislación',
    summary: built.summary,
    context: built.context,
  }
}
