import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { OperacionesPage } from './pages/OperationsPages'
import { DataEntryPage } from './pages/DataEntryPage'
import { ProfilePage } from './pages/ProfilePage'
import { MapPage } from './pages/MapPage'

function RedirectPlantaAliconLegacy() {
  const { moduleId = 'huella-de-carbono' } = useParams()
  return <Navigate to={`/operaciones/planta-alicon/${moduleId}`} replace />
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
                path="/operaciones/:scope/:moduleId"
                element={<OperacionesPage />}
              />

              <Route
                path="/entrada-datos/planta-alicon"
                element={
                  <Navigate
                    to="/entrada-datos/planta-alicon/incidentes-ambientales"
                    replace
                  />
                }
              />
              <Route
                path="/entrada-datos/:scope/:moduleId"
                element={<DataEntryPage />}
              />
              <Route path="/perfil" element={<ProfilePage />} />

              {/* Compatibilidad con rutas anteriores */}
              <Route
                path="/planta-alicon/:moduleId"
                element={<RedirectPlantaAliconLegacy />}
              />
              <Route
                path="/reportes/huella-de-carbono"
                element={
                  <Navigate
                    to="/operaciones/planta-alicon/huella-de-carbono"
                    replace
                  />
                }
              />
              <Route
                path="/reportes/desempeno-ambiental"
                element={
                  <Navigate
                    to="/operaciones/agroprogreso/gestion-de-residuos"
                    replace
                  />
                }
              />
              <Route
                path="/reportes/:reportId"
                element={
                  <Navigate
                    to="/operaciones/agroprogreso/gestion-de-residuos"
                    replace
                  />
                }
              />
              <Route
                path="/entrada-datos/huella-de-carbono"
                element={
                  <Navigate to="/entrada-datos/planta-alicon" replace />
                }
              />
              <Route
                path="/entrada-datos/:entryId"
                element={
                  <Navigate
                    to="/entrada-datos/agroprogreso/gestion-de-residuos"
                    replace
                  />
                }
              />
              <Route
                path="/operaciones/:moduleId"
                element={
                  <Navigate
                    to="/operaciones/agroprogreso/gestion-de-residuos"
                    replace
                  />
                }
              />
            </Route>
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
