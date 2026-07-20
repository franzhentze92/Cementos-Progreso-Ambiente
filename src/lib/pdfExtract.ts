import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const LARGE_MB = 15
const LARGE_MAX_PAGES = 40
const MAX_CHARS = 28_000
const LAB_MAX_PAGES = 60
const LAB_MAX_CHARS = 110_000

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
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
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
  const pageCap = lab ? LAB_MAX_PAGES : LARGE_MAX_PAGES
  const maxPages =
    lab || sizeMb < LARGE_MB
      ? Math.min(totalPages, pageCap)
      : Math.min(totalPages, LARGE_MAX_PAGES)

  let truncated = totalPages > maxPages
  let note: string | null = truncated
    ? `PDF de ${totalPages} páginas: se extrajeron ${maxPages} para el análisis.`
    : null

  const parts: string[] = []
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    parts.push(`--- Página ${i} ---\n${pageText}`)
  }

  let text = cleanText(parts.join('\n\n'))

  if (text.length < 80) {
    note =
      (note ? `${note} ` : '') +
      'Poco o ningún texto embebido (posible PDF escaneado). Se necesita OCR manual o re-exportar con texto seleccionable.'
  }

  const charCap = lab ? LAB_MAX_CHARS : MAX_CHARS
  if (text.length > charCap) {
    // Prioriza inicio (portada/metodología) + final (anexos de resultados)
    const head = Math.floor(charCap * 0.45)
    const tail = charCap - head - 80
    text =
      text.slice(0, head) +
      `\n\n[… truncado; se conservan portada y anexos de resultados …]\n\n` +
      text.slice(-tail)
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
