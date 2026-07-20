/**
 * Parser heurístico de tablas "INFORME DE RESULTADOS"
 * (Soluciones Analíticas / IMA) cuando el texto PDF viene tabular.
 *
 * La IA suele confundir LD (límite de detección) con el valor medido;
 * esta tabla es la fuente de verdad para resultado/unidad.
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
  belowDetection: boolean
  aboveRange: boolean
} {
  const t = raw.trim()
  if (!t) {
    return {
      resultado: null,
      observaciones: '',
      belowDetection: false,
      aboveRange: false,
    }
  }
  if (/^no\s+rechazable$/i.test(t) || /^ausente$/i.test(t)) {
    return {
      resultado: null,
      observaciones: t,
      belowDetection: false,
      aboveRange: false,
    }
  }
  const lt = t.match(/^<\s*([\d.,]+)/)
  if (lt) {
    const n = Number(lt[1].replace(',', '.'))
    return {
      resultado: Number.isFinite(n) ? n : null,
      observaciones: `Valor reportado ${t}`,
      belowDetection: true,
      aboveRange: false,
    }
  }
  const gt = t.match(/^>\s*([\d.,]+)/)
  if (gt) {
    const n = Number(gt[1].replace(',', '.'))
    return {
      resultado: Number.isFinite(n) ? n : null,
      observaciones: `Valor reportado ${t}`,
      belowDetection: false,
      aboveRange: true,
    }
  }
  const n = Number(t.replace(',', '.').replace(/[^\d.eE+-]/g, ''))
  if (Number.isFinite(n)) {
    return {
      resultado: n,
      observaciones: '',
      belowDetection: false,
      aboveRange: false,
    }
  }
  return {
    resultado: null,
    observaciones: t,
    belowDetection: false,
    aboveRange: false,
  }
}

function splitUnitMethod(prefix: string): string {
  const t = prefix.trim()
  const known = t.match(
    /^(µS\/cm|μS\/cm|uS\/cm|u PtCo|U Pt-Co|UNT|NTU|NMP\/\s*100\s*mL|UFC\/mL|mg\/L|ud\.\s*pH|u\.e\.|µg\/m3|ug\/m3)/i,
  )
  if (known) return known[1].replace(/\s+/g, ' ').trim()
  return t.split(/\s+/)[0] || ''
}

/**
 * Extrae filas tipo: `unidad método \\t VALOR \\t NombreAnalito LD ---`
 * El número tras el nombre es LD, no el resultado.
 */
export function parseLabResultsTable(text: string): HeuristicLabParam[] {
  const start = Math.max(
    text.search(/Analito\s+Unidad/i),
    text.search(/INFORME DE RESULTADOS/i),
  )
  const slice =
    start >= 0 ? text.slice(start, start + 12_000) : text.slice(0, 12_000)

  const rows: HeuristicLabParam[] = []
  const seen = new Set<string>()

  const lineRe =
    /^(.+?)\t([<>]?\d+[.,]?\d*|No rechazable|Ausente)\t\*?\s*([A-Za-zÁÉÍÓÚÜáéíóúüñÑ][^0-9\t]{1,60}?)(?:\s+[\d.<]+)?(?:\s+[\d.<]+)?(?:\s+---+)?\s*$/gm

  let m: RegExpExecArray | null
  while ((m = lineRe.exec(slice)) != null) {
    const prefix = m[1].trim()
    if (
      /referencia|procedencia|responsable|servicio|coordenadas|finca/i.test(
        prefix,
      )
    ) {
      continue
    }
    const valorRaw = m[2].trim()
    let nombre = m[3]
      .trim()
      .replace(/\*+/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s+---+$/g, '')
      .trim()
    nombre = nombre.replace(/\s+[\d.]+$/g, '').trim()
    if (!nombre || nombre.length < 2) continue
    if (/^(uk|ld|lma|lmp|valor|analito)$/i.test(nombre)) continue

    const key = nombre.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const parsed = parseResultValue(valorRaw)
    rows.push({
      parametro: nombre,
      resultado: parsed.resultado,
      unidad: splitUnitMethod(prefix),
      limitePermisible: '',
      cumple: '',
      observaciones: parsed.observaciones,
    })
  }

  return rows
}

/** LMP / rangos COGUANOR NTG 29001 (+ cloro Acuerdo 523-2013). */
const NTG_29001_LIMITS: Record<string, string> = {
  ph: '6.5-8.5',
  'potencial de hidrogeno': '6.5-8.5',
  'conductividad electrica': '1500', // µS/cm (1.5 mS/cm)
  turbidez: '15',
  turbiedad: '15',
  color: '35',
  'color verdadero': '35',
  'color aparente': '',
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
  const below = /<\s*[\d.]/.test(observaciones) || /Valor reportado\s*</i.test(observaciones)

  if (bound.noneDetectable) {
    if (above) return 'No'
    if (resultado != null && resultado > 0 && !below) return 'No'
    if (below && resultado === 0) return 'Si'
    if (resultado != null && resultado > 0) return 'No'
    return 'Si'
  }

  if (resultado == null) return ''

  if (bound.min != null && bound.max != null) {
    if (below) {
      // <LD dentro o bajo el rango → suele cumplir si LD <= max
      return resultado <= bound.max ? 'Si' : 'No'
    }
    if (above) return 'No'
    return resultado >= bound.min && resultado <= bound.max ? 'Si' : 'No'
  }

  if (bound.max != null) {
    if (below) {
      // Menor que LD: cumple si el umbral de detección está bajo el LMP
      return resultado <= bound.max ? 'Si' : 'No'
    }
    if (above) return resultado > bound.max ? 'No' : 'Si'
    return resultado <= bound.max ? 'Si' : 'No'
  }

  return ''
}

/** Aplica LMP NTG 29001 cuando no hay límite legal confiable. */
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
    // Conductividad en µS/cm: LMP 1500; si viniera en mS/cm (~1) usar 1.5
    if (
      key.includes('conductividad') &&
      p.resultado != null &&
      p.resultado < 10 &&
      /mS/i.test(p.unidad)
    ) {
      limite = '1.5'
    }

    const cumple = evaluateCumple(p.resultado, p.observaciones, limite)
    return {
      ...p,
      limitePermisible: limite,
      cumple,
    }
  })
}

/**
 * Heurística = verdad de resultado/unidad.
 * La IA solo aporta parámetros extra o límites legales válidos.
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
    const existing = byKey.get(k)
    if (!existing) {
      // Descarta si parece que el "resultado" es un LD típico sin soporte
      byKey.set(k, { ...p })
      continue
    }
    // Heurística manda en valor medido y unidad
    // (no sobrescribir con IA)
    const aiLimite = p.limitePermisible.trim()
    if (
      !existing.limitePermisible &&
      aiLimite &&
      !looksLikeDetectionLimit(aiLimite, existing.resultado)
    ) {
      existing.limitePermisible = aiLimite
      if (p.cumple === 'Si' || p.cumple === 'No') existing.cumple = p.cumple
    }
  }

  return applyWaterNormLimits([...byKey.values()])
}
