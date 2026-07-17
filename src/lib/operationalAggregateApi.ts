import type { AgroInspeccionRecord } from '../data/agroInspecciones'
import type { AgroIncidenteRecord } from '../data/agroIncidentes'
import type { ProjectScope } from '../data/operationalModules'
import { loadAgroInspecciones } from './agroInspeccionesApi'
import { loadAliconInspecciones } from './aliconInspeccionesApi'
import { loadDescargaBarcosInspecciones } from './descargaBarcosInspeccionesApi'
import { loadAgroIncidentes } from './agroIncidentesApi'
import { loadAliconIncidentes } from './aliconIncidentesApi'

const INSPECCION_LOADERS: Record<
  ProjectScope,
  (() => Promise<AgroInspeccionRecord[]>) | null
> = {
  agroprogreso: loadAgroInspecciones,
  'planta-alicon': loadAliconInspecciones,
  'descarga-barcos': loadDescargaBarcosInspecciones,
}

const INCIDENTE_LOADERS: Record<
  ProjectScope,
  (() => Promise<AgroIncidenteRecord[]>) | null
> = {
  agroprogreso: loadAgroIncidentes,
  'planta-alicon': loadAliconIncidentes,
  'descarga-barcos': null,
}

export async function loadInspeccionesForScopes(
  scopes: ProjectScope[],
): Promise<AgroInspeccionRecord[]> {
  const results = await Promise.all(
    scopes.map(async (scope) => {
      const load = INSPECCION_LOADERS[scope]
      if (!load) return [] as AgroInspeccionRecord[]
      return load()
    }),
  )
  return results.flat()
}

export async function loadIncidentesForScopes(
  scopes: ProjectScope[],
): Promise<AgroIncidenteRecord[]> {
  const results = await Promise.all(
    scopes.map(async (scope) => {
      const load = INCIDENTE_LOADERS[scope]
      if (!load) return [] as AgroIncidenteRecord[]
      return load()
    }),
  )
  return results.flat()
}
