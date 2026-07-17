import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import {
  CAPA_EFICACIAS,
  CAPA_ESTADOS,
  CAPA_ORIGENES,
  CAPA_PRIORIDADES,
  CAPA_SITIOS,
  CAPA_TIPOS,
  CAPA_UNIDADES,
  emptyCapaForm,
  formFromRecord,
  formatIsoDate,
  formatNum,
  nextCodigo,
  type CapaForm,
  type CapaRecord,
} from '../data/capa'
import { buildCapaReport, type CapaReport } from '../data/capaReport'
import { deleteCapa, loadCapas, upsertCapa } from '../lib/capaApi'
import { downloadCsv, stampFilename } from '../lib/exportDownload'
import { runExportPack } from '../lib/exportPacks'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const RISK_BADGE: Record<string, string> = {
  vencida: 'fase1-pill fase1-pill--danger',
  critica: 'fase1-pill fase1-pill--danger',
  atencion: 'fase1-pill fase1-pill--warn',
  ok: 'fase1-pill fase1-pill--ok',
  cerrada: 'fase1-pill fase1-pill--muted',
}

const RISK_LABEL: Record<string, string> = {
  vencida: 'Vencida',
  critica: 'Crítica',
  atencion: 'Atención',
  ok: 'OK',
  cerrada: 'Cerrada',
}

const ESTADO_PILL: Record<string, string> = {
  Abierta: 'fase1-pill fase1-pill--info',
  'En progreso': 'fase1-pill fase1-pill--warn',
  'Pendiente verificación': 'fase1-pill fase1-pill--danger',
  Cerrada: 'fase1-pill fase1-pill--ok',
  Cancelada: 'fase1-pill fase1-pill--muted',
}

const COLORS = ['#047935', '#c45c26', '#3b82f6', '#94a3b8', '#5ab64b', '#8b7355']

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

const FILTER_ALL = 'all'

export function CapaPage() {
  const [records, setRecords] = useState<CapaRecord[]>([])
  const [report, setReport] = useState<CapaReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [form, setForm] = useState<CapaForm>(() => emptyCapaForm())
  const [showForm, setShowForm] = useState(false)

  const [filterUnidad, setFilterUnidad] = useState(FILTER_ALL)
  const [filterEstado, setFilterEstado] = useState(FILTER_ALL)
  const [filterRisk, setFilterRisk] = useState(FILTER_ALL)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const data = await loadCapas()
      setRecords(data)
      setReport(buildCapaReport(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar CAPA')
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

  useEffect(() => {
    if (!showForm) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setShowForm(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [showForm])

  const filtered = useMemo(() => {
    if (!report) return []
    return report.detailRows.filter((r) => {
      if (filterUnidad !== FILTER_ALL && r.unidadNegocio !== filterUnidad)
        return false
      if (filterEstado !== FILTER_ALL && r.estado !== filterEstado) return false
      if (filterRisk !== FILTER_ALL && r.risk !== filterRisk) return false
      return true
    })
  }, [report, filterUnidad, filterEstado, filterRisk])

  function openNew() {
    const code = nextCodigo(
      'CAPA',
      records.map((r) => r.codigo).filter(Boolean),
    )
    setForm(emptyCapaForm({ codigo: code }))
    setShowForm(true)
  }

  function openEdit(row: CapaRecord) {
    setForm(formFromRecord(row))
    setShowForm(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const next = { ...form }
      if (/cerrad/i.test(next.estado) && !next.fechaCierre) {
        next.fechaCierre = new Date().toISOString().slice(0, 10)
      }
      await upsertCapa(next)
      setOkMsg(form.id ? 'CAPA actualizada' : 'CAPA creada')
      setShowForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta acción CAPA?')) return
    try {
      await deleteCapa(id)
      setOkMsg('CAPA eliminada')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  function exportCsvLocal() {
    if (!report) return
    downloadCsv(
      stampFilename('capa_filtrado', 'csv'),
      [
        'Código',
        'Unidad',
        'Sitio',
        'Tipo',
        'Origen',
        'Hallazgo',
        'Acción',
        'Responsable',
        'Estado',
        'Compromiso',
        'Riesgo',
      ],
      filtered.map((r) => [
        r.codigo,
        r.unidadNegocio,
        r.sitio,
        r.tipoAccion,
        r.origenTipo,
        r.hallazgo,
        r.accion,
        r.responsable,
        r.estado,
        r.fechaCompromiso,
        r.risk,
      ]),
    )
  }

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando CAPA…</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="carbon-page">
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error ?? 'Sin datos'}
        </div>
      </div>
    )
  }

  return (
    <div className="carbon-page fase1-page capa-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <ClipboardCheck size={14} />
            Fase 1 · Hallazgos y planes de acción
          </p>
          <h1>CAPA ambiental</h1>
          <p>
            Ciclo hallazgo → acción → verificación → cierre ·{' '}
            {formatNum(report.meta.total)} registro(s)
            {report.meta.pctCierre != null
              ? ` · cierre ${formatNum(report.meta.pctCierre, 1)}%`
              : ''}
          </p>
        </div>
        <div className="hc-header-actions">
          <button type="button" className="btn-primary" onClick={openNew}>
            <Plus size={16} /> Nueva CAPA
          </button>
          <button
            type="button"
            className="btn-secondary-link"
            onClick={() => void runExportPack('capa', 'pdf')}
          >
            <Download size={16} /> PDF
          </button>
          <Link to="/cumplimiento" className="btn-secondary-link">
            Cumplimiento →
          </Link>
          <Link to="/exportes" className="btn-secondary-link">
            Exportes →
          </Link>
        </div>
      </div>

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
        {report.kpis.map((k) => (
          <div
            key={k.id}
            className={`carbon-kpi ${k.tone === 'warn' ? 'warn' : k.tone === 'ok' ? 'lime' : k.tone === 'dark' ? 'dark' : ''}`}
          >
            <span>{k.label}</span>
            <strong>{k.value}</strong>
            <small>{k.hint}</small>
          </div>
        ))}
      </div>

      {report.insights.length > 0 && (
        <section className="carbon-section">
          <h2>Alertas</h2>
          <div className="carbon-alerts">
            {report.insights.map((ins) => (
              <article
                key={ins.id}
                className={`carbon-alert ${ALERT_CLASS[ins.level]}`}
              >
                <strong>{ins.title}</strong>
                <p>{ins.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="carbon-charts-grid">
        <section className="carbon-section">
          <h2>Por estado</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={report.byEstado}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {report.byEstado.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="carbon-section">
          <h2>Antigüedad (abiertas)</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={report.aging}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="CAPA" fill="#047935" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="carbon-section">
          <h2>Por origen</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={report.byOrigen}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Cantidad" fill="#5ab64b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="carbon-section">
          <h2>Por unidad</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={report.byUnidad}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="abiertas" name="Abiertas" fill="#c45c26" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vencidas" name="Vencidas" fill="#8b1e1e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {showForm && (
        <div
          className="fase1-modal-backdrop"
          role="presentation"
          onClick={() => setShowForm(false)}
        >
          <div
            className="fase1-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="capa-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fase1-modal-head">
              <h2 id="capa-modal-title">
                {form.id ? 'Editar CAPA' : 'Nueva CAPA'}
              </h2>
              <button
                type="button"
                className="fase1-modal-close"
                aria-label="Cerrar"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>
            <form className="fase1-form" onSubmit={handleSave}>
              <label>
                Código
                <input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                />
              </label>
              <label>
                Tipo de acción
                <select
                  value={form.tipoAccion}
                  onChange={(e) =>
                    setForm({ ...form, tipoAccion: e.target.value })
                  }
                >
                  {CAPA_TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Unidad
                <select
                  value={form.unidadNegocio}
                  onChange={(e) =>
                    setForm({ ...form, unidadNegocio: e.target.value })
                  }
                >
                  {CAPA_UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sitio
                <input
                  list="capa-sitios"
                  value={form.sitio}
                  onChange={(e) => setForm({ ...form, sitio: e.target.value })}
                />
                <datalist id="capa-sitios">
                  {CAPA_SITIOS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label>
                Origen
                <select
                  value={form.origenTipo}
                  onChange={(e) =>
                    setForm({ ...form, origenTipo: e.target.value })
                  }
                >
                  {CAPA_ORIGENES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ref. origen
                <input
                  placeholder="ID inspección / incidente…"
                  value={form.origenRef}
                  onChange={(e) =>
                    setForm({ ...form, origenRef: e.target.value })
                  }
                />
              </label>
              <label>
                Prioridad
                <select
                  value={form.prioridad}
                  onChange={(e) =>
                    setForm({ ...form, prioridad: e.target.value })
                  }
                >
                  {CAPA_PRIORIDADES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Estado
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  {CAPA_ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Responsable
                <input
                  value={form.responsable}
                  onChange={(e) =>
                    setForm({ ...form, responsable: e.target.value })
                  }
                />
              </label>
              <label>
                Verificador
                <input
                  value={form.verificador}
                  onChange={(e) =>
                    setForm({ ...form, verificador: e.target.value })
                  }
                />
              </label>
              <label>
                Apertura
                <input
                  type="date"
                  required
                  value={form.fechaApertura}
                  onChange={(e) =>
                    setForm({ ...form, fechaApertura: e.target.value })
                  }
                />
              </label>
              <label>
                Compromiso
                <input
                  type="date"
                  value={form.fechaCompromiso}
                  onChange={(e) =>
                    setForm({ ...form, fechaCompromiso: e.target.value })
                  }
                />
              </label>
              <label>
                Cierre
                <input
                  type="date"
                  value={form.fechaCierre}
                  onChange={(e) =>
                    setForm({ ...form, fechaCierre: e.target.value })
                  }
                />
              </label>
              <label>
                Eficacia
                <select
                  value={form.eficacia}
                  onChange={(e) =>
                    setForm({ ...form, eficacia: e.target.value })
                  }
                >
                  {CAPA_EFICACIAS.map((eff) => (
                    <option key={eff || 'empty'} value={eff}>
                      {eff || '—'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fase1-span-2">
                Hallazgo *
                <textarea
                  required
                  rows={2}
                  autoFocus
                  value={form.hallazgo}
                  onChange={(e) =>
                    setForm({ ...form, hallazgo: e.target.value })
                  }
                />
              </label>
              <label className="fase1-span-2">
                Causa raíz
                <textarea
                  rows={2}
                  value={form.causaRaiz}
                  onChange={(e) =>
                    setForm({ ...form, causaRaiz: e.target.value })
                  }
                />
              </label>
              <label className="fase1-span-2">
                Acción *
                <textarea
                  required
                  rows={2}
                  value={form.accion}
                  onChange={(e) => setForm({ ...form, accion: e.target.value })}
                />
              </label>
              <label className="fase1-span-2">
                Verificación
                <textarea
                  rows={2}
                  value={form.verificacion}
                  onChange={(e) =>
                    setForm({ ...form, verificacion: e.target.value })
                  }
                />
              </label>
              <label>
                URL evidencia
                <input
                  value={form.evidenciaUrl}
                  onChange={(e) =>
                    setForm({ ...form, evidenciaUrl: e.target.value })
                  }
                />
              </label>
              <label>
                Nota evidencia
                <input
                  value={form.evidenciaNota}
                  onChange={(e) =>
                    setForm({ ...form, evidenciaNota: e.target.value })
                  }
                />
              </label>
              <label className="fase1-span-2">
                Notas
                <textarea
                  rows={2}
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
              </label>
              <div className="fase1-form-actions fase1-span-2">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="hc-spin" size={16} /> : null}
                  Guardar
                </button>
                <button
                  type="button"
                  className="btn-secondary-link"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="carbon-section fase1-table-section">
        <div className="fase1-section-head">
          <div>
            <h2>Registro CAPA</h2>
            <p className="fase1-section-sub">
              {formatNum(filtered.length)} de {formatNum(report.meta.total)}{' '}
              registro(s)
            </p>
          </div>
          <div className="fase1-filters">
            <select
              value={filterUnidad}
              onChange={(e) => setFilterUnidad(e.target.value)}
            >
              <option value={FILTER_ALL}>Todas las unidades</option>
              {CAPA_UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value={FILTER_ALL}>Todos los estados</option>
              {CAPA_ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
            >
              <option value={FILTER_ALL}>Todo riesgo</option>
              <option value="vencida">Vencida</option>
              <option value="critica">Crítica (≤7d)</option>
              <option value="atencion">Atención</option>
              <option value="ok">OK</option>
              <option value="cerrada">Cerrada</option>
            </select>
            <button
              type="button"
              className="btn-secondary-link"
              onClick={exportCsvLocal}
            >
              <Download size={14} /> CSV
            </button>
            <button type="button" className="btn-primary" onClick={openNew}>
              <Plus size={14} /> Nueva CAPA
            </button>
          </div>
        </div>

        <div className="carbon-table-wrap fase1-table-wrap">
          <table className="carbon-table fase1-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Hallazgo / Acción</th>
                <th>Origen</th>
                <th>Responsable</th>
                <th>Compromiso</th>
                <th>Estado</th>
                <th>Riesgo</th>
                <th className="fase1-th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className={`fase1-row risk-${r.risk}`}>
                  <td className="fase1-td-code">
                    <code>{r.codigo || '—'}</code>
                    <span className="fase1-meta">{r.tipoAccion}</span>
                  </td>
                  <td className="fase1-td-main">
                    <strong>{r.hallazgo}</strong>
                    <span className="fase1-meta">Acción: {r.accion}</span>
                  </td>
                  <td className="fase1-td-loc">
                    <span>{r.origenTipo}</span>
                    <span className="fase1-meta">
                      {r.unidadNegocio} · {r.sitio || '—'}
                    </span>
                  </td>
                  <td>{r.responsable || '—'}</td>
                  <td className="fase1-td-date">
                    <span>{formatIsoDate(r.fechaCompromiso)}</span>
                    {r.days != null && !/cerrad|cancelad/i.test(r.estado) ? (
                      <span
                        className={`fase1-meta ${r.days < 0 ? 'is-late' : ''}`}
                      >
                        {r.days < 0
                          ? `${Math.abs(r.days)}d vencido`
                          : `${r.days}d restantes`}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <span
                      className={
                        ESTADO_PILL[r.estado] || 'fase1-pill fase1-pill--muted'
                      }
                    >
                      {r.estado}
                    </span>
                  </td>
                  <td>
                    <span className={RISK_BADGE[r.risk] || 'fase1-pill'}>
                      {RISK_LABEL[r.risk] || r.risk}
                    </span>
                  </td>
                  <td className="fase1-row-actions">
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      title="Eliminar"
                      onClick={() => void handleDelete(r.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="fase1-empty">
                    Sin CAPA con estos filtros.{' '}
                    <button
                      type="button"
                      className="fase1-inline-link"
                      onClick={openNew}
                    >
                      Nueva CAPA
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
