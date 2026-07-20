/**
 * Cliente: PDF de laboratorio → texto → IA → muestreos tipados → guardar.
 */

import {
  AGRO_MONITOREO_PARAMETROS,
  AGRO_MONITOREO_SEDES,
  emptyParamRows,
  type AgroMonitoreoHeader,
  type AgroMonitoreoParamRow,
  type MonitoringMonth,
} from '../data/agroMonitoreos'
import { MONITORING_MONTHS } from '../data/carbonMonitoring'
import {
  inferLabMedioFromParametro,
  matchLabMedio,
  matchLabParametro,
  matchLabPunto,
  sanitizeLimitePermisible,
} from '../data/labMonitoreosCatalog'
import { saveLabMonitoreoInforme } from './agroMonitoreosApi'
import {
  mergeLabParams,
  parseLabResultsTable,
} from './labPdfHeuristics'
import { extractPdfText } from './pdfExtract'

export type ExtractedMonitoreoParam = {
  parametro: string
  resultado: number | null
  unidad: string
  limitePermisible: string
  limiteDeteccion?: string
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

function normalizeExtracted(data: ExtractedMonitoreo): ExtractedMonitoreo {
  const medioInforme = matchLabMedio(data.medio)
  const muestreosRaw = (data.muestreos ?? []).map((m) => ({
    ...m,
    puntoMuestreo: matchLabPunto(m.puntoMuestreo),
    tipoMedio: matchLabMedio(m.tipoMedio || medioInforme),
    parametros: m.parametros.map((p) => {
      const sanitized = sanitizeLimitePermisible(
        p.limitePermisible,
        p.resultado,
        p.observaciones ?? '',
      )
      let cumple = p.cumple
      if (!sanitized.limite && cumple) cumple = ''
      const parametro = matchLabParametro(p.parametro)
      return {
        ...p,
        parametro,
        limitePermisible: sanitized.limite,
        observaciones: sanitized.observaciones,
        cumple,
      }
    }),
  }))

  // Separa aire vs ruido (y agua) aunque vengan en el mismo punto del PDF.
  const muestreos: ExtractedMuestreo[] = []
  for (const m of muestreosRaw) {
    const byMedio = new Map<string, ExtractedMonitoreoParam[]>()
    for (const p of m.parametros) {
      const medio = inferLabMedioFromParametro(p.parametro, m.tipoMedio)
      const list = byMedio.get(medio) ?? []
      list.push(p)
      byMedio.set(medio, list)
    }
    for (const [tipoMedio, parametros] of byMedio) {
      muestreos.push({
        ...m,
        tipoMedio,
        parametros,
      })
    }
  }

  let unidad = data.unidadNegocio || 'Alicón'
  if (/agro/i.test(unidad)) unidad = 'Agroprogreso'
  if (/alic|cementos\s*progreso/i.test(unidad)) unidad = 'Alicón'

  let sede = data.plantaSede || (unidad === 'Alicón' ? 'Alicon' : '')
  if (/alic/i.test(sede)) sede = 'Alicon'
  else {
    const hit = AGRO_MONITOREO_SEDES.find(
      (s) => s.toLowerCase() === sede.toLowerCase(),
    )
    if (hit) sede = hit
  }

  const medios = [...new Set(muestreos.map((m) => m.tipoMedio))]
  const medio =
    medios.length > 1
      ? 'Mixto'
      : matchLabMedio(medios[0] || medioInforme)

  const first = muestreos[0]
  return {
    ...data,
    unidadNegocio: unidad,
    plantaSede: sede || (unidad === 'Alicón' ? 'Alicon' : sede),
    medio,
    muestreos,
    fecha: first?.fecha ?? data.fecha,
    puntoMuestreo: first?.puntoMuestreo ?? data.puntoMuestreo,
    tipoAgua: first?.tipoMedio ?? matchLabMedio(data.tipoAgua ?? medio),
    latitud: first?.latitud ?? data.latitud,
    longitud: first?.longitud ?? data.longitud,
    parametros: first?.parametros ?? data.parametros,
  }
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
  return normalizeExtracted(payload.data)
}

/** Completa analitos que la IA omitió parseando la tabla tabular del PDF. */
function enrichWithTableHeuristics(
  data: ExtractedMonitoreo,
  pdfText: string,
): ExtractedMonitoreo {
  const parsed = parseLabResultsTable(pdfText)
  if (!parsed.length) return data

  const heuristic = parsed.map((h) => ({
    parametro: matchLabParametro(h.parametro) || h.parametro,
    resultado: h.resultado,
    unidad: h.unidad,
    limitePermisible: h.limitePermisible,
    cumple: '' as const,
    observaciones: h.observaciones,
  }))

  const puntos = new Map<string, ExtractedMuestreo>()
  for (const m of data.muestreos) {
    const key = m.puntoMuestreo
    const prev = puntos.get(key)
    if (!prev) {
      puntos.set(key, { ...m, parametros: [...m.parametros] })
    } else {
      prev.parametros.push(...m.parametros)
      puntos.set(key, prev)
    }
  }

  let targetKey =
    [...puntos.keys()].find((p) => /laguna|salida|agua/i.test(p)) ??
    [...puntos.keys()][0]

  if (!targetKey) {
    targetKey = matchLabPunto(
      /laguna|alicon/i.test(pdfText)
        ? 'Salida Lagunas Alicon'
        : 'Punto de muestreo',
    )
    puntos.set(targetKey, {
      fecha: data.fecha,
      puntoMuestreo: targetKey,
      tipoMedio: 'Agua potable',
      latitud: data.latitud,
      longitud: data.longitud,
      parametros: [],
    })
  }

  const target = puntos.get(targetKey)!
  const before = target.parametros.length
  target.parametros = mergeLabParams(target.parametros, heuristic)
  if (
    target.parametros.length > before ||
    /agua|potable/i.test(pdfText.slice(0, 2000))
  ) {
    if (!/agua/i.test(target.tipoMedio)) target.tipoMedio = 'Agua potable'
  }
  puntos.set(targetKey, target)

  const noteExtra =
    heuristic.length > 0
      ? `Valores tomados de la tabla del PDF (${heuristic.length} analitos; no del LD).`
      : null

  const normalized = normalizeExtracted({
    ...data,
    medio: /agua/i.test(data.medio) ? data.medio : 'Agua potable',
    muestreos: [...puntos.values()],
    notas: [data.notas, noteExtra].filter(Boolean).join(' · ') || data.notas,
  })
  return normalized
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
    plantaSede: data.plantaSede,
    puntoMuestreo:
      first?.puntoMuestreo?.trim() ||
      data.puntoMuestreo?.trim() ||
      'Punto de muestreo (informe)',
    tipoAgua: matchLabMedio(
      first?.tipoMedio ?? data.tipoAgua ?? data.medio,
    ),
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
  const data = enrichWithTableHeuristics(
    await callExtractApi(pdf.text, file.name),
    pdf.text,
  )
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
): Promise<{ savedRows: number; puntos: number; metaColumns: boolean }> {
  const { data, fileName } = preview
  return saveLabMonitoreoInforme({
    unidadNegocio: data.unidadNegocio || 'Alicón',
    plantaSede: data.plantaSede || 'Alicon',
    fuenteInforme: fileName,
    laboratorio: data.laboratorio,
    medio: data.medio,
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
