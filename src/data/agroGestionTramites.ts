/** Modelo Gestión de trámites · C. Admin corporativo · Agroprogreso. */

export const AGRO_TRAMITES_UNIDAD = 'Agroprogreso'

export const AGRO_TRAMITES_SEDES = [
  'Finca El Pilar',
  'Finca La Marina',
  'Finca San Miguel',
] as const

export const AGRO_TRAMITES_PROYECTOS = [
  'Actualización ETAR',
  'Enmienda a compromisos',
  'Instrumento Ambiental',
  'Renovación Licencia',
  'Capacitaciones',
  'Oficio de categorización',
] as const

export const AGRO_TRAMITES_ESTADOS = [
  'En proceso',
  'Cerrado',
  'Por solicitar',
] as const

export const AGRO_TRAMITES_PRIORIDADES = ['Normal', 'Alta'] as const

export const AGRO_TRAMITES_ASIGNADOS = [
  'Fernanda Figueroa',
  'Renato Arguera',
  'Marilyn',
] as const

export const AGRO_TRAMITES_COORDS: Record<
  string,
  { lat: number; lng: number }
> = {
  'Finca El Pilar': { lat: 14.707722, lng: -90.713167 },
  'Finca La Marina': { lat: 14.55, lng: -90.65 },
  'Finca San Miguel': { lat: 14.813632, lng: -90.278771 },
}

export type AgroTramiteRecord = {
  id: string
  fechaSolicitud: string
  unidadNegocio: string
  plantaSede: string
  nombreProyecto: string
  estado: string
  asignadoA: string
  prioridad: string
  observaciones: string
  latitud: number | null
  longitud: number | null
}

export type AgroTramiteFormRow = {
  localId: string
  id?: string
  fechaSolicitud: string
  plantaSede: string
  nombreProyecto: string
  estado: string
  asignadoA: string
  prioridad: string
  observaciones: string
}

export function formatNum(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function coordsForSede(sede: string): {
  lat: number | null
  lng: number | null
} {
  const hit = AGRO_TRAMITES_COORDS[sede]
  return hit ? { lat: hit.lat, lng: hit.lng } : { lat: null, lng: null }
}

export function emptyTramiteRow(): AgroTramiteFormRow {
  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return {
    localId: `new-${crypto.randomUUID()}`,
    fechaSolicitud: iso,
    plantaSede: 'Finca El Pilar',
    nombreProyecto: 'Instrumento Ambiental',
    estado: 'En proceso',
    asignadoA: 'Fernanda Figueroa',
    prioridad: 'Normal',
    observaciones: '',
  }
}

export function formRowsFromRecords(
  records: AgroTramiteRecord[],
): AgroTramiteFormRow[] {
  return records
    .slice()
    .sort(
      (a, b) =>
        b.fechaSolicitud.localeCompare(a.fechaSolicitud) ||
        a.plantaSede.localeCompare(b.plantaSede),
    )
    .map((r) => ({
      localId: r.id,
      id: r.id,
      fechaSolicitud: r.fechaSolicitud,
      plantaSede: r.plantaSede,
      nombreProyecto: r.nombreProyecto,
      estado: r.estado,
      asignadoA: r.asignadoA,
      prioridad: r.prioridad,
      observaciones: r.observaciones,
    }))
}

export function yearFromFecha(fecha: string): number {
  return Number(fecha.slice(0, 4))
}

export function monthKeyFromFecha(fecha: string): string {
  return fecha.slice(0, 7)
}
