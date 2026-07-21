/**
 * Extrae texto de PDFs en "Contexto Chatbot/" hacia
 * src/lib/chat/knowledge/ (versionable, usable en local y producción).
 *
 * Uso: npm run chat:extract-knowledge
 */
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFParse } from 'pdf-parse'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SOURCE_DIR = path.join(ROOT, 'Contexto Chatbot')
const OUT_DIR = path.join(ROOT, 'src', 'lib', 'chat', 'knowledge')

/** PDFs > este tamaño (MB): solo primeras N páginas para no saturar memoria (escaneados grandes). */
const LARGE_MB = 15
const LARGE_MAX_PAGES = 40

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80)
}

function cleanText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

async function walkPdfs(dir, category = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const found = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const nextCat = category || entry.name
      found.push(...(await walkPdfs(full, nextCat)))
    } else if (/\.pdf$/i.test(entry.name)) {
      found.push({ full, name: entry.name, category: category || 'General' })
    }
  }
  return found
}

async function extractOne(file) {
  const stat = await fs.stat(file.full)
  const sizeMb = stat.size / (1024 * 1024)
  const buffer = await fs.readFile(file.full)
  const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 12)

  const parser = new PDFParse({ data: buffer })
  let text = ''
  let pages = 0
  let truncated = false
  let note = ''

  try {
    const info = await parser.getInfo().catch(() => null)
    pages = info?.total ?? info?.pages ?? 0

    const opts =
      sizeMb >= LARGE_MB
        ? { first: 1, last: LARGE_MAX_PAGES }
        : undefined

    if (sizeMb >= LARGE_MB) {
      truncated = true
      note = `PDF grande (${sizeMb.toFixed(1)} MB): se extrajeron solo las primeras ${LARGE_MAX_PAGES} páginas.`
    }

    const result = await parser.getText({
      ...(opts ?? {}),
      pageJoiner: '',
    })
    text = cleanText(result?.text ?? '')
    if (!pages && result?.total) pages = result.total
  } finally {
    await parser.destroy?.().catch(() => {})
  }

  if (text.length < 80) {
    note =
      (note ? note + ' ' : '') +
      'Poco o ningún texto embebido (posible PDF escaneado). Se necesita OCR manual o re-exportar con texto seleccionable.'
  }

  const id = slugify(file.name)
  const summary =
    text.length >= 80
      ? cleanText(text.slice(0, 420)).replace(/\n/g, ' ') + '…'
      : note || 'Sin texto extraíble.'

  return {
    id,
    title: file.name.replace(/\.pdf$/i, ''),
    category: file.category,
    sourcePath: path.relative(ROOT, file.full).replace(/\\/g, '/'),
    pages,
    sizeMb: Math.round(sizeMb * 10) / 10,
    hash,
    truncated,
    note: note || undefined,
    charCount: text.length,
    summary,
    text,
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  let files
  try {
    files = await walkPdfs(SOURCE_DIR)
  } catch (err) {
    console.error(
      `No se encontró la carpeta "${SOURCE_DIR}". Coloca los PDFs ahí y vuelve a correr el script.`,
    )
    throw err
  }

  if (!files.length) {
    console.warn('No hay PDFs en Contexto Chatbot/.')
    return
  }

  console.log(`Extrayendo ${files.length} PDF(s)…`)
  const docs = []

  for (const file of files) {
    process.stdout.write(`  · ${file.category} / ${file.name} … `)
    try {
      const doc = await extractOne(file)
      const mdPath = path.join(OUT_DIR, `${doc.id}.md`)
      const md = [
        `# ${doc.title}`,
        '',
        `- Categoría: ${doc.category}`,
        `- Fuente: ${doc.sourcePath}`,
        `- Páginas: ${doc.pages || '—'}`,
        `- Tamaño: ${doc.sizeMb} MB`,
        doc.note ? `- Nota: ${doc.note}` : null,
        '',
        '---',
        '',
        doc.text || '_(sin texto extraíble)_',
        '',
      ]
        .filter((l) => l != null)
        .join('\n')

      await fs.writeFile(mdPath, md, 'utf8')
      docs.push({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        sourcePath: doc.sourcePath,
        pages: doc.pages,
        sizeMb: doc.sizeMb,
        hash: doc.hash,
        truncated: doc.truncated,
        note: doc.note,
        charCount: doc.charCount,
        summary: doc.summary,
        text: doc.text,
        mdFile: `${doc.id}.md`,
      })
      console.log(
        doc.charCount > 80
          ? `OK (${doc.charCount} chars)`
          : `poca texto (${doc.charCount} chars)`,
      )
    } catch (err) {
      console.log('ERROR')
      console.error(`    ${err?.message || err}`)
      docs.push({
        id: slugify(file.name),
        title: file.name.replace(/\.pdf$/i, ''),
        category: file.category,
        sourcePath: path.relative(ROOT, file.full).replace(/\\/g, '/'),
        pages: 0,
        sizeMb: 0,
        hash: '',
        truncated: false,
        note: `Error al extraer: ${err?.message || err}`,
        charCount: 0,
        summary: 'Error de extracción.',
        text: '',
        mdFile: null,
      })
    }
  }

  const catalog = {
    generatedAt: new Date().toISOString(),
    sourceDir: 'Contexto Chatbot',
    documentCount: docs.length,
    documents: docs,
  }

  await fs.writeFile(
    path.join(OUT_DIR, 'catalog.json'),
    JSON.stringify(catalog, null, 2),
    'utf8',
  )

  const withText = docs.filter((d) => d.charCount > 80).length
  console.log(
    `\nListo: ${docs.length} docs → ${OUT_DIR} (${withText} con texto útil).`,
  )
  console.log('El chatbot cargará catalog.json en local y producción.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
