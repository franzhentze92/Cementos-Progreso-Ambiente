import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import {
  LegacyOperacionesRedirect,
  OperacionesPage,
} from './pages/OperationsPages'
import {
  DataEntryPage,
  LegacyEntradaRedirect,
} from './pages/DataEntryPage'
import { ProfilePage } from './pages/ProfilePage'
import { UsersPage } from './pages/UsersPage'
import { RoleAccessPage } from './pages/RoleAccessPage'
import { EstructuraTecnicaPage } from './pages/EstructuraTecnicaPage'
import { BibliotecaPage } from './pages/BibliotecaPage'
import { MapPage } from './pages/MapPage'
import { LiveMonitoringPage } from './pages/LiveMonitoringPage'
import { InspeccionCampoDetailPage } from './pages/InspeccionCampoDetailPage'
import { CumplimientoPage } from './pages/CumplimientoPage'
import { ResumenCumplimientoPage } from './pages/ResumenCumplimientoPage'
import { ResumenOperacionesPage } from './pages/ResumenOperacionesPage'
import { CalendarioLegalPage } from './pages/CalendarioLegalPage'
import { AuditoriasPage } from './pages/AuditoriasPage'
import { IndicadoresAmbientalesPage } from './pages/IndicadoresAmbientalesPage'
import { CentroDocumentalPage } from './pages/CentroDocumentalPage'
import { AdministracionHubPage } from './pages/AdministracionHubPage'
import { CapaPage } from './pages/CapaPage'
import { CompromisosListaPage } from './pages/CompromisosListaPage'
import { CompromisosFormPage } from './pages/CompromisosFormPage'
import { CompromisosEvidenciasPage } from './pages/CompromisosEvidenciasPage'
import { CompromisosSeguimientoPage } from './pages/CompromisosSeguimientoPage'
import { CompromisosResponsablesPage } from './pages/CompromisosResponsablesPage'
import { MetasPage } from './pages/MetasPage'
import { UmbralesPage } from './pages/UmbralesPage'
import { IntensidadPage } from './pages/IntensidadPage'
import { CircularidadPage } from './pages/CircularidadPage'
import { ExpedientesPage } from './pages/ExpedientesPage'
import { AnalistaPage } from './pages/AnalistaPage'
import { ExportesPage } from './pages/ExportesPage'
import { SmartHomeRedirect } from './components/SmartHomeRedirect'
import { NotFoundPage } from './pages/NotFoundPage'

function RedirectPlantaAliconLegacy() {
  const { moduleId = 'huella-de-carbono' } = useParams()
  return (
    <Navigate to={`/operaciones/${moduleId}?proyecto=planta-alicon`} replace />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/mapa" element={<MapPage />} />
              <Route
                path="/monitoreo-en-vivo"
                element={<LiveMonitoringPage />}
              />
              <Route
                path="/resumen-operaciones"
                element={<ResumenOperacionesPage />}
              />
              <Route
                path="/resumen-cumplimiento"
                element={<ResumenCumplimientoPage />}
              />
              <Route path="/cumplimiento" element={<CumplimientoPage />} />
              <Route
                path="/calendario-legal"
                element={<CalendarioLegalPage />}
              />
              <Route path="/auditorias" element={<AuditoriasPage />} />
              <Route path="/indicadores" element={<IndicadoresAmbientalesPage />} />
              <Route
                path="/centro-documental"
                element={<CentroDocumentalPage />}
              />
              <Route
                path="/administracion"
                element={<AdministracionHubPage />}
              />
              <Route path="/capa" element={<CapaPage />} />
              <Route
                path="/compromisos-ambientales"
                element={
                  <Navigate to="/compromisos-ambientales/lista" replace />
                }
              />
              <Route
                path="/compromisos-ambientales/lista"
                element={<CompromisosListaPage />}
              />
              <Route
                path="/compromisos-ambientales/crear"
                element={<CompromisosFormPage />}
              />
              <Route
                path="/compromisos-ambientales/editar/:id"
                element={<CompromisosFormPage />}
              />
              <Route
                path="/compromisos-ambientales/evidencias"
                element={<CompromisosEvidenciasPage />}
              />
              <Route
                path="/compromisos-ambientales/seguimiento"
                element={<CompromisosSeguimientoPage />}
              />
              <Route
                path="/compromisos-ambientales/responsables"
                element={<CompromisosResponsablesPage />}
              />
              <Route path="/metas" element={<MetasPage />} />
              <Route path="/umbrales" element={<UmbralesPage />} />
              <Route path="/intensidad" element={<IntensidadPage />} />
              <Route path="/circularidad" element={<CircularidadPage />} />
              <Route path="/expedientes" element={<ExpedientesPage />} />
              <Route path="/analista" element={<AnalistaPage />} />
              <Route path="/exportes" element={<ExportesPage />} />
              {/* Informe de inspección de campo */}
              <Route
                path="/entrada-datos/inspeccion-ambiental/informe/:id"
                element={<InspeccionCampoDetailPage />}
              />
              <Route
                path="/operaciones/inspeccion-ambiental/informe/:id"
                element={<InspeccionCampoDetailPage />}
              />
              <Route
                path="/entrada-datos/:scope/inspeccion-ambiental/informe/:id"
                element={<InspeccionCampoDetailPage />}
              />
              <Route
                path="/operaciones/:scope/inspeccion-ambiental/informe/:id"
                element={<InspeccionCampoDetailPage />}
              />
              <Route
                path="/inspecciones-campo/:id"
                element={<InspeccionCampoDetailPage />}
              />

              {/* Módulo-primero (proyectos se filtran con ?proyecto=) */}
              <Route
                path="/operaciones/:moduleId"
                element={<OperacionesPage />}
              />
              <Route
                path="/entrada-datos/:moduleId"
                element={<DataEntryPage />}
              />

              {/* Legacy: /sección/proyecto/módulo → /sección/módulo?proyecto= */}
              <Route
                path="/operaciones/:scope/:moduleId"
                element={<LegacyOperacionesRedirect />}
              />
              <Route
                path="/entrada-datos/:scope/:moduleId"
                element={<LegacyEntradaRedirect />}
              />

              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/usuarios" element={<UsersPage />} />
              <Route path="/accesos" element={<RoleAccessPage />} />
              <Route
                path="/estructura-tecnica"
                element={<EstructuraTecnicaPage />}
              />
              <Route path="/biblioteca" element={<BibliotecaPage />} />

              {/* Compatibilidad con rutas anteriores */}
              <Route
                path="/planta-alicon/:moduleId"
                element={<RedirectPlantaAliconLegacy />}
              />
              <Route
                path="/reportes/huella-de-carbono"
                element={
                  <Navigate
                    to="/operaciones/huella-de-carbono?proyecto=planta-alicon"
                    replace
                  />
                }
              />
              <Route
                path="/reportes/desempeno-ambiental"
                element={
                  <Navigate
                    to="/operaciones/gestion-de-residuos?proyecto=agroprogreso"
                    replace
                  />
                }
              />
              <Route
                path="/reportes/:reportId"
                element={
                  <Navigate
                    to="/operaciones/gestion-de-residuos?proyecto=agroprogreso"
                    replace
                  />
                }
              />
              {/* Dentro del layout: no redirigir en silencio al dashboard */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
          <Route path="/" element={<SmartHomeRedirect />} />
          <Route path="*" element={<SmartHomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
