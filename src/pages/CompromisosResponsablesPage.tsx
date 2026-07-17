import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Leaf,
  Loader2,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { CompromisosSubnav } from '../components/CompromisosSubnav'
import {
  daysUntil,
  formatIsoDate,
  formatNum,
  riskForCompromiso,
  type AsignacionRecord,
  type CompromisoRecord,
} from '../data/compromisosAmbientales'
import {
  loadAsignaciones,
  loadCompromisos,
} from '../lib/compromisosAmbientalesApi'

type PersonLoad = {
  persona: string
  roles: Set<string>
  compromisos: CompromisoRecord[]
  pendientes: number
  vencidos: number
  proximos: number
  cumplidos: number
  avanceProm: number
}

export function CompromisosResponsablesPage() {
  const [compromisos, setCompromisos] = useState<CompromisoRecord[]>([])
  const [asignaciones, setAsignaciones] = useState<AsignacionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      setLoading(true)
      setError(null)
      try {
        const [comps, asigs] = await Promise.all([
          loadCompromisos(),
          loadAsignaciones(),
        ])
        if (!cancelled) {
          setCompromisos(comps)
          setAsignaciones(asigs)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar responsables',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  const byId = useMemo(
    () => new Map(compromisos.map((c) => [c.id, c])),
    [compromisos],
  )

  const people = useMemo(() => {
    const map = new Map<string, PersonLoad>()

    const ensure = (persona: string) => {
      const key = persona.trim()
      if (!key) return null
      let row = map.get(key)
      if (!row) {
        row = {
          persona: key,
          roles: new Set(),
          compromisos: [],
          pendientes: 0,
          vencidos: 0,
          proximos: 0,
          cumplidos: 0,
          avanceProm: 0,
        }
        map.set(key, row)
      }
      return row
    }

    const attach = (persona: string, rol: string, c: CompromisoRecord) => {
      const row = ensure(persona)
      if (!row) return
      row.roles.add(rol)
      if (!row.compromisos.some((x) => x.id === c.id)) {
        row.compromisos.push(c)
      }
    }

    for (const a of asignaciones) {
      const c = byId.get(a.compromisoId)
      if (!c) continue
      attach(a.persona, a.rol, c)
    }

    // Fallback from master fields if asignaciones empty/outdated
    for (const c of compromisos) {
      attach(c.responsablePrincipal, 'Propietario', c)
      attach(c.revisor, 'Revisor', c)
      attach(c.aprobador, 'Aprobador', c)
      for (const col of c.colaboradores.split(/[,;]/).map((s) => s.trim())) {
        attach(col, 'Colaborador', c)
      }
    }

    for (const row of map.values()) {
      let avanceSum = 0
      for (const c of row.compromisos) {
        avanceSum += c.porcentajeAvance
        if (/cumplid/i.test(c.estado)) row.cumplidos += 1
        else if (/pendiente/i.test(c.estado)) row.pendientes += 1
        const risk = riskForCompromiso(c)
        if (risk === 'vencido') row.vencidos += 1
        const days = daysUntil(c.fechaVencimiento)
        if (
          days != null &&
          days >= 0 &&
          days <= (c.alertaDias || 15) &&
          !/cumplid|cancelad/i.test(c.estado)
        ) {
          row.proximos += 1
        }
      }
      row.avanceProm =
        row.compromisos.length === 0
          ? 0
          : avanceSum / row.compromisos.length
    }

    return [...map.values()].sort(
      (a, b) => b.compromisos.length - a.compromisos.length,
    )
  }, [asignaciones, compromisos, byId])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return people
    return people.filter(
      (p) =>
        p.persona.toLowerCase().includes(needle) ||
        [...p.roles].some((r) => r.toLowerCase().includes(needle)),
    )
  }, [people, q])

  const selectedPerson = selected
    ? (people.find((p) => p.persona === selected) ?? null)
    : null

  const kpis = useMemo(() => {
    const sinResponsable = compromisos.filter(
      (c) => !c.responsablePrincipal.trim(),
    ).length
    const sobrecarga = people.filter((p) => {
      const abiertos = p.compromisos.filter(
        (c) => !/cumplid|cancelad/i.test(c.estado),
      ).length
      return abiertos >= 5
    }).length
    return {
      personas: people.length,
      sinResponsable,
      sobrecarga,
      asignaciones: asignaciones.length,
    }
  }, [people, compromisos, asignaciones])

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando responsables…</p>
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
          <h1>Responsables</h1>
          <p>
            Asignación y carga de trabajo ambiental · propietario, ejecutor,
            revisor y aprobador
          </p>
        </div>
      </div>

      <CompromisosSubnav />

      {error && (
        <div className="hc-banner hc-banner-error" role="alert">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="carbon-kpi-grid">
        <div className="carbon-kpi">
          <span>Personas</span>
          <strong>{formatNum(kpis.personas)}</strong>
          <small>Con al menos un rol</small>
        </div>
        <div className="carbon-kpi warn">
          <span>Sin propietario</span>
          <strong>{formatNum(kpis.sinResponsable)}</strong>
          <small>Compromisos huérfanos</small>
        </div>
        <div className="carbon-kpi dark">
          <span>Alta carga</span>
          <strong>{formatNum(kpis.sobrecarga)}</strong>
          <small>≥ 5 abiertos</small>
        </div>
        <div className="carbon-kpi lime">
          <span>Asignaciones</span>
          <strong>{formatNum(kpis.asignaciones)}</strong>
          <small>Roles registrados</small>
        </div>
      </div>

      <div className="compromisos-resp-layout">
        <section className="carbon-section">
          <div className="fase1-section-head">
            <div>
              <h2>Carga por persona</h2>
              <p className="fase1-section-sub">
                Pendientes, vencidos y próximos a vencer
              </p>
            </div>
          </div>
          <div className="fase1-filters">
            <input
              type="search"
              placeholder="Buscar persona o rol…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="fase1-table-wrap">
            <table className="fase1-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Roles</th>
                  <th>Compromisos</th>
                  <th>Pendientes</th>
                  <th>Vencidos</th>
                  <th>Próx. vencer</th>
                  <th>Cumplidos</th>
                  <th>Avance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="fase1-empty">
                      <Users size={16} /> No hay responsables asignados.{' '}
                      <Link to="/compromisos-ambientales/crear">
                        Crear compromiso
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr
                      key={p.persona}
                      className={
                        selected === p.persona
                          ? 'compromisos-row-selected'
                          : undefined
                      }
                      onClick={() => setSelected(p.persona)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong>{p.persona}</strong>
                      </td>
                      <td>
                        <div className="compromisos-role-chips">
                          {[...p.roles].map((r) => (
                            <span key={r} className="fase1-pill fase1-pill--info">
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{formatNum(p.compromisos.length)}</td>
                      <td>{formatNum(p.pendientes)}</td>
                      <td>
                        <span
                          className={
                            p.vencidos > 0
                              ? 'fase1-pill fase1-pill--danger'
                              : undefined
                          }
                        >
                          {formatNum(p.vencidos)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            p.proximos > 0
                              ? 'fase1-pill fase1-pill--warn'
                              : undefined
                          }
                        >
                          {formatNum(p.proximos)}
                        </span>
                      </td>
                      <td>{formatNum(p.cumplidos)}</td>
                      <td>{formatNum(p.avanceProm, 0)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="carbon-section">
          <h2>
            {selectedPerson
              ? `Detalle · ${selectedPerson.persona}`
              : 'Detalle de persona'}
          </h2>
          {!selectedPerson ? (
            <p className="compromisos-muted">
              Seleccione una persona en la tabla para ver sus compromisos y roles.
            </p>
          ) : (
            <div className="fase1-table-wrap">
              <table className="fase1-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Compromiso</th>
                    <th>Sitio</th>
                    <th>Estado</th>
                    <th>Vence</th>
                    <th>Avance</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {selectedPerson.compromisos.map((c) => (
                    <tr key={c.id}>
                      <td>{c.codigo || '—'}</td>
                      <td>{c.titulo}</td>
                      <td>{c.sitio || '—'}</td>
                      <td>{c.estado}</td>
                      <td>{formatIsoDate(c.fechaVencimiento)}</td>
                      <td>{formatNum(c.porcentajeAvance, 0)}%</td>
                      <td>
                        <Link
                          to={`/compromisos-ambientales/editar/${c.id}`}
                          className="btn-secondary-link"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
