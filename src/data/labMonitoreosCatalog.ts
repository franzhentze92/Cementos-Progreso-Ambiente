/**
 * Catálogo de medios, puntos y parámetros de laboratorio
 * (Alicón + Agroprogreso) para normalizar extracción de PDFs.
 */

export const LAB_UNIDADES = ['Alicón', 'Agroprogreso'] as const

export const LAB_MEDIOS = [
  'Agua potable',
  'Agua residual',
  'Agua superficial',
  'Agua ordinaria',
  'Material particulado',
  'Ruido',
  'Mixto',
  'Monitoreo',
] as const

export type LabMedio = (typeof LAB_MEDIOS)[number]

/** Puntos conocidos Alicón (informes IMA / Soluciones Analíticas). */
export const ALICON_LAB_PUNTOS = [
  'Salida Lagunas Alicon',
  'Patio de coque',
  'Colindancia este',
  'Colindancia oeste',
  'Colindancia norte',
  'Colindancia sur',
  'Subestación Alicon',
] as const

/** Parámetros frecuentes por medio (nombres canónicos). */
export const LAB_PARAMETROS_AGUA = [
  'pH',
  'Conductividad eléctrica',
  'Turbidez',
  'Cloro residual',
  'Color aparente',
  'Color verdadero',
  'Temperatura',
  'Sólidos disueltos totales',
  'Sólidos suspendidos',
  'Sólidos sedimentables',
  'Grasas y aceites',
  'Materia flotante',
  'Nitrógeno total',
  'Fósforo total',
  'DQO',
  'DBO',
  'Coliformes totales',
  'Coliformes fecales',
  'Hierro',
  'Manganeso',
  'Arsénico',
  'Bario',
  'Boro',
  'Cadmio',
  'Cobre',
  'Cromo',
  'Plomo',
  'Mercurio',
  'Níquel',
  'Zinc',
  'Fluoruros',
  'Nitratos',
  'Nitritos',
  'Sulfatos',
  'Cloruros',
] as const

export const LAB_PARAMETROS_AIRE = [
  'PM2.5',
  'PM10',
  'TSP',
  'SO2',
  'NO2',
  'CO',
  'O3',
] as const

export const LAB_PARAMETROS_RUIDO = [
  'LAeq 24h',
  'LAeq diurno',
  'LAeq nocturno',
  'LAmax',
  'LAmin',
] as const

/** Infere el medio del analito (p. ej. LAeq → Ruido aunque el muestreo venga como Mixto/MP). */
export function inferLabMedioFromParametro(
  parametro: string,
  fallbackMedio = 'Monitoreo',
): string {
  const key = parametro
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()

  if (
    /^(laeq|lamax|lamin|la\s|noise|ruido|presion sonora|presión sonora|dba|db\b)/i.test(
      key,
    ) ||
    LAB_PARAMETROS_RUIDO.some((p) => key.includes(p.toLowerCase()))
  ) {
    return 'Ruido'
  }

  if (
    /^(pm2|pm10|pm2\.5|pm2,5|tsp|pts|so2|no2|\bco\b|\bo3\b|material particulado)/i.test(
      key,
    ) ||
    LAB_PARAMETROS_AIRE.some((p) => key.includes(p.toLowerCase()))
  ) {
    return 'Material particulado'
  }

  if (
    /agua|ph|turbid|conductiv|cloro|coliform|dbo|dqo|hierro|mangan|solidos|caudal|nitr|fosf|fósf|grasa|color/i.test(
      key,
    ) ||
    LAB_PARAMETROS_AGUA.some((p) => key === p.toLowerCase() || key.includes(p.toLowerCase()))
  ) {
    const fb = matchLabMedio(fallbackMedio)
    if (fb.startsWith('Agua') || fb === 'Agua ordinaria') return fb
    return 'Agua potable'
  }

  const fb = matchLabMedio(fallbackMedio)
  return fb === 'Mixto' || fb === 'Monitoreo' ? fallbackMedio || 'Monitoreo' : fb
}

const PARAM_ALIASES: Record<string, string> = {
  'ph': 'pH',
  'turbiedad': 'Turbidez',
  'turbidez': 'Turbidez',
  'conductividad': 'Conductividad eléctrica',
  'conductividad electrica': 'Conductividad eléctrica',
  'conductividad eléctrica': 'Conductividad eléctrica',
  'cloro residual': 'Cloro residual',
  'cloro residual (in situ)': 'Cloro residual',
  'solidos disueltos totales': 'Sólidos disueltos totales',
  'sólidos disueltos totales': 'Sólidos disueltos totales',
  'sdt': 'Sólidos disueltos totales',
  'solidos suspendidos': 'Sólidos suspendidos',
  'sólidos suspendidos': 'Sólidos suspendidos',
  'sst': 'Sólidos suspendidos',
  'coliformes totales': 'Coliformes totales',
  'coliformes fecales': 'Coliformes fecales',
  'hierro': 'Hierro',
  'manganeso': 'Manganeso',
  'bario': 'Bario',
  'boro': 'Boro',
  'cinc': 'Zinc',
  'zinc': 'Zinc',
  'pm2.5': 'PM2.5',
  'pm2,5': 'PM2.5',
  'pm25': 'PM2.5',
  'promedio pm2.5': 'PM2.5',
  'pm10': 'PM10',
  'promedio pm10': 'PM10',
  'tsp': 'TSP',
  'pts': 'TSP',
  'laeq 24h': 'LAeq 24h',
  'laeq': 'LAeq 24h',
  'nivel de ruido': 'LAeq 24h',
  'ruido': 'LAeq 24h',
  'presion sonora': 'LAeq 24h',
  'presión sonora': 'LAeq 24h',
}

const PUNTO_ALIASES: Record<string, string> = {
  'salida lagunas alicon': 'Salida Lagunas Alicon',
  'salida lagunas': 'Salida Lagunas Alicon',
  'salida de lagunas alicon': 'Salida Lagunas Alicon',
  'patio de coque': 'Patio de coque',
  'colindancia este': 'Colindancia este',
  'colindancia oeste': 'Colindancia oeste',
  'colindancia norte': 'Colindancia norte',
  'colindancia sur': 'Colindancia sur',
  'subestacion alicon': 'Subestación Alicon',
  'subestación alicon': 'Subestación Alicon',
}

const MEDIO_ALIASES: Record<string, LabMedio> = {
  'agua potable': 'Agua potable',
  'potable': 'Agua potable',
  'agua residual': 'Agua residual',
  'residual': 'Agua residual',
  'agua superficial': 'Agua superficial',
  'superficial': 'Agua superficial',
  'agua ordinaria': 'Agua ordinaria',
  'ordinaria': 'Agua ordinaria',
  'material particulado': 'Material particulado',
  'particulado': 'Material particulado',
  'aire': 'Material particulado',
  'calidad del aire': 'Material particulado',
  'ruido': 'Ruido',
  'presion sonora': 'Ruido',
  'presión sonora': 'Ruido',
  'niveles de ruido': 'Ruido',
  'mixto': 'Mixto',
  'aire y ruido': 'Mixto',
}

function normKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchLabMedio(raw: string | null | undefined): string {
  if (!raw?.trim()) return 'Monitoreo'
  const key = normKey(raw)
  if (MEDIO_ALIASES[key]) return MEDIO_ALIASES[key]
  const soft = LAB_MEDIOS.find((m) => {
    const mk = normKey(m)
    return key.includes(mk) || mk.includes(key)
  })
  return soft ?? raw.trim()
}

export function matchLabPunto(raw: string | null | undefined): string {
  if (!raw?.trim()) return 'Punto de muestreo'
  const key = normKey(raw)
  if (PUNTO_ALIASES[key]) return PUNTO_ALIASES[key]
  const soft = ALICON_LAB_PUNTOS.find((p) => {
    const pk = normKey(p)
    return key.includes(pk) || pk.includes(key)
  })
  return soft ?? raw.trim()
}

export function matchLabParametro(raw: string | null | undefined): string {
  if (!raw?.trim()) return ''
  const key = normKey(raw)
  if (PARAM_ALIASES[key]) return PARAM_ALIASES[key]
  // quita prefijos "Promedio …"
  const stripped = key.replace(/^promedio\s+/, '')
  if (PARAM_ALIASES[stripped]) return PARAM_ALIASES[stripped]
  const all = [
    ...LAB_PARAMETROS_AGUA,
    ...LAB_PARAMETROS_AIRE,
    ...LAB_PARAMETROS_RUIDO,
  ]
  const soft = all.find((p) => {
    const pk = normKey(p)
    return key === pk || key.includes(pk) || pk.includes(key)
  })
  return soft ?? raw.trim()
}

/**
 * Detecta límites que parecen LOD/LD/EMP/precisión del método
 * y no un límite legal (COGUANOR, OMS, etc.).
 */
export function looksLikeDetectionLimit(
  limite: string,
  resultado: number | null,
): boolean {
  const t = limite.trim()
  if (!t) return false
  if (/^(lod|ld|loq|lq|emp|mdl|precisi[oó]n|incertidumbre)/i.test(t)) {
    return true
  }
  const n = Number(t.replace(',', '.').replace(/[^\d.eE+-]/g, ''))
  if (!Number.isFinite(n)) return false
  // Valores típicos de LOD mal tomados como límite legal
  if (n === 0 || n === 0.0) return true
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

export function sanitizeLimitePermisible(
  limite: string,
  resultado: number | null,
  observaciones: string,
): { limite: string; observaciones: string } {
  const t = limite.trim()
  if (!t) return { limite: '', observaciones }
  if (!looksLikeDetectionLimit(t, resultado)) {
    return { limite: t, observaciones }
  }
  const note = `LOD/precisión reportada: ${t} (no usar como límite legal)`
  const obs = observaciones.includes(note)
    ? observaciones
    : [observaciones, note].filter(Boolean).join(' · ')
  return { limite: '', observaciones: obs }
}
