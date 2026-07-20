/**
 * Parser heurístico de tablas "INFORME DE RESULTADOS"
 * (Soluciones Analíticas / IMA) cuando el texto PDF viene tabular.
 */

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
  if (!t) return { resultado: null, observaciones: '' }
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

function splitUnitMethod(prefix: string): string {
  const t = prefix.trim()
  // "mg/L EPA 6010D" | "μS/cm SMWW 2510 B" | "UFC/mL SMWW 9215 B"
  const m = t.match(
    /^((?:µ|μ|u)?(?:S\/cm|PtCo|NTU|UNT|NMP\/\s*100\s*mL|UFC\/mL|mg\/L|ud\.\s*pH|u\.e\.|dBA|µg\/m3|ug\/m3)[^\t]*?)(?:\s+[A-Z0-9].*)?$/i,
  )
  if (m) {
    const unit = m[1]
      .replace(/\s+SMWW.*$/i, '')
      .replace(/\s+EPA.*$/i, '')
      .replace(/\s+Hach.*$/i, '')
      .replace(/\s+AOAC.*$/i, '')
      .replace(/\s+Conductom.*$/i, '')
      .replace(/\s+MColortest.*$/i, '')
      .replace(/\s+P\.LFQ.*$/i, '')
      .replace(/\s+Sensorial.*$/i, '')
      .trim()
    return unit || t.split(/\s+/)[0] || ''
  }
  return t.split(/\s+/)[0] || ''
}

/**
 * Extrae filas tipo: `unidad método \\t valor \\t NombreAnalito LD ---`
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
    if (/referencia|procedencia|responsable|servicio|coordenadas|finca/i.test(prefix)) {
      continue
    }
    const valorRaw = m[2].trim()
    let nombre = m[3]
      .trim()
      .replace(/\*+/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s+---+$/g, '')
      .trim()
    // quita LD residual pegado al nombre si quedó
    nombre = nombre.replace(/\s+[\d.]+$/g, '').trim()
    if (!nombre || nombre.length < 2) continue
    if (/^(uk|ld|lma|lmp|valor|analito)$/i.test(nombre)) continue

    const key = nombre.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const { resultado, observaciones } = parseResultValue(valorRaw)
    rows.push({
      parametro: nombre,
      resultado,
      unidad: splitUnitMethod(prefix),
      limitePermisible: '',
      cumple: '',
      observaciones,
    })
  }

  return rows
}

/** Une parámetros de IA + heurística (sin perder analitos del PDF). */
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
  for (const p of aiParams) {
    const k = p.parametro.trim().toLowerCase()
    if (k) byKey.set(k, p)
  }
  for (const h of heuristic) {
    const k = h.parametro.trim().toLowerCase()
    if (!k) continue
    const existing = byKey.get(k)
    if (!existing) {
      byKey.set(k, { ...(h as unknown as T) })
      continue
    }
    // Completa huecos de la IA con la heurística
    if (existing.resultado == null && h.resultado != null) {
      existing.resultado = h.resultado
    }
    if (!existing.unidad && h.unidad) existing.unidad = h.unidad
    if (!existing.observaciones && h.observaciones) {
      existing.observaciones = h.observaciones
    }
  }
  return [...byKey.values()]
}
