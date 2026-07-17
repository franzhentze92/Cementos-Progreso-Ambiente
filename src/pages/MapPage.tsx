import { useEffect, useMemo, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import { Loader2, MapPin, Radio, Search } from 'lucide-react'
import {
  LOCATION_COUNTRIES,
  LOCATION_TYPES,
  SITES,
  type LocationCountry,
  type LocationType,
  type SiteLocation,
} from '../data/locations'
import {
  RISK_COLORS,
  RISK_LABELS,
  riskForMapSite,
  type SiteRiskCard,
  type SiteRiskLevel,
} from '../data/siteRiskBridge'
import { loadSiteRiskOverlay } from '../lib/siteRiskApi'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER: [number, number] = [13.2, -86.5]
const DEFAULT_ZOOM = 5
const OPS_CENTER: [number, number] = [14.75, -90.45]
const OPS_ZOOM = 9

export const TYPE_COLORS: Record<LocationType, string> = {
  'Planta de cemento': '#047935',
  'Planta de concreto': '#d97706',
  'Centro de distribución': '#2563eb',
  'Centro de ventas': '#7c3aed',
  Oficinas: '#475569',
  'Planta histórica': '#a16207',
}

const TYPE_SVGS: Record<LocationType, string> = {
  'Planta de cemento': `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M5 20V9l5-4v15"/><path d="M10 9h6l3 3v8"/><path d="M14 20v-5h4v5"/><circle cx="15.5" cy="12.5" r="1" fill="#fff" stroke="none"/></svg>`,
  'Planta de concreto': `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M14 13h4l3 3v4h-7v-7z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
  'Centro de distribución': `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35"/><path d="M2 8.35 12 2l10 6.35"/><path d="M12 22V12"/><path d="M7 12h10"/></svg>`,
  'Centro de ventas': `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18l-1.5 11h-15L3 9z"/><path d="M8 9V5a4 4 0 0 1 8 0v4"/><circle cx="9" cy="14" r="1" fill="#fff" stroke="none"/><circle cx="15" cy="14" r="1" fill="#fff" stroke="none"/></svg>`,
  Oficinas: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M12 6h.01M12 10h.01M12 14h.01"/></svg>`,
  'Planta histórica': `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/><path d="M9 10h.01M15 10h.01"/></svg>`,
}

function createTypeIcon(type: LocationType, active: boolean, riskColor?: string) {
  const color = riskColor ?? TYPE_COLORS[type]
  const size = active ? 44 : 38
  const icon = TYPE_SVGS[type]

  return L.divIcon({
    className: 'progreso-marker',
    html: `
      <div class="map-pin${active ? ' is-active' : ''}" style="--pin-color:${color}; width:${size}px; height:${size}px;">
        <div class="map-pin-body">${icon}</div>
        <span class="map-pin-point"></span>
      </div>
    `,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 6],
    popupAnchor: [0, -(size + 2)],
  })
}

function MapFlyTo({
  site,
  ops,
}: {
  site: SiteLocation | null
  ops: SiteRiskCard | null
}) {
  const map = useMap()

  useEffect(() => {
    if (ops) {
      map.flyTo([ops.lat, ops.lng], 12, { duration: 1.0 })
      return
    }
    if (!site) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true })
      return
    }
    map.flyTo([site.lat, site.lng], 13, { duration: 1.1 })
  }, [site, ops, map])

  return null
}

function FitFilteredBounds({ sites }: { sites: SiteLocation[] }) {
  const map = useMap()

  useEffect(() => {
    if (sites.length === 0) return
    if (sites.length === 1) {
      map.setView([sites[0].lat, sites[0].lng], 11, { animate: true })
      return
    }
    const bounds = L.latLngBounds(
      sites.map((s) => [s.lat, s.lng] as [number, number]),
    )
    map.fitBounds(bounds.pad(0.18), { animate: true })
  }, [sites, map])

  return null
}

function FitOpsBounds({ cards }: { cards: SiteRiskCard[] }) {
  const map = useMap()
  useEffect(() => {
    if (!cards.length) {
      map.setView(OPS_CENTER, OPS_ZOOM)
      return
    }
    const bounds = L.latLngBounds(
      cards.map((c) => [c.lat, c.lng] as [number, number]),
    )
    map.fitBounds(bounds.pad(0.35), { animate: true })
  }, [cards, map])
  return null
}

export function MapPage() {
  const [mode, setMode] = useState<'inventario' | 'operativo'>('inventario')
  const [country, setCountry] = useState<LocationCountry | 'all'>('all')
  const [type, setType] = useState<LocationType | 'all'>('all')
  const [selectedId, setSelectedId] = useState('')
  const [selectedOpsId, setSelectedOpsId] = useState('')
  const [fitKey, setFitKey] = useState(0)
  const [riskCards, setRiskCards] = useState<SiteRiskCard[]>([])
  const [riskLoading, setRiskLoading] = useState(false)
  const [riskError, setRiskError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return SITES.filter((site) => {
      if (country !== 'all' && site.country !== country) return false
      if (type !== 'all' && site.type !== type) return false
      return true
    })
  }, [country, type])

  const selected = filtered.find((s) => s.id === selectedId) ?? null
  const selectedOps = riskCards.find((c) => c.id === selectedOpsId) ?? null

  useEffect(() => {
    if (selectedId && !filtered.some((s) => s.id === selectedId)) {
      setSelectedId('')
    }
  }, [filtered, selectedId])

  useEffect(() => {
    if (mode !== 'operativo') return
    let cancelled = false
    setRiskLoading(true)
    setRiskError(null)
    void loadSiteRiskOverlay()
      .then((cards) => {
        if (!cancelled) setRiskCards(cards)
      })
      .catch((err) => {
        if (!cancelled) {
          setRiskError(
            err instanceof Error ? err.message : 'No se pudo cargar overlay',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setRiskLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode])

  const riskCounts = useMemo(() => {
    const counts: Record<SiteRiskLevel, number> = {
      critico: 0,
      atencion: 0,
      ok: 0,
      'sin-dato': 0,
    }
    for (const c of riskCards) counts[c.level] += 1
    return counts
  }, [riskCards])

  function handleCountryChange(value: LocationCountry | 'all') {
    setCountry(value)
    setSelectedId('')
    setFitKey((k) => k + 1)
  }

  function handleTypeChange(value: LocationType | 'all') {
    setType(value)
    setSelectedId('')
    setFitKey((k) => k + 1)
  }

  function switchMode(next: 'inventario' | 'operativo') {
    setMode(next)
    setSelectedId('')
    setSelectedOpsId('')
    setFitKey((k) => k + 1)
  }

  return (
    <div className="map-page">
      <div className="page-header">
        <h1>Mapa</h1>
        <p>
          {mode === 'inventario'
            ? `${SITES.length} ubicaciones públicas de plantas, concreto, centros y oficinas de Cementos Progreso en la región.`
            : 'Vista operativa viva: semáforo por sitio según obligaciones, CAPA, monitoreos, incidentes y metas.'}
        </p>
      </div>

      <div className="map-toolbar content-panel">
        <div className="map-mode-toggle" role="tablist" aria-label="Modo de mapa">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'inventario'}
            className={mode === 'inventario' ? 'is-active' : ''}
            onClick={() => switchMode('inventario')}
          >
            Inventario regional
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'operativo'}
            className={mode === 'operativo' ? 'is-active' : ''}
            onClick={() => switchMode('operativo')}
          >
            <Radio size={14} /> Operativo vivo
          </button>
        </div>

        {mode === 'inventario' ? (
          <div className="map-filters">
            <div className="form-field">
              <label htmlFor="filter-country">País</label>
              <select
                id="filter-country"
                value={country}
                onChange={(e) =>
                  handleCountryChange(e.target.value as LocationCountry | 'all')
                }
              >
                <option value="all">Todos los países</option>
                {LOCATION_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="filter-type">Tipo de instalación</label>
              <select
                id="filter-type"
                value={type}
                onChange={(e) =>
                  handleTypeChange(e.target.value as LocationType | 'all')
                }
              >
                <option value="all">Todos los tipos</option>
                {LOCATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field map-site-field">
              <label htmlFor="filter-site">
                <Search size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
                Buscar ubicación
              </label>
              <select
                id="filter-site"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Selecciona una planta u operación…</option>
                {filtered.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} — {site.region}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="map-filters">
            <div className="form-field map-site-field">
              <label htmlFor="filter-ops">Sitio operativo</label>
              <select
                id="filter-ops"
                value={selectedOpsId}
                onChange={(e) => setSelectedOpsId(e.target.value)}
              >
                <option value="">Todos los sitios operativos…</option>
                {riskCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {RISK_LABELS[c.level]} · {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="map-ops-links">
              <Link to="/cumplimiento">Cumplimiento</Link>
              <Link to="/capa">CAPA</Link>
              <Link to="/umbrales">Umbrales</Link>
              <Link to="/metas">Metas</Link>
            </div>
          </div>
        )}

        <div className="map-legend">
          {mode === 'inventario'
            ? LOCATION_TYPES.map((t) => (
                <span key={t} className="map-legend-item">
                  <i
                    className="map-legend-icon"
                    style={{ background: TYPE_COLORS[t] }}
                    dangerouslySetInnerHTML={{ __html: TYPE_SVGS[t] }}
                  />
                  {t}
                </span>
              ))
            : (Object.keys(RISK_COLORS) as SiteRiskLevel[]).map((level) => (
                <span key={level} className="map-legend-item">
                  <i
                    className="map-legend-icon"
                    style={{ background: RISK_COLORS[level] }}
                  />
                  {RISK_LABELS[level]} ({riskCounts[level]})
                </span>
              ))}
        </div>
      </div>

      <div className="map-layout">
        <div className="map-frame">
          {mode === 'operativo' && riskLoading && (
            <div className="map-overlay-loading">
              <Loader2 className="hc-spin" size={22} />
              Cargando semáforo operativo…
            </div>
          )}
          <MapContainer
            center={mode === 'operativo' ? OPS_CENTER : DEFAULT_CENTER}
            zoom={mode === 'operativo' ? OPS_ZOOM : DEFAULT_ZOOM}
            className="map-container"
            scrollWheelZoom
          >
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            <TileLayer
              attribution=""
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
              opacity={0.9}
            />
            {mode === 'inventario' && !selected && (
              <FitFilteredBounds key={fitKey} sites={filtered} />
            )}
            {mode === 'operativo' && !selectedOps && (
              <FitOpsBounds key={`ops-${fitKey}`} cards={riskCards} />
            )}
            <MapFlyTo
              site={mode === 'inventario' ? selected : null}
              ops={mode === 'operativo' ? selectedOps : null}
            />

            {mode === 'inventario' &&
              filtered.map((site) => {
                const risk = riskForMapSite(site, riskCards)
                return (
                  <Marker
                    key={site.id}
                    position={[site.lat, site.lng]}
                    icon={createTypeIcon(
                      site.type,
                      site.id === selectedId,
                      undefined,
                    )}
                    eventHandlers={{
                      click: () => setSelectedId(site.id),
                    }}
                  >
                    <Popup>
                      <strong>{site.name}</strong>
                      <br />
                      {site.type} · {site.status}
                      <br />
                      {site.address}
                      {risk && (
                        <>
                          <br />
                          Riesgo operativo: {RISK_LABELS[risk.level]}
                        </>
                      )}
                    </Popup>
                  </Marker>
                )
              })}

            {mode === 'operativo' &&
              riskCards.map((card) => (
                <CircleMarker
                  key={card.id}
                  center={[card.lat, card.lng]}
                  radius={card.id === selectedOpsId ? 16 : 12}
                  pathOptions={{
                    color: '#fff',
                    weight: 2,
                    fillColor: RISK_COLORS[card.level],
                    fillOpacity: 0.92,
                  }}
                  eventHandlers={{
                    click: () => setSelectedOpsId(card.id),
                  }}
                >
                  <Popup>
                    <strong>{card.name}</strong>
                    <br />
                    {RISK_LABELS[card.level]}
                    <br />
                    {card.headlines[0]}
                  </Popup>
                </CircleMarker>
              ))}
          </MapContainer>
        </div>

        <aside className="map-details content-panel">
          {mode === 'inventario' ? (
            selected ? (
              <>
                <div className="map-details-header">
                  <MapPin size={20} color="#047935" />
                  <h2>{selected.name}</h2>
                </div>
                <div className="profile-grid">
                  <div className="profile-row">
                    <span>Tipo</span>
                    <span>{selected.type}</span>
                  </div>
                  <div className="profile-row">
                    <span>Estado</span>
                    <span>{selected.status}</span>
                  </div>
                  <div className="profile-row">
                    <span>País</span>
                    <span>{selected.country}</span>
                  </div>
                  <div className="profile-row">
                    <span>Región</span>
                    <span>{selected.region}</span>
                  </div>
                  <div className="profile-row">
                    <span>Dirección</span>
                    <span>{selected.address}</span>
                  </div>
                  {selected.products && (
                    <div className="profile-row">
                      <span>Productos</span>
                      <span>{selected.products}</span>
                    </div>
                  )}
                  <div className="profile-row">
                    <span>Coordenadas</span>
                    <span>
                      {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
                      <br />
                      <small>({selected.coordinatesPrecision})</small>
                    </span>
                  </div>
                  {selected.notes && (
                    <div className="profile-row">
                      <span>Notas</span>
                      <span>{selected.notes}</span>
                    </div>
                  )}
                  <div className="profile-row">
                    <span>Fuente</span>
                    <span>{selected.source}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ marginTop: 16, width: '100%' }}
                  onClick={() => {
                    setSelectedId('')
                    setFitKey((k) => k + 1)
                  }}
                >
                  Ver todas las filtradas
                </button>
              </>
            ) : (
              <>
                <h2>Ubicaciones ({filtered.length})</h2>
                <p style={{ marginBottom: 16 }}>
                  Usa los dropdowns o haz clic en un marcador para centrar el mapa
                  y ver el detalle.
                </p>
                <ul className="map-site-list">
                  {filtered.map((site) => (
                    <li key={site.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(site.id)}
                      >
                        <i
                          className="map-list-icon"
                          style={{ background: TYPE_COLORS[site.type] }}
                          dangerouslySetInnerHTML={{
                            __html: TYPE_SVGS[site.type],
                          }}
                        />
                        <span>
                          <strong>{site.name}</strong>
                          <small>
                            {site.country} · {site.type}
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : riskError ? (
            <div className="hc-banner hc-banner-error" role="alert">
              {riskError}
            </div>
          ) : selectedOps ? (
            <>
              <div className="map-details-header">
                <MapPin size={20} color={RISK_COLORS[selectedOps.level]} />
                <h2>{selectedOps.name}</h2>
              </div>
              <div className="profile-grid">
                <div className="profile-row">
                  <span>Semáforo</span>
                  <span
                    className="fase1-pill"
                    style={{
                      background: `${RISK_COLORS[selectedOps.level]}22`,
                      color: RISK_COLORS[selectedOps.level],
                    }}
                  >
                    {RISK_LABELS[selectedOps.level]}
                  </span>
                </div>
                <div className="profile-row">
                  <span>Región</span>
                  <span>
                    {selectedOps.region} · {selectedOps.country}
                  </span>
                </div>
                <div className="profile-row">
                  <span>Señales</span>
                  <span>
                    <ul className="map-ops-signals">
                      {selectedOps.headlines.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </span>
                </div>
                <div className="profile-row">
                  <span>Detalle</span>
                  <span className="map-ops-detail">
                    Obl. críticas: {selectedOps.signals.obligacionesCriticas}
                    <br />
                    CAPA vencidas: {selectedOps.signals.capaVencidas}
                    <br />
                    Excedencias: {selectedOps.signals.excedenciasMonitoreo}
                    <br />
                    Incidentes abiertos:{' '}
                    {selectedOps.signals.incidentesAbiertos}
                    <br />
                    Metas en riesgo: {selectedOps.signals.metasEnRiesgo}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: 16, width: '100%' }}
                onClick={() => {
                  setSelectedOpsId('')
                  setFitKey((k) => k + 1)
                }}
              >
                Ver todos los sitios
              </button>
            </>
          ) : (
            <>
              <h2>Semáforo operativo ({riskCards.length})</h2>
              <p style={{ marginBottom: 16 }}>
                Agrega señales de cumplimiento, CAPA, umbrales, incidentes y
                metas por sitio Agro / Alicón.
              </p>
              <ul className="map-site-list">
                {riskCards.map((card) => (
                  <li key={card.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedOpsId(card.id)}
                    >
                      <i
                        className="map-list-icon"
                        style={{ background: RISK_COLORS[card.level] }}
                      />
                      <span>
                        <strong>{card.name}</strong>
                        <small>
                          {RISK_LABELS[card.level]} · {card.headlines[0]}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
