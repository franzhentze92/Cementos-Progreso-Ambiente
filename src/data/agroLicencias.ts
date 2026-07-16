/** Modelo Licencias ambientales · C. Admin Licencias · Agroprogreso. */

export const AGRO_LICENCIA_UNIDAD = 'Agroprogreso'

export const AGRO_LICENCIA_SEDES = [
  'Agro San Miguel',
  'Finca El Pilar',
  'Finca La Marina',
  'Saquipec',
  'Aprovechamiento forestal Helios',
] as const

export const AGRO_LICENCIA_CATEGORIAS = [
  'A',
  'B1',
  'B2',
  'C',
  'C+PGA',
  'CR',
] as const

export const AGRO_LICENCIA_ESTADOS = [
  'VIGENTE',
  'EN PROCESO',
  'DESISTIDO',
] as const

export const AGRO_LICENCIA_COORDS: Record<string, { lat: number; lng: number }> =
  {
    'Agro San Miguel': { lat: 14.813632, lng: -90.278771 },
    'Finca El Pilar': { lat: 14.707722, lng: -90.713167 },
    'Finca La Marina': { lat: 14.55, lng: -90.65 },
    Saquipec: { lat: 14.62, lng: -90.58 },
    'Aprovechamiento forestal Helios': { lat: 14.735452, lng: -90.703316 },
  }

export type AgroLicenciaRecord = {
  id: string
  unidadNegocio: string
  plantaSede: string
  licencia: string
  expediente: string
  categoria: string
  vigencia: string
  vigenciaInicio: string | null
  vigenciaFin: string | null
  estado: string
  latitud: number | null
  longitud: number | null
}

export type AgroLicenciaFormRow = {
  localId: string
  id?: string
  plantaSede: string
  licencia: string
  expediente: string
  categoria: string
  vigencia: string
  estado: string
}

export function formatNum(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

/** Parsea "Del D/M/YYYY al D/M/YYYY" o "D/M/YYYY al D/M/YYYY". */
export function parseVigencia(text: string): {
  inicio: string | null
  fin: string | null
  label: string
} {
  const raw = (text ?? '').trim()
  if (!raw || /^no\s*aplica$/i.test(raw)) {
    return { inicio: null, fin: null, label: raw || 'NO APLICA' }
  }
  const m = raw.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4}).*?(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  )
  if (!m) return { inicio: null, fin: null, label: raw }
  const inicio = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const fin = `${m[6]}-${m[5].padStart(2, '0')}-${m[4].padStart(2, '0')}`
  return { inicio, fin, label: `Del ${m[1]}/${m[2]}/${m[3]} al ${m[4]}/${m[5]}/${m[6]}` }
}

export function formatVigenciaLabel(
  inicio: string | null,
  fin: string | null,
  fallback = 'NO APLICA',
): string {
  if (!inicio || !fin) return fallback
  const [yi, mi, di] = inicio.split('-')
  const [yf, mf, df] = fin.split('-')
  return `Del ${Number(di)}/${Number(mi)}/${yi} al ${Number(df)}/${Number(mf)}/${yf}`
}

export function daysUntil(dateIso: string | null, now = new Date()): number | null {
  if (!dateIso) return null
  const end = new Date(`${dateIso}T12:00:00`)
  if (Number.isNaN(end.getTime())) return null
  const start = new Date(now)
  start.setHours(12, 0, 0, 0)
  return Math.ceil((end.getTime() - start.getTime()) / 86400000)
}

export function coordsForSede(sede: string): {
  lat: number | null
  lng: number | null
} {
  const hit = AGRO_LICENCIA_COORDS[sede]
  return hit ? { lat: hit.lat, lng: hit.lng } : { lat: null, lng: null }
}

export function emptyLicenciaRow(): AgroLicenciaFormRow {
  return {
    localId: `new-${crypto.randomUUID()}`,
    plantaSede: 'Finca El Pilar',
    licencia: '',
    expediente: '',
    categoria: 'B2',
    vigencia: 'NO APLICA',
    estado: 'EN PROCESO',
  }
}

export function formRowsFromRecords(
  records: AgroLicenciaRecord[],
): AgroLicenciaFormRow[] {
  return records
    .slice()
    .sort((a, b) =>
      a.plantaSede.localeCompare(b.plantaSede) ||
      a.licencia.localeCompare(b.licencia),
    )
    .map((r) => ({
      localId: r.id,
      id: r.id,
      plantaSede: r.plantaSede,
      licencia: r.licencia,
      expediente: r.expediente,
      categoria: r.categoria,
      vigencia: r.vigencia || 'NO APLICA',
      estado: r.estado,
    }))
}
