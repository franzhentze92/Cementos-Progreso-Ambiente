/** Utilidades de descarga CSV (Excel-compatible) y PDF para Fase 1. */

import { jsPDF } from 'jspdf'

export type Rgb = [number, number, number]

export type PdfThemeId =
  | 'dashboard'
  | 'cumplimiento'
  | 'capa'
  | 'metas'
  | 'umbrales'
  | 'intensidad'
  | 'circularidad'
  | 'expedientes'
  | 'analista'
  | 'licencias'
  | 'incidentes'
  | 'residuos'
  | 'agua'
  | 'carbono'

export type PdfTheme = {
  id: PdfThemeId
  /** Banner principal (texto blanco encima) */
  header: Rgb
  /** Franja / acentos de sección */
  accent: Rgb
  /** Fondo de cajas KPI */
  kpiBg: Rgb
  /** Borde de cajas KPI */
  kpiBorder: Rgb
  /** Valor numérico KPI */
  kpiValue: Rgb
  /** Etiqueta KPI y pie */
  muted: Rgb
  /** Cuerpo de texto */
  body: Rgb
  /** Fondo sutil de página (opcional, no relleno completo) */
  wash: Rgb
}

const WHITE: Rgb = [255, 255, 255]

/** Paletas por tema: contraste alto header→blanco y kpiBg→kpiValue/muted. */
export const PDF_THEMES: Record<PdfThemeId, PdfTheme> = {
  dashboard: {
    id: 'dashboard',
    header: [4, 88, 48],
    accent: [90, 182, 75],
    kpiBg: [240, 248, 241],
    kpiBorder: [200, 220, 205],
    kpiValue: [4, 88, 48],
    muted: [70, 90, 75],
    body: [28, 40, 32],
    wash: [247, 250, 247],
  },
  cumplimiento: {
    id: 'cumplimiento',
    header: [45, 55, 110],
    accent: [99, 112, 180],
    kpiBg: [240, 242, 250],
    kpiBorder: [205, 210, 230],
    kpiValue: [35, 45, 100],
    muted: [75, 80, 110],
    body: [30, 34, 55],
    wash: [246, 247, 252],
  },
  capa: {
    id: 'capa',
    header: [140, 70, 20],
    accent: [210, 130, 50],
    kpiBg: [255, 246, 236],
    kpiBorder: [235, 210, 180],
    kpiValue: [130, 60, 15],
    muted: [110, 80, 50],
    body: [50, 35, 20],
    wash: [255, 250, 245],
  },
  metas: {
    id: 'metas',
    header: [70, 40, 120],
    accent: [130, 90, 180],
    kpiBg: [246, 242, 252],
    kpiBorder: [215, 200, 235],
    kpiValue: [60, 35, 110],
    muted: [90, 75, 120],
    body: [35, 28, 55],
    wash: [250, 247, 253],
  },
  umbrales: {
    id: 'umbrales',
    header: [15, 90, 110],
    accent: [30, 150, 170],
    kpiBg: [236, 248, 250],
    kpiBorder: [180, 215, 225],
    kpiValue: [10, 80, 100],
    muted: [50, 95, 105],
    body: [18, 45, 55],
    wash: [244, 251, 252],
  },
  intensidad: {
    id: 'intensidad',
    header: [50, 55, 40],
    accent: [140, 160, 50],
    kpiBg: [245, 247, 238],
    kpiBorder: [210, 220, 180],
    kpiValue: [45, 55, 30],
    muted: [80, 90, 60],
    body: [30, 35, 22],
    wash: [250, 251, 245],
  },
  circularidad: {
    id: 'circularidad',
    header: [20, 100, 70],
    accent: [60, 170, 110],
    kpiBg: [236, 250, 242],
    kpiBorder: [180, 220, 195],
    kpiValue: [15, 90, 60],
    muted: [50, 100, 75],
    body: [20, 50, 35],
    wash: [244, 252, 247],
  },
  expedientes: {
    id: 'expedientes',
    header: [70, 55, 40],
    accent: [150, 120, 80],
    kpiBg: [250, 246, 240],
    kpiBorder: [225, 210, 190],
    kpiValue: [70, 50, 35],
    muted: [100, 85, 65],
    body: [45, 35, 25],
    wash: [252, 249, 245],
  },
  analista: {
    id: 'analista',
    header: [25, 55, 90],
    accent: [70, 120, 180],
    kpiBg: [238, 245, 252],
    kpiBorder: [190, 210, 230],
    kpiValue: [20, 50, 85],
    muted: [55, 75, 100],
    body: [25, 35, 50],
    wash: [245, 249, 253],
  },
  licencias: {
    id: 'licencias',
    header: [15, 105, 100],
    accent: [45, 160, 150],
    kpiBg: [236, 248, 247],
    kpiBorder: [185, 220, 215],
    kpiValue: [10, 95, 90],
    muted: [55, 95, 90],
    body: [20, 45, 45],
    wash: [244, 251, 250],
  },
  incidentes: {
    id: 'incidentes',
    header: [130, 40, 35],
    accent: [190, 85, 70],
    kpiBg: [255, 242, 240],
    kpiBorder: [235, 200, 195],
    kpiValue: [120, 35, 30],
    muted: [110, 70, 65],
    body: [50, 28, 26],
    wash: [255, 248, 247],
  },
  residuos: {
    id: 'residuos',
    header: [90, 70, 40],
    accent: [150, 120, 70],
    kpiBg: [248, 244, 236],
    kpiBorder: [220, 208, 185],
    kpiValue: [80, 60, 30],
    muted: [95, 80, 55],
    body: [40, 32, 22],
    wash: [252, 249, 244],
  },
  agua: {
    id: 'agua',
    header: [20, 75, 130],
    accent: [50, 130, 190],
    kpiBg: [235, 245, 252],
    kpiBorder: [185, 210, 230],
    kpiValue: [15, 70, 120],
    muted: [55, 85, 115],
    body: [22, 40, 60],
    wash: [244, 249, 253],
  },
  carbono: {
    id: 'carbono',
    header: [35, 55, 45],
    accent: [120, 160, 60],
    kpiBg: [240, 245, 238],
    kpiBorder: [200, 215, 190],
    kpiValue: [30, 55, 40],
    muted: [70, 85, 70],
    body: [25, 35, 28],
    wash: [246, 249, 244],
  },
}

const MARGIN = 16
const PAGE_W = 210
const PAGE_H = 297

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
) {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ]
  const bom = '\uFEFF'
  const blob = new Blob([bom + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  })
  downloadBlob(filename.endsWith('.csv') ? filename : `${filename}.csv`, blob)
}

export function stampFilename(prefix: string, ext: string): string {
  const d = new Date()
  const iso = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `${prefix}_${iso}.${ext}`
}

function ensureSpace(
  doc: jsPDF,
  y: number,
  need: number,
  footer: string,
  theme: PdfTheme,
): number {
  if (y + need <= PAGE_H - 18) return y
  doc.addPage()
  drawFooter(doc, doc.getNumberOfPages(), footer, theme)
  return 22
}

function drawFooter(
  doc: jsPDF,
  page: number,
  subtitle: string,
  theme: PdfTheme,
) {
  doc.setDrawColor(...theme.accent)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...theme.muted)
  doc.text(sanitizePdfText(subtitle), MARGIN, PAGE_H - 7)
  doc.text(`Pág. ${page}`, PAGE_W - MARGIN, PAGE_H - 7, { align: 'right' })
}

/**
 * Helvetica (jsPDF) solo cubre WinAnsi. Caracteres como <= >= fuera de Latin-1
 * (p. ej. el signo Unicode de "menor o igual") estiran el texto a lo ancho.
 */
function sanitizePdfText(raw: string): string {
  return String(raw ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/[\u2264\u2A7D\u2266]/g, '<=')
    .replace(/[\u2265\u2A7E\u2267]/g, '>=')
    .replace(/\u2260/g, '!=')
    .replace(/[\u2248\u2245]/g, '~')
    .replace(/[\u2022\u2219\u22C5]/g, '-')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2018\u2019\u201B\u2039\u203A]/g, "'")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00D7/g, 'x')
    .replace(/\u00F7/g, '/')
    .replace(/\u33A1/g, 'm2')
    .replace(/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g, '?')
}

function drawHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  theme: PdfTheme,
) {
  doc.setFillColor(...theme.header)
  doc.rect(0, 0, PAGE_W, 36, 'F')
  doc.setFillColor(...theme.accent)
  doc.rect(0, 36, PAGE_W, 2.5, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('CEMENTOS PROGRESO - AMBIENTE', MARGIN, 11)
  doc.setFontSize(15)
  const titleLines = doc.splitTextToSize(
    sanitizePdfText(title),
    PAGE_W - MARGIN * 2,
  ) as string[]
  doc.text(titleLines[0] ?? sanitizePdfText(title), MARGIN, 21)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  // Texto secundario sobre header oscuro: blanco con leve transparencia visual
  doc.setTextColor(240, 245, 250)
  doc.text(sanitizePdfText(subtitle), MARGIN, 30)
}

function drawKpiRow(
  doc: jsPDF,
  y: number,
  kpis: Array<{ label: string; value: string }>,
  theme: PdfTheme,
): number {
  const gap = 4
  const w = (PAGE_W - MARGIN * 2 - gap * (kpis.length - 1)) / kpis.length
  kpis.forEach((k, i) => {
    const x = MARGIN + i * (w + gap)
    doc.setFillColor(...theme.kpiBg)
    doc.setDrawColor(...theme.kpiBorder)
    doc.roundedRect(x, y, w, 18, 2, 2, 'FD')
    doc.setFillColor(...theme.accent)
    doc.rect(x, y, 1.4, 18, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...theme.kpiValue)
    // Una sola línea, recortada si no cabe (evita solaparse entre cajas)
    const maxW = w - 6
    let value = sanitizePdfText(k.value || '-')
    while (doc.getTextWidth(value) > maxW && value.length > 4) {
      value = `${value.slice(0, -2)}...`
    }
    doc.text(value, x + w / 2, y + 8, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...theme.muted)
    const lines = doc.splitTextToSize(
      sanitizePdfText(k.label),
      w - 4,
    ) as string[]
    doc.text(lines[0] ?? '', x + w / 2, y + 14, { align: 'center' })
  })
  return y + 24
}

export type ExportPdfSectionStyle = 'bullets' | 'prose' | 'markdown'

export type ExportPdfSection = {
  heading: string
  /** Líneas sueltas (bullets o prosa por línea). */
  lines?: string[]
  /** Cuerpo continuo (markdown o prosa). */
  body?: string
  style?: ExportPdfSectionStyle
}

function drawSectionHeading(
  doc: jsPDF,
  heading: string,
  y: number,
  theme: PdfTheme,
): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...theme.header)
  doc.text(sanitizePdfText(heading), MARGIN, y)
  y += 5
  doc.setDrawColor(...theme.accent)
  doc.setLineWidth(0.55)
  doc.line(MARGIN, y, MARGIN + 42, y)
  return y + 5
}

/** Dibuja texto envuelto; interpreta **negrita** sin mostrar asteriscos. */
function drawRichTextLine(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  theme: PdfTheme,
  fontSize = 9,
  lineHeight = 4.6,
): number {
  const safe = sanitizePdfText(text)
  const hasBold = /\*\*[^*]+\*\*/.test(safe)

  // Camino simple: sin marcadores → wrap nativo
  if (!hasBold) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize)
    doc.setTextColor(...theme.body)
    const lines = doc.splitTextToSize(safe, maxWidth) as string[]
    for (const line of lines) {
      doc.text(line, x, y)
      y += lineHeight
    }
    return y
  }

  // Con negrita: convierte a segmentos y re-arma líneas midiendo anchos
  const segments: Array<{ text: string; bold: boolean }> = []
  const re = /\*\*([^*]+)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(safe))) {
    if (m.index > last) segments.push({ text: safe.slice(last, m.index), bold: false })
    segments.push({ text: m[1], bold: true })
    last = m.index + m[0].length
  }
  if (last < safe.length) segments.push({ text: safe.slice(last), bold: false })

  // Expandir a caracteres/palabras
  const tokens: Array<{ text: string; bold: boolean }> = []
  for (const seg of segments) {
    const parts = seg.text.split(/(\s+)/)
    for (const p of parts) {
      if (p) tokens.push({ text: p, bold: seg.bold })
    }
  }

  doc.setFontSize(fontSize)
  doc.setTextColor(...theme.body)
  let lineTokens: Array<{ text: string; bold: boolean }> = []
  let lineWidth = 0

  const paintLine = () => {
    let cx = x
    for (const t of lineTokens) {
      doc.setFont('helvetica', t.bold ? 'bold' : 'normal')
      doc.text(t.text, cx, y)
      cx += doc.getTextWidth(t.text)
    }
    y += lineHeight
    lineTokens = []
    lineWidth = 0
  }

  for (const tok of tokens) {
    doc.setFont('helvetica', tok.bold ? 'bold' : 'normal')
    const w = doc.getTextWidth(tok.text)
    const isSpace = /^\s+$/.test(tok.text)
    if (!isSpace && lineWidth + w > maxWidth && lineTokens.length > 0) {
      // quitar espacios finales
      while (lineTokens.length && /^\s+$/.test(lineTokens[lineTokens.length - 1].text)) {
        lineTokens.pop()
      }
      paintLine()
    }
    if (isSpace && lineTokens.length === 0) continue
    lineTokens.push(tok)
    lineWidth += w
  }
  if (lineTokens.length) paintLine()
  return y
}

/** Quita sintaxis markdown restante que no renderizamos. */
function cleanMarkdownResidue(text: string): string {
  return text
    .replace(/^#{1,6}\s+/, '')
    .replace(/^>\s+/, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .trim()
}

function drawMarkdownBody(
  doc: jsPDF,
  markdown: string,
  y: number,
  theme: PdfTheme,
  footer: string,
): number {
  const raw = (markdown || '').replace(/\r\n/g, '\n').trim()
  if (!raw) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...theme.muted)
    doc.text('Sin contenido.', MARGIN, y)
    return y + 6
  }

  const lines = raw.split('\n')
  const maxW = PAGE_W - MARGIN * 2

  for (const original of lines) {
    const line = original.replace(/\s+$/g, '')
    if (!line.trim()) {
      y += 2.5
      continue
    }

    // Encabezados
    const hMatch = /^(#{1,3})\s+(.+)$/.exec(line.trim())
    if (hMatch) {
      const level = hMatch[1].length
      const title = sanitizePdfText(hMatch[2].replace(/\*\*/g, ''))
      y = ensureSpace(doc, y, level === 1 ? 12 : 10, footer, theme)
      if (level === 1) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.setTextColor(...theme.header)
        const wrapped = doc.splitTextToSize(title, maxW) as string[]
        for (const w of wrapped) {
          doc.text(w, MARGIN, y)
          y += 5.5
        }
        doc.setDrawColor(...theme.accent)
        doc.setLineWidth(0.4)
        doc.line(MARGIN, y - 1, MARGIN + 28, y - 1)
        y += 3
      } else {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(...theme.header)
        const wrapped = doc.splitTextToSize(title, maxW) as string[]
        for (const w of wrapped) {
          doc.text(w, MARGIN, y)
          y += 5
        }
        y += 1.5
      }
      continue
    }

    // Lista con viñeta o numerada
    const listMatch = /^(\s*)([-*+]|\d+[.)])\s+(.+)$/.exec(line)
    if (listMatch) {
      const indent = Math.min(listMatch[1].length, 6)
      const marker = listMatch[2]
      const content = listMatch[3]
      const bullet = /^\d/.test(marker) ? `${marker.replace(/[.)]$/, '')}.` : '-'
      const x = MARGIN + indent * 1.5
      y = ensureSpace(doc, y, 8, footer, theme)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...theme.body)
      doc.text(bullet, x, y)
      const textX = x + (bullet.length > 1 ? 7 : 4)
      y = drawRichTextLine(
        doc,
        content,
        textX,
        y,
        PAGE_W - MARGIN - textX,
        theme,
        9,
        4.6,
      )
      y += 0.8
      continue
    }

    // Párrafo normal (con **negrita** inline)
    y = ensureSpace(doc, y, 8, footer, theme)
    // Si quedó con ** visibles sin cerrar, limpia residuos peligrosos
    const paragraph = line.includes('**')
      ? line
      : cleanMarkdownResidue(line)
    y = drawRichTextLine(doc, paragraph, MARGIN, y, maxW, theme, 9, 4.6)
    y += 1.2
  }

  return y
}

function drawProseBody(
  doc: jsPDF,
  text: string,
  y: number,
  theme: PdfTheme,
  footer: string,
): number {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n+/)
    .map((p) => cleanMarkdownResidue(p))
    .filter(Boolean)
  const maxW = PAGE_W - MARGIN * 2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...theme.body)
  for (const p of paragraphs) {
    y = ensureSpace(doc, y, 8, footer, theme)
    const wrapped = doc.splitTextToSize(sanitizePdfText(p), maxW) as string[]
    for (const w of wrapped) {
      y = ensureSpace(doc, y, 6, footer, theme)
      doc.text(w, MARGIN, y)
      y += 4.6
    }
    y += 2
  }
  return y
}

export function downloadReportPdf(options: {
  title: string
  subtitle: string
  footer: string
  filename: string
  theme?: PdfThemeId | PdfTheme
  kpis?: Array<{ label: string; value: string }>
  sections: ExportPdfSection[]
}) {
  const theme =
    typeof options.theme === 'string' || options.theme == null
      ? PDF_THEMES[(options.theme as PdfThemeId) || 'dashboard']
      : options.theme

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  drawHeader(doc, options.title, options.subtitle, theme)
  drawFooter(doc, 1, options.footer, theme)

  let y = 46
  if (options.kpis?.length) {
    y = drawKpiRow(doc, y, options.kpis.slice(0, 4), theme)
  }

  for (const section of options.sections) {
    const style: ExportPdfSectionStyle =
      section.style ??
      (section.body ? 'markdown' : 'bullets')

    y = ensureSpace(doc, y, 14, options.footer, theme)
    y = drawSectionHeading(doc, section.heading, y, theme)

    if (style === 'markdown') {
      const md =
        section.body ??
        (section.lines ?? []).join('\n')
      y = drawMarkdownBody(doc, md, y, theme, options.footer)
      y += 4
      continue
    }

    if (style === 'prose') {
      const prose =
        section.body ??
        (section.lines ?? []).join('\n')
      y = drawProseBody(doc, prose, y, theme, options.footer)
      y += 3
      continue
    }

    // bullets (default)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...theme.body)
    const lines = section.lines ?? []
    for (const line of lines) {
      let cleaned = String(line ?? '')
        .replace(/^#{1,6}\s+/, '')
        .replace(/^[•]\s*/, '')
        .trim()
      if (!cleaned) continue
      y = ensureSpace(doc, y, 8, options.footer, theme)
      y = drawRichTextLine(
        doc,
        `- ${cleaned}`,
        MARGIN,
        y,
        PAGE_W - MARGIN * 2,
        theme,
      )
      y += 1.2
    }
    y += 4
  }

  doc.save(
    options.filename.endsWith('.pdf')
      ? options.filename
      : `${options.filename}.pdf`,
  )
}

