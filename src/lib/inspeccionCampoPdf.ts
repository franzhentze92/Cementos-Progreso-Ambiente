import { jsPDF } from 'jspdf'
import {
  CLASIFICACION_LABELS,
  type InspeccionCampoDetail,
  type InspeccionClasificacion,
} from '../data/inspeccionesCampo'

const GREEN_DARK: [number, number, number] = [4, 121, 53]
const GREEN: [number, number, number] = [90, 182, 75]
const GRAY: [number, number, number] = [90, 100, 90]
const LIGHT: [number, number, number] = [247, 250, 247]
const WHITE: [number, number, number] = [255, 255, 255]
const RISK: [number, number, number] = [180, 35, 24]
const WARN: [number, number, number] = [138, 106, 0]
const GOOD: [number, number, number] = [47, 122, 42]

const MARGIN = 16
const PAGE_W = 210
const PAGE_H = 297
const CONTENT_W = PAGE_W - MARGIN * 2

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  if (!y || !m || !d) return fecha
  try {
    return new Date(y, m - 1, d).toLocaleDateString('es-GT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return fecha
  }
}

function slugFile(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40)
}

function classColor(c: InspeccionClasificacion): [number, number, number] {
  if (c === 'situacion_riesgo') return RISK
  if (c === 'observacion_general') return WARN
  return GOOD
}

async function loadImageDataUrl(url: string): Promise<{
  dataUrl: string
  format: 'JPEG' | 'PNG'
  width: number
  height: number
} | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('read failed'))
      reader.readAsDataURL(blob)
    })

    const mime = (blob.type || '').toLowerCase()
    // jsPDF embebe mejor JPEG/PNG; convertir WEBP/otros a JPEG
    if (mime.includes('webp') || (!mime.includes('png') && !mime.includes('jpeg') && !mime.includes('jpg'))) {
      const jpegUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('canvas'))
            return
          }
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/jpeg', 0.86))
        }
        img.onerror = () => reject(new Error('img convert'))
        img.src = dataUrl
      })
      const dims = await new Promise<{ width: number; height: number }>(
        (resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve({ width: img.width, height: img.height })
          img.onerror = () => reject(new Error('img dims'))
          img.src = jpegUrl
        },
      )
      return { dataUrl: jpegUrl, format: 'JPEG', ...dims }
    }

    const dims = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = () => reject(new Error('img failed'))
        img.src = dataUrl
      },
    )

    const format: 'JPEG' | 'PNG' = mime.includes('png') ? 'PNG' : 'JPEG'
    return { dataUrl, format, ...dims }
  } catch {
    return null
  }
}

function ensureSpace(doc: jsPDF, y: number, need: number): number {
  if (y + need <= PAGE_H - 18) return y
  doc.addPage()
  drawFooter(doc, doc.getNumberOfPages())
  return 22
}

function drawFooter(doc: jsPDF, page: number) {
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text(
    'Cementos Progreso Ambiente · Informe confidencial de inspección',
    MARGIN,
    PAGE_H - 7,
  )
  doc.text(`Pág. ${page}`, PAGE_W - MARGIN, PAGE_H - 7, { align: 'right' })
}

function drawWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 5,
): number {
  const lines = doc.splitTextToSize(text || '—', maxWidth) as string[]
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function drawKpiBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  value: string,
  label: string,
) {
  doc.setFillColor(...LIGHT)
  doc.setDrawColor(220, 228, 220)
  doc.roundedRect(x, y, w, h, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...GREEN_DARK)
  doc.text(value, x + w / 2, y + 10, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  const labelLines = doc.splitTextToSize(label, w - 6) as string[]
  doc.text(labelLines, x + w / 2, y + 16, { align: 'center' })
}

export async function downloadInspeccionCampoPdf(
  detail: InspeccionCampoDetail,
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const riesgo = detail.hallazgos.filter(
    (h) => h.clasificacion === 'situacion_riesgo',
  ).length
  const obs = detail.hallazgos.filter(
    (h) => h.clasificacion === 'observacion_general',
  ).length
  const buenas = detail.hallazgos.filter(
    (h) => h.clasificacion === 'buena_practica',
  ).length
  const fotos = detail.hallazgos.reduce((n, h) => n + h.fotoUrls.length, 0)

  // —— Portada / encabezado ——
  doc.setFillColor(...GREEN_DARK)
  doc.rect(0, 0, PAGE_W, 42, 'F')
  doc.setFillColor(...GREEN)
  doc.rect(0, 42, PAGE_W, 2, 'F')

  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('CEMENTOS PROGRESO · AMBIENTE', MARGIN, 14)
  doc.setFontSize(18)
  doc.text('Informe de Inspección Ambiental', MARGIN, 24)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Captura de campo · Evidencias fotográficas', MARGIN, 32)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(detail.plantaSede, PAGE_W - MARGIN, 20, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(formatFecha(detail.fecha), PAGE_W - MARGIN, 27, { align: 'right' })
  doc.text(detail.unidadNegocio, PAGE_W - MARGIN, 33, { align: 'right' })

  let y = 54

  // Meta
  doc.setTextColor(...GRAY)
  doc.setFontSize(9)
  doc.text(`Inspector: ${detail.responsable || '—'}`, MARGIN, y)
  doc.text(
    `Estado: ${detail.estado === 'completada' ? 'Completada' : detail.estado}`,
    MARGIN + 80,
    y,
  )
  doc.text(
    `Acción inmediata: ${detail.requiereAccionInmediata || 'No'}`,
    MARGIN + 140,
    y,
  )
  y += 8

  // Score banner
  doc.setFillColor(...LIGHT)
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...GREEN_DARK)
  doc.text(String(detail.resultadoGeneral ?? '—'), MARGIN + 14, y + 14)
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('/ 100', MARGIN + 28, y + 14)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  const riskColor =
    detail.nivelRiesgo === 'Alto'
      ? RISK
      : detail.nivelRiesgo === 'Medio'
        ? WARN
        : GOOD
  doc.setTextColor(...riskColor)
  doc.text(`Nivel de riesgo: ${detail.nivelRiesgo || '—'}`, MARGIN + 50, y + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(
    `${detail.hallazgos.length} área(s) · ${fotos} evidencia(s) fotográfica(s)`,
    MARGIN + 50,
    y + 16,
  )
  y += 30

  // KPIs
  const boxW = (CONTENT_W - 12) / 4
  drawKpiBox(doc, MARGIN, y, boxW, 24, String(detail.hallazgos.length), 'Áreas')
  drawKpiBox(doc, MARGIN + boxW + 4, y, boxW, 24, String(riesgo), 'Riesgos')
  drawKpiBox(doc, MARGIN + (boxW + 4) * 2, y, boxW, 24, String(obs), 'Observaciones')
  drawKpiBox(doc, MARGIN + (boxW + 4) * 3, y, boxW, 24, String(buenas), 'Buenas prácticas')
  y += 32

  // Nota general
  y = ensureSpace(doc, y, 28)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...GREEN_DARK)
  doc.text('Nota general', MARGIN, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(40, 50, 40)
  y = drawWrapped(
    doc,
    detail.notaGeneral || 'Sin nota general generada.',
    MARGIN,
    y,
    CONTENT_W,
    4.8,
  )
  y += 8

  // Comentario inspector
  y = ensureSpace(doc, y, 22)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...GREEN_DARK)
  doc.text('Comentario del inspector', MARGIN, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(40, 50, 40)
  y = drawWrapped(
    doc,
    detail.comentarioGeneral.trim() || 'Sin comentario general.',
    MARGIN,
    y,
    CONTENT_W,
    4.8,
  )
  y += 10

  // Áreas
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...GREEN_DARK)
  y = ensureSpace(doc, y, 12)
  doc.text('Detalle por área', MARGIN, y)
  y += 4
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y, MARGIN + 36, y)
  y += 8

  if (!detail.hallazgos.length) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text('No se registraron hallazgos por área.', MARGIN, y)
  }

  for (const h of detail.hallazgos) {
    const photos = (
      await Promise.all(h.fotoUrls.slice(0, 4).map((url) => loadImageDataUrl(url)))
    ).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof loadImageDataUrl>>>[]

    const photoBlockH = photos.length ? 42 : 0
    y = ensureSpace(doc, y, 28 + photoBlockH)

    // Area header bar
    const color = classColor(h.clasificacion)
    doc.setFillColor(...LIGHT)
    doc.roundedRect(MARGIN, y, CONTENT_W, 10, 1.5, 1.5, 'F')
    doc.setFillColor(...color)
    doc.rect(MARGIN, y, 2.2, 10, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...GREEN_DARK)
    doc.text(`${h.orden}. ${h.areaNombre}`, MARGIN + 5, y + 6.5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...color)
    doc.text(CLASIFICACION_LABELS[h.clasificacion], PAGE_W - MARGIN - 2, y + 6.5, {
      align: 'right',
    })
    y += 14

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(50, 60, 50)
    y = drawWrapped(
      doc,
      h.comentario.trim() || 'Sin comentario de área.',
      MARGIN + 2,
      y,
      CONTENT_W - 4,
      4.5,
    )
    y += 4

    if (photos.length) {
      y = ensureSpace(doc, y, 40)
      const gap = 4
      const imgW = (CONTENT_W - gap * (Math.min(photos.length, 3) - 1)) / Math.min(photos.length, 3)
      const imgH = 36
      let x = MARGIN
      for (const photo of photos.slice(0, 3)) {
        try {
          const ratio = photo.width / photo.height
          let drawW = imgW
          let drawH = imgH
          if (ratio > imgW / imgH) {
            drawH = imgW / ratio
          } else {
            drawW = imgH * ratio
          }
          const ox = x + (imgW - drawW) / 2
          const oy = y + (imgH - drawH) / 2
          doc.setDrawColor(220, 228, 220)
          doc.setFillColor(255, 255, 255)
          doc.roundedRect(x, y, imgW, imgH, 1.5, 1.5, 'FD')
          doc.addImage(
            photo.dataUrl,
            photo.format,
            ox,
            oy,
            drawW,
            drawH,
            undefined,
            'FAST',
          )
        } catch {
          // skip broken image
        }
        x += imgW + gap
      }
      y += imgH + 6
      if (h.fotoUrls.length > 3) {
        doc.setFontSize(8)
        doc.setTextColor(...GRAY)
        doc.text(`+${h.fotoUrls.length - 3} evidencia(s) adicional(es) en plataforma`, MARGIN, y)
        y += 5
      }
    } else if (h.fotoUrls.length) {
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      doc.text(
        `${h.fotoUrls.length} foto(s) disponibles en la plataforma (no embebidas).`,
        MARGIN + 2,
        y,
      )
      y += 6
    }

    y += 4
  }

  // Closing note
  y = ensureSpace(doc, y, 20)
  doc.setFillColor(...LIGHT)
  doc.roundedRect(MARGIN, y, CONTENT_W, 16, 2, 2, 'F')
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  drawWrapped(
    doc,
    'Documento generado desde Cementos Progreso Ambiente para uso interno y seguimiento ambiental. Las evidencias fotográficas completas permanecen disponibles en la plataforma.',
    MARGIN + 4,
    y + 6,
    CONTENT_W - 8,
    3.8,
  )

  // Footers on all pages
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    drawFooter(doc, i)
  }

  const filename = `inspeccion-${slugFile(detail.plantaSede)}-${detail.fecha}.pdf`
  doc.save(filename)
}
