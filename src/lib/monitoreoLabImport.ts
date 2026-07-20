/**
 * Cliente: PDF de laboratorio → texto → IA → muestreos tipados → guardar.
 */

import {
  AGRO_MONITOREO_PARAMETROS,
  AGRO_MONITOREO_SEDES,
  AGRO_TIPOS_AGUA,
  emptyParamRows,
  type AgroMonitoreoHeader,
  type AgroMonitoreoParamRow,
  type MonitoringMonth,
} from '../data/agroMonitoreos'
import { MONITORING_MONTHS } from '../data/carbonMonitoring'
import { saveLabMonitoreoInforme } from './agroMonitoreosApi'
import { extractPdfText } from './pdfExtract'

export type ExtractedMonitoreoParam = {
  parametro: string
  resultado: number | null
  unidad: string
  limitePermisible: string
  cumple: 'Si' | 'No' | ''
  observaciones: string
}

export type ExtractedMuestreo = {
  fecha: string | null
  puntoMuestreo: string
  tipoMedio: string
  latitud: number | null
  longitud: number | null
  parametros: ExtractedMonitoreoParam[]
}

export type ExtractedMonitoreo = {
  unidadNegocio: string
  plantaSede: string
  laboratorio: string | null
  medio: string
  notas: string | null
  confidence: 'alta' | 'media' | 'baja'
  muestreos: ExtractedMuestreo[]
  fecha: string | null
  puntoMuestreo: string | null
  tipoAgua: string | null
  latitud: number | null
  longitud: number | null
  parametros: ExtractedMonitoreoParam[]
}

export type LabImportPreview = {
  fileName: string
  pages: number
  extractNote: string | null
  data: ExtractedMonitoreo
  header: AgroMonitoreoHeader
  rows: AgroMonitoreoParamRow[]
  year: number | null
  month: MonitoringMonth | null
  totalParametros: number
}

async function callExtractApi(
  text: string,
  fileName: string,
): Promise<ExtractedMonitoreo> {
  const res = await fetch('/api/extract-monitoreo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, fileName }),
  })
  const raw = await res.text()
  let payload: { data?: ExtractedMonitoreo; error?: string } = {}
  try {
    payload = raw ? (JSON.parse(raw) as typeof payload) : {}
  } catch {
    throw new Error(
      res.status >= 500
        ? 'El servidor falló al extraer el informe (posible timeout o clave de IA). Intenta de nuevo.'
        : `Respuesta inválida del servidor (HTTP ${res.status})`,
    )
  }
  if (!res.ok || !payload.data) {
    throw new Error(payload.error || `Error HTTP ${res.status}`)
  }
  return payload.data
}

function matchSede(raw: string | null, unidad: string): string {
  if (unidad === 'Alicón' || /alic/i.test(raw ?? '')) return 'Alicon'
  if (!raw) return AGRO_MONITOREO_SEDES[0]
  const hit = AGRO_MONITOREO_SEDES.find(
    (s) => s.toLowerCase() === raw.toLowerCase(),
  )
  if (hit) return hit
  const soft = AGRO_MONITOREO_SEDES.find(
    (s) =>
      s.toLowerCase().includes(raw.toLowerCase()) ||
      raw.toLowerCase().includes(s.toLowerCase().replace(/^finca\s+/i, '')),
  )
  return soft ?? raw
}

function matchTipoMedio(raw: string | null): string {
  if (!raw) return AGRO_TIPOS_AGUA[0]
  const hit = AGRO_TIPOS_AGUA.find(
    (t) => t.toLowerCase() === raw.toLowerCase(),
  )
  return hit ?? raw
}

function mapFirstMuestreoToForm(
  data: ExtractedMonitoreo,
  yearFallback: number,
  monthFallback: MonitoringMonth,
): {
  header: AgroMonitoreoHeader
  rows: AgroMonitoreoParamRow[]
  year: number | null
  month: MonitoringMonth | null
} {
  const first = data.muestreos[0]
  const fecha = first?.fecha ?? data.fecha
  let year: number | null = null
  let month: MonitoringMonth | null = null
  let dia = '1'

  if (fecha && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
    year = Number(fecha.slice(0, 4))
    const mi = Number(fecha.slice(5, 7))
    month =
      (MONITORING_MONTHS[mi - 1] as MonitoringMonth | undefined) ?? null
    dia = String(Number(fecha.slice(8, 10)) || 1)
  }

  const header: AgroMonitoreoHeader = {
    dia,
    plantaSede: matchSede(data.plantaSede, data.unidadNegocio),
    puntoMuestreo:
      first?.puntoMuestreo?.trim() ||
      data.puntoMuestreo?.trim() ||
      'Punto de muestreo (informe)',
    tipoAgua: matchTipoMedio(first?.tipoMedio ?? data.tipoAgua ?? data.medio),
    latitud:
      first?.latitud != null
        ? String(first.latitud)
        : data.latitud != null
          ? String(data.latitud)
          : '',
    longitud:
      first?.longitud != null
        ? String(first.longitud)
        : data.longitud != null
          ? String(data.longitud)
          : '',
  }

  const params = first?.parametros ?? data.parametros ?? []
  const base = emptyParamRows()
  const byName = new Map(
    params.map((p) => [p.parametro.trim().toLowerCase(), p]),
  )

  const rows: AgroMonitoreoParamRow[] = base.map((row) => {
    const found =
      byName.get(row.parametro.toLowerCase()) ||
      params.find((p) =>
        p.parametro.toLowerCase().includes(row.parametro.toLowerCase()),
      )
    if (!found) return row
    return {
      ...row,
      resultado: found.resultado != null ? String(found.resultado) : '',
      unidad: found.unidad || row.unidad,
      limitePermisible: found.limitePermisible || row.limitePermisible,
      cumple: found.cumple || row.cumple,
      observaciones: found.observaciones || row.observaciones,
    }
  })

  const known = new Set(
    AGRO_MONITOREO_PARAMETROS.map((p) => p.toLowerCase()),
  )
  for (const p of params) {
    if (known.has(p.parametro.toLowerCase())) continue
    if (
      rows.some(
        (r) => r.parametro.toLowerCase() === p.parametro.toLowerCase(),
      )
    ) {
      continue
    }
    rows.push({
      localId: `extra-${crypto.randomUUID()}`,
      parametro: p.parametro,
      resultado: p.resultado != null ? String(p.resultado) : '',
      unidad: p.unidad,
      limitePermisible: p.limitePermisible,
      cumple: p.cumple,
      observaciones: p.observaciones,
    })
  }

  return {
    header,
    rows,
    year: year ?? yearFallback,
    month: month ?? monthFallback,
  }
}

/** Pipeline: File → preview (sin guardar). */
export async function importMonitoreoLabPdf(
  file: File,
  yearFallback: number,
  monthFallback: MonitoringMonth,
): Promise<LabImportPreview> {
  const pdf = await extractPdfText(file, { mode: 'lab' })
  const data = await callExtractApi(pdf.text, file.name)
  if (!data.muestreos?.length && data.parametros?.length) {
    data.muestreos = [
      {
        fecha: data.fecha,
        puntoMuestreo: data.puntoMuestreo || 'Punto de muestreo',
        tipoMedio: data.tipoAgua || data.medio || 'Monitoreo',
        latitud: data.latitud,
        longitud: data.longitud,
        parametros: data.parametros,
      },
    ]
  }
  const mapped = mapFirstMuestreoToForm(data, yearFallback, monthFallback)
  const totalParametros = (data.muestreos ?? []).reduce(
    (a, m) => a + m.parametros.length,
    0,
  )
  return {
    fileName: file.name,
    pages: pdf.pages,
    extractNote: pdf.note,
    data,
    ...mapped,
    totalParametros,
  }
}

/** Persiste todos los muestreos del informe en Supabase. */
export async function saveImportedLabInforme(
  preview: LabImportPreview,
): Promise<{ savedRows: number; puntos: number }> {
  const { data, fileName } = preview
  return saveLabMonitoreoInforme({
    unidadNegocio: data.unidadNegocio || 'Alicón',
    plantaSede: matchSede(data.plantaSede, data.unidadNegocio),
    fuenteInforme: fileName,
    muestreos: (data.muestreos ?? []).map((m) => ({
      fecha: m.fecha || data.fecha || new Date().toISOString().slice(0, 10),
      puntoMuestreo: m.puntoMuestreo,
      tipoMedio: m.tipoMedio || data.medio || 'Monitoreo',
      latitud: m.latitud,
      longitud: m.longitud,
      parametros: m.parametros,
    })),
  })
}
