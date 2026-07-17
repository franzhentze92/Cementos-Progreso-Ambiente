import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
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
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { buildCarbonReport } from '../data/carbonReport'
import {
  ESCENARIO_ESTADOS,
  emptyEscenarioForm,
  formFromRecord,
  formatNum,
  nextCodigo,
  type EscenarioForm,
  type EscenarioRecord,
} from '../data/intensidad'
import {
  buildIntensidadReport,
  type IntensidadReport,
} from '../data/intensidadReport'
import { loadCarbonCampaign } from '../lib/carbonApi'
import { downloadCsv, stampFilename } from '../lib/exportDownload'
import { runExportPack } from '../lib/exportPacks'
import {
  deleteEscenario,
  loadEscenarios,
  seedEscenariosIfEmpty,
  upsertEscenario,
} from '../lib/intensidadApi'

const ALERT_CLASS: Record<string, string> = {
  Crítico: 'alert-crit',
  Atención: 'alert-warn',
  Positivo: 'alert-ok',
}

const META_BADGE: Record<string, string> = {
  true: 'fase1-pill fase1-pill--ok',
  false: 'fase1-pill fase1-pill--danger',
  null: 'fase1-pill fase1-pill--muted',
}

const ESTADO_PILL: Record<string, string> = {
  Activo: 'fase1-pill fase1-pill--ok',
  Borrador: 'fase1-pill fase1-pill--warn',
  Archivado: 'fase1-pill fase1-pill--muted',
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

export function IntensidadPage() {
  const [records, setRecords] = useState<EscenarioRecord[]>([])
  const [report, setReport] = useState<IntensidadReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [form, setForm] = useState<EscenarioForm>(() => emptyEscenarioForm())
  const [showForm, setShowForm] = useState(false)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const seeded = await seedEscenariosIfEmpty()
      const escenarios = await loadEscenarios()
      setRecords(escenarios)
      let carbonReport = null
      try {
        const { state } = await loadCarbonCampaign()
        carbonReport = buildCarbonReport(state)
      } catch {
        carbonReport = null
      }
      setReport(buildIntensidadReport(carbonReport, escenarios))
      if (seeded > 0) setOkMsg(`Se cargaron ${seeded} escenarios de ejemplo`)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar intensidad',
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

  const hasKwhChart = useMemo(() => {
    if (!report) return false
    return report.comparison.some((c) => c.kwhPerTon != null && c.kwhPerTon > 0)
  }, [report])

  function openNew() {
    setForm(
      emptyEscenarioForm({
        codigo: nextCodigo(records.map((r) => r.codigo).filter(Boolean)),
      }),
    )
    setShowForm(true)
  }

  function openEdit(row: EscenarioRecord) {
    setForm(formFromRecord(row))
    setShowForm(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await upsertEscenario(form)
      setOkMsg(form.id ? 'Escenario actualizado' : 'Escenario creado')
      setShowForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este escenario?')) return
    try {
      await deleteEscenario(id)
      setOkMsg('Escenario eliminado')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  function exportCsvLocal() {
    if (!report) return
    downloadCsv(
      stampFilename('intensidad_escenarios', 'csv'),
      [
        'Codigo',
        'Escenario',
        'Estado',
        'Intensidad kg CO2e/t',
        'Delta vs base %',
        'Cumple meta',
        'kWh/t',
        'Responsable',
      ],
      report.scenarios.map((s) => [
        s.codigo,
        s.escenarioNombre,
        s.estado,
        s.intensidadKgT,
        s.deltaVsBasePct,
        s.cumpleMeta == null ? '' : s.cumpleMeta ? 'Si' : 'No',
        s.avgKwhPerTon,
        records.find((r) => r.id === s.escenarioId)?.responsable ?? '',
      ]),
    )
  }

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando intensidad y escenarios…</p>
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
    <div className="carbon-page fase1-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Activity size={14} />
            Fase 3 · Escenarios operativos
          </p>
          <h1>Intensidad de carbono y escenarios</h1>
          <p>
            Proxy kg CO₂e/t desde campaña Alicón ·{' '}
            {formatNum(report.baseline.totalCementT, 0)} t cemento base ·{' '}
            {formatNum(records.length)} escenario(s)
          </p>
        </div>
        <div className="hc-header-actions">
          <button type="button" className="btn-primary" onClick={openNew}>
            <Plus size={16} /> Nuevo escenario
          </button>
          <button
            type="button"
            className="btn-secondary-link"
            onClick={() => void runExportPack('intensidad', 'pdf')}
          >
            <Download size={16} /> PDF
          </button>
          <Link
            to="/operaciones/planta-alicon/huella-de-carbono"
            className="btn-secondary-link"
          >
            Huella Alicón →
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
          <h2>Intensidad por escenario</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={report.comparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-14}
                  textAnchor="end"
                  height={64}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar
                  dataKey="intensidad"
                  name="kg CO₂e/t"
                  fill="#047935"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        {hasKwhChart && (
          <section className="carbon-section">
            <h2>Electricidad especifica (kWh/t)</h2>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={report.comparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8ece8" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-14}
                    textAnchor="end"
                    height={64}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar
                    dataKey="kwhPerTon"
                    name="kWh/t"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>

      <section className="carbon-section fase1-table-section">
        <div className="fase1-section-head">
          <div>
            <h2>Escenarios «que pasa si…»</h2>
            <p className="fase1-section-sub">
              {formatNum(report.scenarios.length)} escenario(s) proyectados
            </p>
          </div>
          <div className="fase1-filters">
            <button type="button" className="btn-primary" onClick={openNew}>
              <Plus size={14} /> Nuevo
            </button>
            <button
              type="button"
              className="btn-secondary-link"
              onClick={exportCsvLocal}
            >
              CSV
            </button>
          </div>
        </div>
        <div className="fase1-table-wrap">
          <table className="carbon-table fase1-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Escenario</th>
                <th>Intensidad</th>
                <th>Delta %</th>
                <th>Cumple meta</th>
                <th>Estado</th>
                <th className="fase1-th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {report.scenarios.length === 0 ? (
                <tr>
                  <td colSpan={7}>Sin escenarios registrados.</td>
                </tr>
              ) : (
                report.scenarios.map((s) => (
                  <tr key={s.escenarioId ?? s.escenarioNombre}>
                    <td className="fase1-td-code">
                      <code>{s.codigo || '—'}</code>
                    </td>
                    <td className="fase1-td-main">
                      <strong>{s.escenarioNombre}</strong>
                      <span className="fase1-meta">
                        {s.plant} · {s.year}
                      </span>
                    </td>
                    <td>
                      {formatNum(s.intensidadKgT, 1)} kg CO₂e/t
                      <span className="fase1-meta">
                        prod. {formatNum(s.totalCementT, 0)} t
                      </span>
                    </td>
                    <td>
                      {s.deltaVsBasePct == null ? (
                        '—'
                      ) : (
                        <span
                          className={
                            s.deltaVsBasePct <= 0
                              ? 'fase1-pill fase1-pill--ok'
                              : 'fase1-pill fase1-pill--warn'
                          }
                        >
                          {s.deltaVsBasePct > 0 ? '+' : ''}
                          {formatNum(s.deltaVsBasePct, 1)}%
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          META_BADGE[String(s.cumpleMeta) as 'true' | 'false' | 'null']
                        }
                      >
                        {s.cumpleMeta == null
                          ? 'Sin meta'
                          : s.cumpleMeta
                            ? 'Cumple'
                            : 'Sobre meta'}
                      </span>
                    </td>
                    <td>
                      <span className={ESTADO_PILL[s.estado] ?? 'fase1-pill fase1-pill--muted'}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="fase1-row-actions">
                      {s.escenarioId && (
                        <>
                          <button
                            type="button"
                            className="btn-icon"
                            aria-label="Editar"
                            onClick={() => {
                              const row = records.find((r) => r.id === s.escenarioId)
                              if (row) openEdit(row)
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            aria-label="Eliminar"
                            onClick={() => void handleDelete(s.escenarioId!)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

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
            aria-labelledby="intensidad-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fase1-modal-head">
              <h2 id="intensidad-modal-title">
                {form.id ? 'Editar escenario' : 'Nuevo escenario'}
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
                Codigo
                <input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                />
              </label>
              <label>
                Estado
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  {ESCENARIO_ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fase1-span-2">
                Nombre *
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </label>
              <label className="fase1-span-2">
                Descripcion
                <textarea
                  rows={2}
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                />
              </label>
              <label>
                Anio base
                <input
                  type="number"
                  value={form.anioBase}
                  onChange={(e) => setForm({ ...form, anioBase: e.target.value })}
                />
              </label>
              <label>
                Planta
                <input
                  value={form.planta}
                  onChange={(e) => setForm({ ...form, planta: e.target.value })}
                />
              </label>
              <label>
                Delta produccion %
                <input
                  type="number"
                  step="any"
                  value={form.deltaProduccionPct}
                  onChange={(e) =>
                    setForm({ ...form, deltaProduccionPct: e.target.value })
                  }
                />
              </label>
              <label>
                Delta electricidad %
                <input
                  type="number"
                  step="any"
                  value={form.deltaElectricidadPct}
                  onChange={(e) =>
                    setForm({ ...form, deltaElectricidadPct: e.target.value })
                  }
                />
              </label>
              <label>
                Delta diesel %
                <input
                  type="number"
                  step="any"
                  value={form.deltaDieselPct}
                  onChange={(e) =>
                    setForm({ ...form, deltaDieselPct: e.target.value })
                  }
                />
              </label>
              <label>
                Delta clinker %
                <input
                  type="number"
                  step="any"
                  value={form.deltaClinkerPct}
                  onChange={(e) =>
                    setForm({ ...form, deltaClinkerPct: e.target.value })
                  }
                />
              </label>
              <label>
                Delta agua %
                <input
                  type="number"
                  step="any"
                  value={form.deltaAguaPct}
                  onChange={(e) =>
                    setForm({ ...form, deltaAguaPct: e.target.value })
                  }
                />
              </label>
              <label>
                EF electricidad (kg/kWh)
                <input
                  type="number"
                  step="any"
                  value={form.efElectricidadKgKwh}
                  onChange={(e) =>
                    setForm({ ...form, efElectricidadKgKwh: e.target.value })
                  }
                />
              </label>
              <label>
                EF diesel (kg/gal)
                <input
                  type="number"
                  step="any"
                  value={form.efDieselKgGal}
                  onChange={(e) =>
                    setForm({ ...form, efDieselKgGal: e.target.value })
                  }
                />
              </label>
              <label>
                Meta intensidad (kg CO2e/t)
                <input
                  type="number"
                  step="any"
                  value={form.metaIntensidadKgT}
                  onChange={(e) =>
                    setForm({ ...form, metaIntensidadKgT: e.target.value })
                  }
                />
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
              <label className="fase1-span-2">
                Notas
                <textarea
                  rows={3}
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
              </label>
              <div className="fase1-form-actions fase1-span-2">
                <button
                  type="button"
                  className="btn-secondary-link"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
