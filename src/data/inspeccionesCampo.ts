/** Modelos para inspecciones de campo (captura conversacional). */

import { AGRO_INSPECCION_SEDES, AGRO_INSPECCION_UNIDAD } from './agroInspecciones'
import {
  ALICON_INSPECCION_SEDE,
  ALICON_INSPECCION_UNIDAD,
} from './aliconInspecciones'
import {
  DESCARGA_BARCOS_INSPECCION_SEDE,
  DESCARGA_BARCOS_INSPECCION_UNIDAD,
} from './descargaBarcosInspecciones'

export const INSPECCION_CLASIFICACIONES = [
  'buena_practica',
  'situacion_riesgo',
  'observacion_general',
] as const

export type InspeccionClasificacion = (typeof INSPECCION_CLASIFICACIONES)[number]

export const CLASIFICACION_LABELS: Record<InspeccionClasificacion, string> = {
  buena_practica: 'Buena práctica',
  situacion_riesgo: 'Situación de riesgo',
  observacion_general: 'Observación general',
}

export type InspeccionProyecto = {
  id: string
  label: string
  plantaSede: string
  unidadNegocio: string
}

export const INSPECCION_PROYECTOS: InspeccionProyecto[] = [
  ...AGRO_INSPECCION_SEDES.map((sede) => ({
    id: `agro:${sede}`,
    label: sede,
    plantaSede: sede,
    unidadNegocio: AGRO_INSPECCION_UNIDAD,
  })),
  {
    id: `alicon:${ALICON_INSPECCION_SEDE}`,
    label: ALICON_INSPECCION_SEDE,
    plantaSede: ALICON_INSPECCION_SEDE,
    unidadNegocio: ALICON_INSPECCION_UNIDAD,
  },
  {
    id: `descarga-barcos:${DESCARGA_BARCOS_INSPECCION_SEDE}`,
    label: DESCARGA_BARCOS_INSPECCION_SEDE,
    plantaSede: DESCARGA_BARCOS_INSPECCION_SEDE,
    unidadNegocio: DESCARGA_BARCOS_INSPECCION_UNIDAD,
  },
]

export type InspeccionArea = {
  id: string
  plantaSede: string
  unidadNegocio: string
  nombre: string
}

export type InspeccionHallazgoDraft = {
  localId: string
  areaId: string | null
  areaNombre: string
  clasificacion: InspeccionClasificacion
  comentario: string
  fotoUrls: string[]
  fotoPreviews: string[]
}

export type InspeccionCampoRecord = {
  id: string
  fecha: string
  unidadNegocio: string
  plantaSede: string
  responsable: string
  comentarioGeneral: string
  notaGeneral: string
  resultadoGeneral: number | null
  nivelRiesgo: string
  requiereAccionInmediata: string
  numHallazgos: number
  estado: string
  /** Clinker | Coque en Descarga Barcos; vacío en otros proyectos */
  materialDescarga: string
}

export type InspeccionHallazgoRecord = {
  id: string
  inspeccionId: string
  areaId: string | null
  areaNombre: string
  clasificacion: InspeccionClasificacion
  comentario: string
  fotoUrls: string[]
  orden: number
}

export type InspeccionCampoDetail = InspeccionCampoRecord & {
  hallazgos: InspeccionHallazgoRecord[]
}

/** Resuelve el scope de URL a partir de sede / unidad de negocio. */
export function inspeccionScopeFromSite(opts?: {
  unidadNegocio?: string
  plantaSede?: string
}): 'agroprogreso' | 'planta-alicon' | 'descarga-barcos' {
  const sede = (opts?.plantaSede ?? '').toLowerCase()
  const unidad = (opts?.unidadNegocio ?? '').toLowerCase()
  if (
    sede.includes('descarga') ||
    sede.includes('barco') ||
    unidad.includes('descarga') ||
    unidad.includes('barco')
  ) {
    return 'descarga-barcos'
  }
  if (sede === 'alicon' || unidad.includes('cementos')) {
    return 'planta-alicon'
  }
  return 'agroprogreso'
}

/** Ruta interna del informe detallado (bajo el módulo de inspección). */
export function inspeccionCampoDetailPath(
  id: string,
  opts?: { unidadNegocio?: string; plantaSede?: string },
): string {
  const scope = inspeccionScopeFromSite(opts)
  return `/entrada-datos/inspeccion-ambiental/informe/${id}?proyecto=${scope}`
}

export function isInspeccionCampoDetailPath(link: string): boolean {
  return Boolean(inspeccionCampoIdFromLink(link))
}

/** Extrae el UUID del informe desde rutas nuevas, legacy o URL absoluta. */
export function inspeccionCampoIdFromLink(link: string): string | null {
  const t = link.trim()
  const patterns = [
    /\/entrada-datos\/inspeccion-ambiental\/informe\/([0-9a-f-]{36})/i,
    /\/operaciones\/inspeccion-ambiental\/informe\/([0-9a-f-]{36})/i,
    /\/entrada-datos\/[^/]+\/inspeccion-ambiental\/informe\/([0-9a-f-]{36})/i,
    /\/operaciones\/[^/]+\/inspeccion-ambiental\/informe\/([0-9a-f-]{36})/i,
    /\/inspecciones-campo\/([0-9a-f-]{36})/i,
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (m?.[1]) return m[1]
  }
  return null
}

export function parseClasificacion(raw: string): InspeccionClasificacion | null {
  const t = raw.trim().toLowerCase()
  if (
    t === 'buena_practica' ||
    /buena\s*pr[aá]ctica|buen\s*pr[aá]ctica|bp\b/.test(t)
  ) {
    return 'buena_practica'
  }
  if (
    t === 'situacion_riesgo' ||
    /situaci[oó]n\s*de\s*riesgo|riesgo|peligro|cr[ií]tic/.test(t)
  ) {
    return 'situacion_riesgo'
  }
  if (
    t === 'observacion_general' ||
    /observaci[oó]n|obs\b|general/.test(t)
  ) {
    return 'observacion_general'
  }
  return null
}

/** Puntaje 0–100 y nivel de riesgo a partir de hallazgos. */
export function scoreFromHallazgos(
  hallazgos: Pick<InspeccionHallazgoDraft, 'clasificacion'>[],
): { resultado: number; nivelRiesgo: string; requiereAccion: string; numHallazgos: number } {
  let score = 100
  let riesgos = 0
  let observaciones = 0
  let buenas = 0

  for (const h of hallazgos) {
    if (h.clasificacion === 'situacion_riesgo') {
      riesgos += 1
      score -= 18
    } else if (h.clasificacion === 'observacion_general') {
      observaciones += 1
      score -= 6
    } else {
      buenas += 1
      score += 2
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)))
  const nivelRiesgo =
    riesgos > 0 ? 'Alto' : observaciones > 0 ? 'Medio' : 'Bajo'
  const requiereAccion = riesgos > 0 ? 'Si' : 'No'
  const numHallazgos = riesgos + observaciones

  return { resultado: score, nivelRiesgo, requiereAccion, numHallazgos }
}

/** Nota general ponderada: riesgos pesan más que observaciones; buenas prácticas destacan lo positivo. */
export function buildNotaGeneral(input: {
  plantaSede: string
  hallazgos: InspeccionHallazgoDraft[]
  comentarioGeneral: string
}): string {
  const { plantaSede, hallazgos, comentarioGeneral } = input
  const riesgos = hallazgos.filter((h) => h.clasificacion === 'situacion_riesgo')
  const observaciones = hallazgos.filter(
    (h) => h.clasificacion === 'observacion_general',
  )
  const buenas = hallazgos.filter((h) => h.clasificacion === 'buena_practica')
  const { resultado, nivelRiesgo } = scoreFromHallazgos(hallazgos)

  const lines: string[] = []
  lines.push(
    `Inspección en ${plantaSede}: resultado ${resultado}/100, nivel de riesgo ${nivelRiesgo}.`,
  )

  if (riesgos.length) {
    lines.push(
      `Prioridad alta — ${riesgos.length} situación(es) de riesgo: ${riesgos
        .map((h) => {
          const detail = h.comentario ? ` (${h.comentario})` : ''
          return `${h.areaNombre}${detail}`
        })
        .join('; ')}.`,
    )
  }

  if (observaciones.length) {
    lines.push(
      `Observaciones (${observaciones.length}): ${observaciones
        .map((h) => {
          const detail = h.comentario ? ` — ${h.comentario}` : ''
          return `${h.areaNombre}${detail}`
        })
        .join('; ')}.`,
    )
  }

  if (buenas.length) {
    lines.push(
      `Buenas prácticas destacadas (${buenas.length}): ${buenas
        .map((h) => {
          const detail = h.comentario ? ` — ${h.comentario}` : ''
          return `${h.areaNombre}${detail}`
        })
        .join('; ')}.`,
    )
  }

  if (!hallazgos.length) {
    lines.push('No se registraron hallazgos por área.')
  }

  if (comentarioGeneral.trim()) {
    lines.push(`Comentario del inspector: ${comentarioGeneral.trim()}`)
  }

  if (riesgos.length) {
    lines.push('Se recomienda acción inmediata sobre las situaciones de riesgo identificadas.')
  } else if (observaciones.length) {
    lines.push('Seguimiento recomendado sobre las observaciones registradas.')
  } else {
    lines.push('La inspección no identificó riesgos críticos; mantener las buenas prácticas.')
  }

  return lines.join(' ')
}
