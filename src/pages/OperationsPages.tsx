import { useParams } from 'react-router-dom'
import { CarbonFootprintPage } from './CarbonFootprintPage'
import { AgroConsumoAguaReportPage } from './AgroConsumoAguaReportPage'
import { AgroResiduosReportPage } from './AgroResiduosReportPage'
import { AgroInspeccionesReportPage } from './AgroInspeccionesReportPage'
import { AgroIncidentesReportPage } from './AgroIncidentesReportPage'
import { AgroMonitoreosReportPage } from './AgroMonitoreosReportPage'
import { AgroCapacitacionesReportPage } from './AgroCapacitacionesReportPage'
import { AgroLicenciasReportPage } from './AgroLicenciasReportPage'
import { AgroCompostajeReportPage } from './AgroCompostajeReportPage'
import { AgroNdaCascoVerdeReportPage } from './AgroNdaCascoVerdeReportPage'
import { AgroNdaGeneralReportPage } from './AgroNdaGeneralReportPage'
import { AgroGestionTramitesReportPage } from './AgroGestionTramitesReportPage'
import { AliconIncidentesReportPage } from './AliconIncidentesReportPage'
import { AliconInspeccionesReportPage } from './AliconInspeccionesReportPage'
import { AliconMonitoreosReportPage } from './AliconMonitoreosReportPage'
import { ModulePlaceholder } from '../components/ModulePlaceholder'

const SCOPE_LABELS: Record<string, string> = {
  agroprogreso: 'Agroprogreso',
  'planta-alicon': 'Planta Alicón',
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

export function OperacionesPage() {
  const { scope = 'agroprogreso', moduleId = 'gestion-de-residuos' } =
    useParams()

  if (scope === 'planta-alicon' && moduleId === 'huella-de-carbono') {
    return <CarbonFootprintPage />
  }

  if (scope === 'planta-alicon' && moduleId === 'incidentes-ambientales') {
    return <AliconIncidentesReportPage />
  }

  if (scope === 'planta-alicon' && moduleId === 'inspeccion-ambiental') {
    return <AliconInspeccionesReportPage />
  }

  if (scope === 'planta-alicon' && moduleId === 'monitoreo-ambiental') {
    return <AliconMonitoreosReportPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'consumo-de-agua') {
    return <AgroConsumoAguaReportPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'gestion-de-residuos') {
    return <AgroResiduosReportPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'inspeccion-ambiental') {
    return <AgroInspeccionesReportPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'incidentes-ambientales') {
    return <AgroIncidentesReportPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'monitoreo-ambiental') {
    return <AgroMonitoreosReportPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'capacitaciones') {
    return <AgroCapacitacionesReportPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'licencias-ambientales') {
    return <AgroLicenciasReportPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'compostaje') {
    return <AgroCompostajeReportPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'nda-casco-verde') {
    return <AgroNdaCascoVerdeReportPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'nda-general') {
    return <AgroNdaGeneralReportPage />
  }

  if (scope === 'agroprogreso' && moduleId === 'gestion-de-tramites') {
    return <AgroGestionTramitesReportPage />
  }

  const scopeLabel = SCOPE_LABELS[scope] ?? 'Operaciones'
  const title = MODULE_TITLES[moduleId] ?? 'Módulo'

  return (
    <ModulePlaceholder
      section={`Operaciones · ${scopeLabel}`}
      title={title}
      description="Visualización de indicadores operativos ambientales."
    />
  )
}
