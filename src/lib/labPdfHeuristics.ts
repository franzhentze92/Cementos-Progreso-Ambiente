/**
 * Parser de tablas INFORME DE RESULTADOS (Soluciones Analíticas / IMA).
 * Espera texto con columnas separadas por " | " (extracción lab de pdf.js).
 */

import { looksLikeDetectionLimit } from '../data/labMonitoreosCatalog'

export type HeuristicLabParam = {
  parametro: string
  resultado: number | null
  unidad: string
  limitePermisible: string
  cumple: '' | 'Si' | 'No'
  observaciones: string
}

function parseResultValue(raw: string): {
  resultado: number | null
  observaciones: string
} {
  const t = raw.trim()
  if (!t || t === '---') return { resultado: null, observaciones: '' }
  if (/^no\s+rechazable$/i.test(t) || /^ausente$/i.test(t)) {
    return { resultado: null, observaciones: t }
  }
  const lt = t.match(/^<\s*([\d.,]+)/)
  if (lt) {
    const n = Number(lt[1].replace(',', '.'))
    return {
      resultado: Number.isFinite(n) ? n : null,
      observaciones: `Valor reportado ${t}`,
    }
  }
  const gt = t.match(/^>\s*([\d.,]+)/)
  if (gt) {
    const n = Number(gt[1].replace(',', '.'))
    return {
      resultado: Number.isFinite(n) ? n : null,
      observaciones: `Valor reportado ${t}`,
    }
  }
  const n = Number(t.replace(',', '.').replace(/[^\d.eE+-]/g, ''))
  if (Number.isFinite(n)) return { resultado: n, observaciones: '' }
  return { resultado: null, observaciones: t }
}

function cell(parts: string[], idx: number): string {
  return (parts[idx] ?? '').trim()
}

function isDash(v: string): boolean {
  return !v || /^-+$/.test(v)
}

/**
 * Filas: Analito | Unidad | Valor | LMA | LMP | LD | Uk | Metodología
 */
export function parseLabResultsTable(text: string): HeuristicLabParam[] {
  const rows: HeuristicLabParam[] = []
  const seen = new Set<string>()

  // Solo el bloque del certificado de resultados (evita anexos de calibración)
  const start = Math.max(
    text.search(/Analito\s*\|\s*Unidad\s*\|\s*Valor/i),
    text.search(/INFORME DE RESULTADOS/i),
  )
  const endMarkers = [
    text.search(/Metodologías basadas en/i),
    text.search(/última línea/i),
    text.search(/Notas\s*\n/i),
    text.search(/Certificado de (Calibración|Mantenimiento)/i),
  ].filter((i) => i > start)
  const end =
    endMarkers.length > 0 ? Math.min(...endMarkers) : start + 15_000
  const slice =
    start >= 0 ? text.slice(start, Math.max(end, start + 500)) : text

  for (const rawLine of slice.split(/\n/)) {
    const line = rawLine.trim()
    if (!line.includes('|')) continue
    if (/Analito\s*\|\s*Unidad/i.test(line)) continue
    if (/Referencia de cliente|Procedencia|Especificación|INFORME DE/i.test(line)) {
      continue
    }

    const parts = line.split(/\s*\|\s*/).map((p) => p.trim())
    if (parts.length < 3) continue

    const nombre = parts[0].replace(/^\*+/, '').trim()
    if (!nombre || nombre.length < 2) continue
    if (/^(uk|ld|lma|lmp|valor|analito|\*+)$/i.test(nombre)) continue
    if (
      /coordenadas|condiciones ambientales|responsable|fecha y hora|número de muestra|tipo de muestra|subtipo|servicio de análisis|especificación|finca o ubicaci/i.test(
        nombre,
      )
    ) {
      continue
    }
    // Debe parecer un analito (empieza con letra)
    if (!/^[A-Za-zÁÉÍÓÚÜáéíóúüñÑ*]/.test(nombre)) continue

    const unidad = cell(parts, 1)
    const valorRaw = cell(parts, 2)
    // Algunas filas cortas no traen LMA/LMP
    let lma = cell(parts, 3)
    let lmp = cell(parts, 4)
    // Si la fila tiene menos columnas, no inventar
    if (parts.length < 5) {
      lma = ''
      lmp = ''
    }
    // 0.0 en LMP de microbio = no detectable (no un límite numérico)
    if (/^(0|0\.0+)$/.test(lmp)) lmp = ''
    if (/^(0|0\.0+)$/.test(lma)) lma = ''

    // Valor debe parecer número / < > / No rechazable
    if (
      !/^[<>]?\d|^No\s+rechazable/i.test(valorRaw) &&
      !/^ausente$/i.test(valorRaw)
    ) {
      continue
    }

    const key = nombre.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const parsed = parseResultValue(valorRaw)
    let limite = ''
    if (!isDash(lmp) && /^\d/.test(lmp)) {
      limite = lmp.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
    } else if (
      !isDash(lma) &&
      /^\d/.test(lma) &&
      !looksLikeDetectionLimit(lma, parsed.resultado)
    ) {
      limite = lma
    }
    // Rangos cloro: LMA-LMP
    if (
      /cloro residual/i.test(nombre) &&
      !isDash(cell(parts, 3)) &&
      !isDash(cell(parts, 4)) &&
      /^\d/.test(cell(parts, 3)) &&
      /^\d/.test(cell(parts, 4))
    ) {
      const a = cell(parts, 3).replace(/\.0+$/, '')
      const b = cell(parts, 4).replace(/\.0+$/, '')
      limite = `${a}-${b}`
    }
    if (
      /coliform|escherichia|e\.\s*coli/i.test(nombre) &&
      (!limite || limite === '0')
    ) {
      limite = 'No detectable'
    }

    rows.push({
      parametro: nombre,
      resultado: parsed.resultado,
      unidad: unidad === '---' ? '' : unidad.replace(/\s+/g, ' '),
      limitePermisible: limite,
      cumple: '',
      observaciones: parsed.observaciones,
    })
  }

  return rows
}

/** LMP / rangos COGUANOR NTG 29001 (+ cloro). Fallback si la celda LMP viene vacía. */
const NTG_29001_LIMITS: Record<string, string> = {
  ph: '6.5-8.5',
  'potencial de hidrogeno': '6.5-8.5',
  'conductividad electrica': '1500',
  turbidez: '15',
  turbiedad: '15',
  color: '35',
  'color verdadero': '35',
  nitrato: '50',
  nitratos: '50',
  nitrito: '3',
  nitritos: '3',
  calcio: '150',
  magnesio: '100',
  sulfato: '250',
  sulfatos: '250',
  boro: '0.3',
  cobre: '1.5',
  hierro: '0.3',
  manganeso: '0.4',
  bario: '0.7',
  zinc: '70',
  cinc: '70',
  cloruro: '250',
  cloruros: '250',
  'cloro residual': '0.5-1.0',
  'solidos disueltos totales': '1000',
  'solidos totales disueltos': '1000',
  aluminio: '0.1',
  arsenico: '0.01',
  cadmio: '0.003',
  cromo: '0.05',
  mercurio: '0.001',
  plomo: '0.01',
  dureza: '500',
  fluoruro: '1.5',
  fluoruros: '1.5',
  cianuro: '0.07',
  'coliformes totales': 'No detectable',
  'coliformes fecales': 'No detectable',
  'escherichia coli': 'No detectable',
}

function normKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function parseLimitBound(limite: string): {
  min: number | null
  max: number | null
  noneDetectable: boolean
} {
  const t = limite.trim()
  if (!t) return { min: null, max: null, noneDetectable: false }
  if (/no\s+detect/i.test(t)) {
    return { min: null, max: 0, noneDetectable: true }
  }
  const range = t.match(/^([\d.,]+)\s*[-–]\s*([\d.,]+)/)
  if (range) {
    return {
      min: Number(range[1].replace(',', '.')),
      max: Number(range[2].replace(',', '.')),
      noneDetectable: false,
    }
  }
  const n = Number(t.replace(',', '.').replace(/[^\d.eE+-]/g, ''))
  return {
    min: null,
    max: Number.isFinite(n) ? n : null,
    noneDetectable: false,
  }
}

export function evaluateCumple(
  resultado: number | null,
  observaciones: string,
  limite: string,
): '' | 'Si' | 'No' {
  if (!limite.trim()) return ''
  const bound = parseLimitBound(limite)
  const above = />\s*[\d.]/.test(observaciones)
  const below = /<\s*[\d.]/.test(observaciones)

  if (bound.noneDetectable) {
    if (above) return 'No'
    if (resultado != null && resultado > 0 && !below) return 'No'
    if (below) return 'Si'
    if (resultado != null && resultado > 0) return 'No'
    return 'Si'
  }

  if (resultado == null && !below && !above) return ''

  const value = resultado
  if (value == null) return ''

  if (bound.min != null && bound.max != null) {
    if (below) return value <= bound.max ? 'Si' : 'No'
    if (above) return 'No'
    return value >= bound.min && value <= bound.max ? 'Si' : 'No'
  }

  if (bound.max != null) {
    if (below) return value <= bound.max ? 'Si' : 'No'
    if (above) return value > bound.max ? 'No' : 'Si'
    return value <= bound.max ? 'Si' : 'No'
  }

  return ''
}

export function applyWaterNormLimits<
  T extends {
    parametro: string
    resultado: number | null
    unidad: string
    limitePermisible: string
    cumple: string
    observaciones: string
  },
>(params: T[]): T[] {
  return params.map((p) => {
    const key = normKey(p.parametro)
    let limite = p.limitePermisible.trim()
    if (!limite || looksLikeDetectionLimit(limite, p.resultado)) {
      limite = NTG_29001_LIMITS[key] ?? ''
    }
    if (
      key.includes('conductividad') &&
      p.resultado != null &&
      p.resultado < 10 &&
      /mS/i.test(p.unidad)
    ) {
      limite = '1.5'
    }
    const cumple = evaluateCumple(p.resultado, p.observaciones, limite)
    return { ...p, limitePermisible: limite, cumple }
  })
}

/**
 * Heurística (tabla PDF) = verdad de resultado/unidad/LMP.
 * La IA solo aporta parámetros que no estén en la tabla.
 */
export function mergeLabParams<
  T extends {
    parametro: string
    resultado: number | null
    unidad: string
    limitePermisible: string
    cumple: string
    observaciones: string
  },
>(aiParams: T[], heuristic: HeuristicLabParam[]): T[] {
  const byKey = new Map<string, T>()

  for (const h of heuristic) {
    const k = normKey(h.parametro)
    if (!k) continue
    byKey.set(k, { ...(h as unknown as T) })
  }

  for (const p of aiParams) {
    const k = normKey(p.parametro)
    if (!k) continue
    if (byKey.has(k)) continue // no pisar tabla
    byKey.set(k, { ...p })
  }

  return applyWaterNormLimits([...byKey.values()])
}
