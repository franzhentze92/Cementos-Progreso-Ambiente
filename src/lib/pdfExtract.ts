import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const LARGE_MB = 15
const LARGE_MAX_PAGES = 40
const MAX_CHARS = 28_000

export type PdfExtractResult = {
  text: string
  pages: number
  charCount: number
  summary: string
  truncated: boolean
  note: string | null
}

function cleanText(raw: string) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** Extrae texto de un PDF en el navegador (pdf.js). */
export async function extractPdfText(file: File): Promise<PdfExtractResult> {
  const sizeMb = file.size / (1024 * 1024)
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const totalPages = pdf.numPages
  const maxPages =
    sizeMb >= LARGE_MB ? Math.min(totalPages, LARGE_MAX_PAGES) : totalPages

  let truncated = sizeMb >= LARGE_MB && totalPages > LARGE_MAX_PAGES
  let note: string | null = truncated
    ? `PDF grande (${sizeMb.toFixed(1)} MB): se extrajeron solo las primeras ${LARGE_MAX_PAGES} páginas.`
    : null

  const parts: string[] = []
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    parts.push(pageText)
  }

  let text = cleanText(parts.join('\n\n'))

  if (text.length < 80) {
    note =
      (note ? `${note} ` : '') +
      'Poco o ningún texto embebido (posible PDF escaneado). Se necesita OCR manual o re-exportar con texto seleccionable.'
  }

  if (text.length > MAX_CHARS) {
    text =
      text.slice(0, MAX_CHARS) +
      `\n\n[… texto truncado a ${MAX_CHARS} caracteres para el copiloto …]`
    truncated = true
  }

  const summary =
    text.length >= 80
      ? cleanText(text.slice(0, 420)).replace(/\n/g, ' ') + '…'
      : note || 'Sin texto extraíble.'

  return {
    text,
    pages: totalPages,
    charCount: text.length,
    summary,
    truncated,
    note,
  }
}
