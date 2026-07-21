import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const LARGE_MB = 15
const LARGE_MAX_PAGES = 40
/** Informes de lab: tope de páginas; el texto útil no se corta por caracteres. */
const LAB_MAX_PAGES = 60

export type PdfExtractResult = {
  text: string
  pages: number
  charCount: number
  summary: string
  truncated: boolean
  note: string | null
}

export type PdfExtractOptions = {
  /** Informes de laboratorio: más páginas y caracteres. */
  mode?: 'default' | 'lab'
}

function cleanText(raw: string) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Une ítems de pdf.js por coordenada Y para conservar columnas de tablas. */
function pageItemsToStructuredText(
  items: Array<{ str?: string; transform?: number[] }>,
): string {
  const lines = new Map<number, Array<{ x: number; str: string }>>()
  for (const item of items) {
    const str = typeof item.str === 'string' ? item.str.trim() : ''
    if (!str || !item.transform) continue
    const y = Math.round(item.transform[5] ?? 0)
    const x = item.transform[4] ?? 0
    const row = lines.get(y) ?? []
    row.push({ x, str })
    lines.set(y, row)
  }
  return [...lines.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, cells]) => {
      cells.sort((a, b) => a.x - b.x)
      // Separador estable para el parser de tablas de laboratorio
      return cells.map((c) => c.str).join(' | ')
    })
    .join('\n')
}

/** Extrae texto de un PDF en el navegador (pdf.js). */
export async function extractPdfText(
  file: File,
  options: PdfExtractOptions = {},
): Promise<PdfExtractResult> {
  const lab = options.mode === 'lab'
  const sizeMb = file.size / (1024 * 1024)
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const totalPages = pdf.numPages

  // Texto completo salvo PDFs enormes (>15 MB, casi siempre escaneados) o modo lab.
  let maxPages = totalPages
  if (lab) {
    maxPages = Math.min(totalPages, LAB_MAX_PAGES)
  } else if (sizeMb >= LARGE_MB) {
    maxPages = Math.min(totalPages, LARGE_MAX_PAGES)
  }

  let truncated = totalPages > maxPages
  let note: string | null = truncated
    ? `PDF de ${totalPages} páginas: se extrajeron ${maxPages} (archivo grande o modo laboratorio).`
    : null

  const parts: string[] = []
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    if (lab) {
      const structured = pageItemsToStructuredText(
        content.items as Array<{ str?: string; transform?: number[] }>,
      )
      parts.push(`--- Página ${i} ---\n${structured}`)
    } else {
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
      parts.push(`--- Página ${i} ---\n${pageText}`)
    }
  }

  let text = cleanText(parts.join('\n\n'))
  // En modo lab no colapsar espacios entre celdas (ya van con " | ")
  if (!lab) {
    text = text.replace(/[ \t]{2,}/g, ' ')
  }

  if (text.length < 80) {
    note =
      (note ? `${note} ` : '') +
      'Poco o ningún texto embebido (posible PDF escaneado). Se necesita OCR manual o re-exportar con texto seleccionable.'
  }

  const summary =
    text.length >= 80
      ? text.slice(0, 400).replace(/\s+/g, ' ')
      : 'Sin texto extraíble'

  return {
    text,
    pages: totalPages,
    charCount: text.length,
    summary,
    truncated,
    note,
  }
}
