/**
 * Extrae resultados de informes de laboratorio (PDF → texto)
 * hacia monitoreos de cumplimiento / control (Agro o Alicón).
 * Soporta varios puntos de muestreo en un mismo informe.
 */

export type ExtractedMonitoreoParam = {
  parametro: string
  resultado: number | null
  unidad: string
  limitePermisible: string
  /** Límite de detección / precisión del método (NO es límite legal). */
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

/** Formato nuevo (multi-punto) + compat con extract viejo (un solo muestreo). */
export type ExtractedMonitoreoInforme = {
  unidadNegocio: string
  plantaSede: string
  laboratorio: string | null
  medio: string
  notas: string | null
  confidence: 'alta' | 'media' | 'baja'
  muestreos: ExtractedMuestreo[]
  /** Compat: primer muestreo aplanado */
  fecha: string | null
  puntoMuestreo: string | null
  tipoAgua: string | null
  latitud: number | null
  longitud: number | null
  parametros: ExtractedMonitoreoParam[]
}

/** Alias histórico usado por el cliente. */
export type ExtractedMonitoreo = ExtractedMonitoreoInforme

export type ExtractMonitoreoResult =
  | { ok: true; data: ExtractedMonitoreoInforme }
  | { ok: false; status: number; error: string }

const SYSTEM = `Eres un extractor de informes de laboratorio / monitoreos de cumplimiento para Cementos Progreso (Alicón, Agroprogreso).
Devuelves SOLO JSON válido (sin markdown).

Estructura:
{
  "unidadNegocio": "Alicón" | "Agroprogreso",
  "plantaSede": "Alicon" | "Finca El Pilar" | "Finca San Miguel" | ...,
  "laboratorio": string|null,
  "medio": "Agua potable" | "Agua residual" | "Agua superficial" | "Material particulado" | "Ruido" | "Mixto" | otro,
  "notas": string|null,
  "confidence": "alta"|"media"|"baja",
  "muestreos": [
    {
      "fecha": "YYYY-MM-DD"|null,
      "puntoMuestreo": string,
      "tipoMedio": string,
      "latitud": number|null,
      "longitud": number|null,
      "parametros": [
        {
          "parametro": string,
          "resultado": number|null,
          "unidad": string,
          "limitePermisible": string,
          "limiteDeteccion": string,
          "cumple": "Si"|"No"|"",
          "observaciones": string
        }
      ]
    }
  ]
}

REGLA CRÍTICA — límites (NO confundir):
- "limitePermisible" = SOLO límite legal / normativo / de cumplimiento (COGUANOR, OMS, LMP, LMA, CMA, norma nacional, criterio del informe etiquetado como límite máximo/permisible/admisible).
- "limiteDeteccion" = LD, LOD, LOQ, LQ, EMP, precisión, incertidumbre, "Error", "Indicación", sensibilidad del método. NUNCA lo pongas en limitePermisible.
- Si la tabla tiene columnas tipo "EMP", "LD", "Error (g)" junto al resultado, eso es limiteDeteccion, no limitePermisible.
- Si NO hay límite legal explícito: limitePermisible = "" (cadena vacía). No inventes ni copies la precisión del equipo.
- Ejemplo incorrecto: pH=7.82 con limitePermisible "0.01" (eso es precisión/LD). Correcto: limitePermisible "" y limiteDeteccion "0.01".
- Ejemplo correcto aire: PM2.5 resultado 13.7, limitePermisible "15" (OMS/norma), cumple según compare.

Otras reglas:
- Un informe puede tener VARIOS puntos (Salida Lagunas Alicon, Patio de coque, Colindancia este, etc.). Un objeto en "muestreos" por cada punto.
- Si el PDF mezcla aire y ruido, crea muestreos SEPARADOS por tipoMedio aunque sea el mismo punto geográfico: uno "Material particulado" (PM2.5, PM10, TSP) y otro "Ruido" (LAeq, LAmax…). Nunca pongas LAeq bajo Material particulado.
- Extrae TODOS los analitos de la tabla INFORME DE RESULTADOS / Analito (metales, microbio, fisicoquímicos). No te detengas en 10–15: incluye la lista completa.
- resultado: número; si viene "<0.01" o ">23" usa el número y anota el texto original en observaciones.
- Para tablas con columnas LMA/LMP/LD: limitePermisible = LMP (o LMA si no hay LMP); limiteDeteccion = LD.
- cumple: Si/No solo si el informe lo indica o se deduce vs limitePermisible legal; si no hay límite legal, cumple "".
- No inventes cifras ni límites.
- Cliente Alicón / Cementos Progreso / Puerto Barrios → unidadNegocio "Alicón", plantaSede "Alicon".
- Agroprogreso / fincas → unidadNegocio "Agroprogreso".`

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const text = fenced?.[1]?.trim() ?? trimmed
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Sin JSON en la respuesta')
  return JSON.parse(text.slice(start, end + 1))
}

function asString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t : null
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const cleaned = v.trim().replace(',', '.')
    const lt = cleaned.match(/^<\s*([\d.]+)/)
    if (lt) {
      const n = Number(lt[1])
      return Number.isFinite(n) ? n : null
    }
    const n = Number(cleaned.replace(/[^\d.eE+-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function looksLikeDetectionLimit(
  limite: string,
  resultado: number | null,
): boolean {
  const t = limite.trim()
  if (!t) return false
  if (/^(lod|ld|loq|lq|emp|mdl|precisi[oó]n|incertidumbre|error)/i.test(t)) {
    return true
  }
  const n = Number(t.replace(',', '.').replace(/[^\d.eE+-]/g, ''))
  if (!Number.isFinite(n)) return false
  if (n === 0) return true
  if (n > 0 && n <= 0.01 && (resultado == null || resultado > 1)) return true
  if (
    resultado != null &&
    Number.isFinite(resultado) &&
    n > 0 &&
    resultado / n >= 50 &&
    n <= 10
  ) {
    return true
  }
  return false
}

function normalizeParam(p: unknown): ExtractedMonitoreoParam | null {
  const row = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>
  const parametro = asString(row.parametro)
  if (!parametro) return null
  const cumpleRaw = asString(row.cumple)?.toLowerCase() ?? ''
  let cumple: ExtractedMonitoreoParam['cumple'] =
    cumpleRaw === 'si' || cumpleRaw === 'sí' || cumpleRaw === 'yes'
      ? 'Si'
      : cumpleRaw === 'no'
        ? 'No'
        : ''
  let observaciones = asString(row.observaciones) ?? ''
  if (
    typeof row.resultado === 'string' &&
    row.resultado.trim().startsWith('<') &&
    !observaciones
  ) {
    observaciones = `Valor reportado ${row.resultado.trim()}`
  }
  const resultado = asNumber(row.resultado)
  let limitePermisible = asString(row.limitePermisible) ?? ''
  let limiteDeteccion = asString(row.limiteDeteccion) ?? ''
  if (limitePermisible && looksLikeDetectionLimit(limitePermisible, resultado)) {
    if (!limiteDeteccion) limiteDeteccion = limitePermisible
    const note = `LOD/precisión reportada: ${limitePermisible} (no usar como límite legal)`
    if (!observaciones.includes(note)) {
      observaciones = [observaciones, note].filter(Boolean).join(' · ')
    }
    limitePermisible = ''
    if (cumple) cumple = ''
  }
  if (limiteDeteccion && !observaciones.includes(limiteDeteccion)) {
    observaciones = [observaciones, `LD/EMP: ${limiteDeteccion}`]
      .filter(Boolean)
      .join(' · ')
  }
  return {
    parametro,
    resultado,
    unidad: asString(row.unidad) ?? '',
    limitePermisible,
    limiteDeteccion,
    cumple,
    observaciones,
  }
}

function normalizeInforme(raw: unknown): ExtractedMonitoreoInforme {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >

  let muestreos: ExtractedMuestreo[] = []

  if (Array.isArray(o.muestreos) && o.muestreos.length > 0) {
    muestreos = o.muestreos
      .map((m) => {
        const row = (m && typeof m === 'object' ? m : {}) as Record<
          string,
          unknown
        >
        const punto =
          asString(row.puntoMuestreo) ||
          asString(row.punto) ||
          'Punto de muestreo'
        const params = Array.isArray(row.parametros)
          ? row.parametros
              .map(normalizeParam)
              .filter((x): x is ExtractedMonitoreoParam => x != null)
          : []
        return {
          fecha: asString(row.fecha),
          puntoMuestreo: punto,
          tipoMedio:
            asString(row.tipoMedio) ||
            asString(row.tipoAgua) ||
            asString(o.medio) ||
            'Monitoreo',
          latitud: asNumber(row.latitud),
          longitud: asNumber(row.longitud),
          parametros: params,
        }
      })
      .filter((m) => m.parametros.length > 0)
  } else {
    // Compat formato antiguo (un solo muestreo en raíz)
    const params = Array.isArray(o.parametros)
      ? o.parametros
          .map(normalizeParam)
          .filter((x): x is ExtractedMonitoreoParam => x != null)
      : []
    if (params.length) {
      muestreos = [
        {
          fecha: asString(o.fecha),
          puntoMuestreo: asString(o.puntoMuestreo) || 'Punto de muestreo',
          tipoMedio: asString(o.tipoAgua) || asString(o.medio) || 'Monitoreo',
          latitud: asNumber(o.latitud),
          longitud: asNumber(o.longitud),
          parametros: params,
        },
      ]
    }
  }

  const conf = asString(o.confidence)?.toLowerCase()
  const confidence: ExtractedMonitoreoInforme['confidence'] =
    conf === 'alta' || conf === 'media' || conf === 'baja' ? conf : 'media'

  const first = muestreos[0]
  let unidad = asString(o.unidadNegocio) || 'Alicón'
  if (/agro/i.test(unidad)) unidad = 'Agroprogreso'
  if (/alic|cementos\s*progreso/i.test(unidad)) unidad = 'Alicón'

  let sede = asString(o.plantaSede) || (unidad === 'Alicón' ? 'Alicon' : '')
  if (/alic/i.test(sede)) sede = 'Alicon'

  return {
    unidadNegocio: unidad,
    plantaSede: sede || 'Alicon',
    laboratorio: asString(o.laboratorio),
    medio: asString(o.medio) || first?.tipoMedio || 'Monitoreo',
    notas: asString(o.notas),
    confidence,
    muestreos,
    fecha: first?.fecha ?? null,
    puntoMuestreo: first?.puntoMuestreo ?? null,
    tipoAgua: first?.tipoMedio ?? null,
    latitud: first?.latitud ?? null,
    longitud: first?.longitud ?? null,
    parametros: first?.parametros ?? [],
  }
}

/** Recorta texto largo: inicio + final (tablas de resultados suelen ir al final). */
function clipLabText(text: string, maxChars = 48_000): string {
  if (text.length <= maxChars) return text
  const head = Math.floor(maxChars * 0.45)
  const tail = maxChars - head - 40
  return `${text.slice(0, head)}\n\n[…texto omitido…]\n\n${text.slice(-tail)}`
}

export async function extractMonitoreoFromText(input: {
  text: string
  fileName?: string
  apiKey: string
}): Promise<ExtractMonitoreoResult> {
  const text = input.text.trim()
  if (text.length < 40) {
    return {
      ok: false,
      status: 400,
      error:
        'El PDF no tiene texto suficiente. Puede ser escaneado; prueba un PDF con texto seleccionable.',
    }
  }

  const clipped = clipLabText(text)
  const userContent =
    `Archivo: ${input.fileName ?? 'informe.pdf'}\n\n` +
    `Texto del informe:\n"""\n${clipped}\n"""`

  let openaiRes: Response
  try {
    openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.05,
        response_format: { type: 'json_object' },
        max_tokens: 8000,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userContent },
        ],
      }),
    })
  } catch (err) {
    console.error('OpenAI extract network error', err)
    return {
      ok: false,
      status: 502,
      error: 'No se pudo contactar al modelo de IA. Intenta de nuevo.',
    }
  }

  if (!openaiRes.ok) {
    const errText = await openaiRes.text().catch(() => '')
    console.error('OpenAI extract error', openaiRes.status, errText)
    return {
      ok: false,
      status: 502,
      error:
        openaiRes.status === 429
          ? 'El servicio de IA está saturado. Espera un momento e intenta de nuevo.'
          : 'Error al consultar el modelo de IA',
    }
  }

  const data = (await openaiRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    return { ok: false, status: 502, error: 'Respuesta vacía del modelo' }
  }

  try {
    const parsed = normalizeInforme(parseJsonObject(content))
    const totalParams = parsed.muestreos.reduce(
      (a, m) => a + m.parametros.length,
      0,
    )
    if (totalParams === 0) {
      return {
        ok: false,
        status: 422,
        error:
          'La IA no encontró parámetros en el informe. Revisa que sea un informe de laboratorio de monitoreos.',
      }
    }
    return { ok: true, data: parsed }
  } catch (err) {
    console.error(err)
    return {
      ok: false,
      status: 502,
      error: 'No se pudo interpretar la respuesta de la IA',
    }
  }
}
