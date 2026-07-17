import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  Leaf,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { CompromisosSubnav } from '../components/CompromisosSubnav'
import {
  COMPROMISO_ESTADOS,
  COMPROMISO_SITIOS,
  COMPROMISO_UNIDADES,
  formatIsoDate,
  formatNum,
  riskForCompromiso,
  type CompromisoRecord,
  type CompromisoRisk,
} from '../data/compromisosAmbientales'
import {
  countEvidenciasByCompromiso,
  deleteCompromiso,
  loadCompromisos,
} from '../lib/compromisosAmbientalesApi'

const FILTER_ALL = 'all'

const RISK_BADGE: Record<CompromisoRisk, string> = {
  vencido: 'fase1-pill fase1-pill--danger',
  critico: 'fase1-pill fase1-pill--danger',
  atencion: 'fase1-pill fase1-pill--warn',
  ok: 'fase1-pill fase1-pill--ok',
  cerrado: 'fase1-pill fase1-pill--muted',
  suspendido: 'fase1-pill fase1-pill--muted',
}

const RISK_LABEL: Record<CompromisoRisk, string> = {
  vencido: 'Vencido',
  critico: 'Crítico',
  atencion: 'Atención',
  ok: 'OK',
  cerrado: 'Cerrado',
  suspendido: 'Suspendido',
}

const ESTADO_PILL: Record<string, string> = {
  Pendiente: 'fase1-pill fase1-pill--info',
  'En proceso': 'fase1-pill fase1-pill--warn',
  Cumplido: 'fase1-pill fase1-pill--ok',
  Vencido: 'fase1-pill fase1-pill--danger',
  Suspendido: 'fase1-pill fase1-pill--muted',
  Cancelado: 'fase1-pill fase1-pill--muted',
}

export function CompromisosListaPage() {
  const [records, setRecords] = useState<CompromisoRecord[]>([])
  const [evidenciaCounts, setEvidenciaCounts] = useState<Record<string, number>>(
    {},
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [filterUnidad, setFilterUnidad] = useState(FILTER_ALL)
  const [filterSitio, setFilterSitio] = useState(FILTER_ALL)
  const [filterEstado, setFilterEstado] = useState(FILTER_ALL)
  const [filterResponsable, setFilterResponsable] = useState(FILTER_ALL)
  const [filterRisk, setFilterRisk] = useState(FILTER_ALL)
  const [filterOrigen, setFilterOrigen] = useState(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [data, counts] = await Promise.all([
        loadCompromisos(),
        countEvidenciasByCompromiso(),
      ])
      setRecords(data)
      setEvidenciaCounts(counts)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar compromisos',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    if (!okMsg) return
    const t = window.setTimeout(() => setOkMsg(null), 4000)
    return () => window.clearTimeout(t)
  }, [okMsg])

  const responsables = useMemo(() => {
    const set = new Set<string>()
    for (const r of records) {
      if (r.responsablePrincipal.trim()) set.add(r.responsablePrincipal.trim())
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'es'))
  }, [records])

  const origenes = useMemo(() => {
    const set = new Set(records.map((r) => r.origen).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b, 'es'))
  }, [records])

  const enriched = useMemo(
    () =>
      records.map((r) => ({
        ...r,
        risk: riskForCompromiso(r),
        evidencias: evidenciaCounts[r.id] ?? 0,
      })),
    [records, evidenciaCounts],
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return enriched.filter((r) => {
      if (filterUnidad !== FILTER_ALL && r.unidadNegocio !== filterUnidad)
        return false
      if (filterSitio !== FILTER_ALL && r.sitio !== filterSitio) return false
      if (filterEstado !== FILTER_ALL && r.estado !== filterEstado) return false
      if (
        filterResponsable !== FILTER_ALL &&
        r.responsablePrincipal !== filterResponsable
      )
        return false
      if (filterRisk !== FILTER_ALL && r.risk !== filterRisk) return false
      if (filterOrigen !== FILTER_ALL && r.origen !== filterOrigen) return false
      if (!needle) return true
      const hay = [
        r.codigo,
        r.titulo,
        r.descripcion,
        r.sitio,
        r.origen,
        r.origenRef,
        r.responsablePrincipal,
        r.tipo,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [
    enriched,
    q,
    filterUnidad,
    filterSitio,
    filterEstado,
    filterResponsable,
    filterRisk,
    filterOrigen,
  ])

  const kpis = useMemo(() => {
    const total = enriched.length
    const vencidos = enriched.filter((r) => r.risk === 'vencido').length
    const enProceso = enriched.filter((r) =>
      /en proceso/i.test(r.estado),
    ).length
    const cumplidos = enriched.filter((r) => /cumplid/i.test(r.estado)).length
    const sinEvidencia = enriched.filter(
      (r) => r.evidencias === 0 && !/cumplid|cancelad/i.test(r.estado),
    ).length
    const avanceProm =
      total === 0
        ? 0
        : enriched.reduce((s, r) => s + r.porcentajeAvance, 0) / total
    return { total, vencidos, enProceso, cumplidos, sinEvidencia, avanceProm }
  }, [enriched])

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este compromiso y toda su evidencia/seguimiento?'))
      return
    try {
      await deleteCompromiso(id)
      setOkMsg('Compromiso eliminado')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando compromisos…</p>
      </div>
    )
  }

  return (
    <div className="carbon-page fase1-page compromisos-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Leaf size={14} />
            Ambiente · Cementos Progreso
          </p>
          <h1>Lista de compromisos</h1>
          <p>
            Registro maestro de obligaciones ambientales operativas ·{' '}
            {formatNum(kpis.total)} compromiso(s)
          </p>
        </div>
        <div className="hc-header-actions">
          <Link to="/compromisos-ambientales/crear" className="btn-primary">
            <FilePlus2 size={16} /> Nuevo compromiso
          </Link>
        </div>
      </div>

      <CompromisosSubnav />

      {error && (
        <div className="hc-banner hc-banner-error" role="alert">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {okMsg && (
        <div className="hc-banner hc-banner-ok" role="status">
          <CheckCircle2 size={16} /> {okMsg}
        </div>
      )}

      <div className="carbon-kpi-grid">
        <div className="carbon-kpi">
          <span>Total</span>
          <strong>{formatNum(kpis.total)}</strong>
          <small>Registrados</small>
        </div>
        <div className="carbon-kpi warn">
          <span>Vencidos</span>
          <strong>{formatNum(kpis.vencidos)}</strong>
          <small>Requieren atención</small>
        </div>
        <div className="carbon-kpi">
          <span>En proceso</span>
          <strong>{formatNum(kpis.enProceso)}</strong>
          <small>Activos</small>
        </div>
        <div className="carbon-kpi lime">
          <span>Cumplidos</span>
          <strong>{formatNum(kpis.cumplidos)}</strong>
          <small>Cerrados</small>
        </div>
        <div className="carbon-kpi dark">
          <span>Sin evidencia</span>
          <strong>{formatNum(kpis.sinEvidencia)}</strong>
          <small>Abiertos</small>
        </div>
        <div className="carbon-kpi">
          <span>Avance medio</span>
          <strong>{formatNum(kpis.avanceProm, 0)}%</strong>
          <small>Portfolio</small>
        </div>
      </div>

      <section className="carbon-section fase1-table-section">
        <div className="fase1-section-head">
          <div>
            <h2>Compromisos</h2>
            <p className="fase1-section-sub">
              Filtre por sitio, licencia/origen, responsable o vencidos
            </p>
          </div>
        </div>

        <div className="fase1-filters compromisos-filters">
          <input
            type="search"
            placeholder="Buscar código, título, origen…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            value={filterUnidad}
            onChange={(e) => setFilterUnidad(e.target.value)}
          >
            <option value={FILTER_ALL}>Todas las unidades</option>
            {COMPROMISO_UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <select
            value={filterSitio}
            onChange={(e) => setFilterSitio(e.target.value)}
          >
            <option value={FILTER_ALL}>Todos los sitios</option>
            {COMPROMISO_SITIOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value={FILTER_ALL}>Todos los estados</option>
            {COMPROMISO_ESTADOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filterResponsable}
            onChange={(e) => setFilterResponsable(e.target.value)}
          >
            <option value={FILTER_ALL}>Todos los responsables</option>
            {responsables.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={filterOrigen}
            onChange={(e) => setFilterOrigen(e.target.value)}
          >
            <option value={FILTER_ALL}>Todos los orígenes</option>
            {origenes.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
          >
            <option value={FILTER_ALL}>Todo riesgo</option>
            <option value="vencido">Vencidos</option>
            <option value="critico">Críticos</option>
            <option value="atencion">Atención</option>
            <option value="ok">OK</option>
            <option value="cerrado">Cerrados</option>
          </select>
        </div>

        <div className="fase1-table-wrap">
          <table className="fase1-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Compromiso</th>
                <th>Sitio / área</th>
                <th>Origen</th>
                <th>Tipo</th>
                <th>Responsable</th>
                <th>Vence</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Avance</th>
                <th>Evidencias</th>
                <th>Riesgo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="fase1-empty">
                    No hay compromisos con estos filtros.{' '}
                    <Link to="/compromisos-ambientales/crear">
                      Crear el primero
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.codigo || '—'}</strong>
                    </td>
                    <td>
                      <div className="compromisos-title-cell">
                        <strong>{r.titulo}</strong>
                        {r.descripcion ? (
                          <span>{r.descripcion.slice(0, 80)}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {r.sitio || '—'}
                      {r.areaOperativa ? (
                        <div className="compromisos-muted">{r.areaOperativa}</div>
                      ) : null}
                    </td>
                    <td>
                      {r.origen}
                      {r.origenRef ? (
                        <div className="compromisos-muted">{r.origenRef}</div>
                      ) : null}
                    </td>
                    <td>{r.tipo}</td>
                    <td>{r.responsablePrincipal || '—'}</td>
                    <td>{formatIsoDate(r.fechaVencimiento)}</td>
                    <td>
                      <span
                        className={
                          ESTADO_PILL[r.estado] ?? 'fase1-pill fase1-pill--info'
                        }
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td>
                      {r.prioridad}
                      {r.criticidad !== r.prioridad ? (
                        <div className="compromisos-muted">
                          Crit. {r.criticidad}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className="compromisos-avance">
                        <div
                          className="compromisos-avance-bar"
                          style={{
                            width: `${Math.min(100, r.porcentajeAvance)}%`,
                          }}
                        />
                        <span>{formatNum(r.porcentajeAvance, 0)}%</span>
                      </div>
                    </td>
                    <td>
                      {r.evidencias > 0 ? (
                        <Link
                          to={`/compromisos-ambientales/evidencias?c=${r.id}`}
                          className="fase1-pill fase1-pill--ok"
                        >
                          {r.evidencias}
                        </Link>
                      ) : (
                        <span className="fase1-pill fase1-pill--danger">
                          Sin
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={RISK_BADGE[r.risk]}>
                        {RISK_LABEL[r.risk]}
                      </span>
                    </td>
                    <td className="fase1-row-actions">
                      <Link
                        to={`/compromisos-ambientales/editar/${r.id}`}
                        className="btn-icon"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        type="button"
                        className="btn-icon danger"
                        title="Eliminar"
                        onClick={() => void handleDelete(r.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
