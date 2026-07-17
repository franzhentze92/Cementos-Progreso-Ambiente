import { useParams } from 'react-router-dom'
import { AgroConsumoAguaPage } from './AgroConsumoAguaPage'
import { AgroResiduosPage } from './AgroResiduosPage'
import { AgroInspeccionesPage } from './AgroInspeccionesPage'
import { AgroIncidentesPage } from './AgroIncidentesPage'
import { AgroMonitoreosPage } from './AgroMonitoreosPage'
import { AgroCapacitacionesPage } from './AgroCapacitacionesPage'
import { AgroLicenciasPage } from './AgroLicenciasPage'
import { AgroCompostajePage } from './AgroCompostajePage'
import { AgroNdaCascoVerdePage } from './AgroNdaCascoVerdePage'
import { AgroNdaGeneralPage } from './AgroNdaGeneralPage'
import { AgroGestionTramitesPage } from './AgroGestionTramitesPage'
import { AliconIncidentesPage } from './AliconIncidentesPage'
import { AliconInspeccionesPage } from './AliconInspeccionesPage'
import { DescargaBarcosInspeccionesPage } from './DescargaBarcosInspeccionesPage'
import { AliconMonitoreosPage } from './AliconMonitoreosPage'
import { CarbonDataEntryPage } from './CarbonDataEntryPage'
import { ModulePlaceholder } from '../components/ModulePlaceholder'

const SCOPE_LABELS: Record<string, string> = {
  agroprogreso: 'Agroprogreso',
  'planta-alicon': 'Planta Alicón',
  'descarga-barcos': 'Descarga Barcos',
}

const MODULE_TITLES: Record<string, string> = {
  'gestion-de-residuos': 'Gestión de residuos',
  'consumo-de-agua': 'Consumo de agua',
  'inspeccion-ambiental': 'Inspección ambiental',
  'incidentes-ambientales': 'Incidentes ambientales',
  'monitoreo-ambiental': 'Monitoreo ambiental',
  capacitaciones: 'Capacitaciones',
  'licencias-ambientales': 'Licencias ambientales',
  compostaje: 'Compostaje',
  'nda-casco-verde': 'NDA Casco Verde',
  'nda-general': 'NDA General',
  'gestion-de-tramites': 'Gestión de trámites',
  'huella-de-carbono': 'Huella de carbono',
}

export function DataEntryPage() {
  const { scope = 'agroprogreso', moduleId = 'gestion-de-residuos' } =
    useParams()

  if (scope === 'agroprogreso' && moduleId === 'consumo-de-agua') {
    return <AgroConsumoAguaPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'gestion-de-residuos') {
    return <AgroResiduosPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'inspeccion-ambiental') {
    return <AgroInspeccionesPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'incidentes-ambientales') {
    return <AgroIncidentesPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'monitoreo-ambiental') {
    return <AgroMonitoreosPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'capacitaciones') {
    return <AgroCapacitacionesPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'licencias-ambientales') {
    return <AgroLicenciasPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'compostaje') {
    return <AgroCompostajePage />
  }

  if (scope === 'agroprogreso' && moduleId === 'nda-casco-verde') {
    return <AgroNdaCascoVerdePage />
  }

  if (scope === 'agroprogreso' && moduleId === 'nda-general') {
    return <AgroNdaGeneralPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'gestion-de-tramites') {
    return <AgroGestionTramitesPage />
  }

  if (scope === 'planta-alicon' && moduleId === 'incidentes-ambientales') {
    return <AliconIncidentesPage />
  }

  if (scope === 'planta-alicon' && moduleId === 'inspeccion-ambiental') {
    return <AliconInspeccionesPage />
  }

  if (scope === 'descarga-barcos' && moduleId === 'inspeccion-ambiental') {
    return <DescargaBarcosInspeccionesPage />
  }

  if (scope === 'planta-alicon' && moduleId === 'monitoreo-ambiental') {
    return <AliconMonitoreosPage />
  }

  if (scope === 'planta-alicon' && moduleId === 'huella-de-carbono') {
    return <CarbonDataEntryPage />
  }

  const scopeLabel = SCOPE_LABELS[scope] ?? 'Entrada de Datos'
  const title = MODULE_TITLES[moduleId] ?? 'Entrada de Datos'

  return (
    <ModulePlaceholder
      section={`Entrada de Datos · ${scopeLabel}`}
      title={title}
      mode="entry"
    />
  )
}
