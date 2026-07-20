import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bot,
  Download,
  Loader2,
  Save,
  Scale,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { MarkdownBrief } from '../components/MarkdownBrief'
import {
  AUDITORIA_FOLLOWUP_HINT,
  AUDITORIA_PROMPT,
  formatAuditoriaFecha,
  type AuditoriaKpis,
  type AuditoriaQuickStat,
  type AuditoriaRecord,
} from '../data/auditorias'
import {
  formatNum,
  riskForCompromiso,
  type CompromisoRecord,
} from '../data/compromisosAmbientales'
import {
  deleteAuditoria,
  loadAuditorias,
  saveAuditoria,
} from '../lib/auditoriasApi'
import {
  loadCompromisos,
  loadEvidencias,
} from '../lib/compromisosAmbientalesApi'
import { askCopilot } from '../lib/chat/askCopilot'
import type { ChatDomainId, ChatMessagePayload } from '../lib/chat/types'
import { useAuth } from '../context/AuthContext'
import { downloadReportPdf, stampFilename } from '../lib/exportDownload'

const AUDIT_DOMAINS: ChatDomainId[] = [
  'compromisos',
  'cumplimiento',
  'capa',
]

const SUGGESTIONS = [
  'Ejecuta una auditoría completa de los compromisos ambientales',
  '¿Cuáles compromisos vencidos deben priorizarse esta semana?',
  'Lista brechas de evidencia por sitio',
  '¿Qué hallazgos críticos reportarías a gerencia?',
]

function buildKpis(
  rows: CompromisoRecord[],
  evidByComp: Map<string, number>,
): AuditoriaKpis {
  let abiertos = 0
  let vencidos = 0
  let alerta = 0
  let sinEvidencia = 0
  for (const c of rows) {
    const risk = riskForCompromiso(c)
    if (risk !== 'cerrado' && risk !== 'suspendido') abiertos += 1
    if (risk === 'vencido') vencidos += 1
    if (risk === 'critico' || risk === 'atencion') alerta += 1
    if ((evidByComp.get(c.id) ?? 0) === 0 && risk !== 'cerrado') {
      sinEvidencia += 1
    }
  }
  return {
    total: rows.length,
    abiertos,
    vencidos,
    alerta,
    sinEvidencia,
  }
}

function buildQuickStats(kpis: AuditoriaKpis): AuditoriaQuickStat[] {
  return [
    {
      id: 'total',
      label: 'Compromisos',
      value: formatNum(kpis.total),
      hint: `${formatNum(kpis.abiertos)} abiertos`,
      tone: 'dark',
    },
    {
      id: 'venc',
      label: 'Vencidos',
      value: formatNum(kpis.vencidos),
      hint: 'Riesgo de incumplimiento',
      tone: kpis.vencidos > 0 ? 'warn' : 'lime',
    },
    {
      id: 'alerta',
      label: 'En alerta',
      value: formatNum(kpis.alerta),
      hint: 'Ventana de vencimiento próxima',
      tone: kpis.alerta > 0 ? 'warn' : 'default',
    },
    {
      id: 'evid',
      label: 'Sin evidencia',
      value: formatNum(kpis.sinEvidencia),
      hint: 'Abiertos sin soporte documental',
      tone: kpis.sinEvidencia > 0 ? 'warn' : 'lime',
    },
  ]
}

export function AuditoriasPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<CompromisoRecord[]>([])
  const [evidByComp, setEvidByComp] = useState<Map<string, number>>(new Map())
  const [history, setHistory] = useState<AuditoriaRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [report, setReport] = useState<string>('')
  const [auditing, setAuditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [messages, setMessages] = useState<ChatMessagePayload[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [source, setSource] = useState<'openai' | 'local' | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  async function reloadHistory(keepId?: string | null) {
    const list = await loadAuditorias()
    setHistory(list)
    if (keepId && list.some((a) => a.id === keepId)) {
      setActiveId(keepId)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [compromisos, evidencias, auditorias] = await Promise.all([
          loadCompromisos(),
          loadEvidencias().catch(() => []),
          loadAuditorias().catch(() => [] as AuditoriaRecord[]),
        ])
        if (cancelled) return
        const map = new Map<string, number>()
        for (const e of evidencias) {
          map.set(e.compromisoId, (map.get(e.compromisoId) ?? 0) + 1)
        }
        setRows(compromisos)
        setEvidByComp(map)
        setHistory(auditorias)
        if (auditorias[0] && !report) {
          const latest = auditorias[0]
          setActiveId(latest.id)
          setReport(latest.dictamenMd)
          setMessages(latest.mensajes)
          setSource(latest.fuente)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los datos de auditoría',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, auditing, sending])

  useEffect(() => {
    if (!okMsg) return
    const t = window.setTimeout(() => setOkMsg(null), 4000)
    return () => window.clearTimeout(t)
  }, [okMsg])

  const kpis = useMemo(
    () => buildKpis(rows, evidByComp),
    [rows, evidByComp],
  )
  const stats = useMemo(() => buildQuickStats(kpis), [kpis])
  const active = history.find((a) => a.id === activeId) ?? null

  async function persistDictamen(opts: {
    dictamenMd: string
    mensajes: ChatMessagePayload[]
    fuente: 'openai' | 'local'
    id?: string | null
  }) {
    const saved = await saveAuditoria({
      id: opts.id ?? undefined,
      dictamenMd: opts.dictamenMd,
      mensajes: opts.mensajes,
      fuente: opts.fuente,
      kpis,
      generadoPor: user?.name || user?.username || 'Auditor IA',
      estado: 'Emitida',
    })
    await reloadHistory(saved.id)
    setActiveId(saved.id)
    return saved
  }

  async function runAuditor(question: string, asFullAudit: boolean) {
    const trimmed = question.trim()
    if (!trimmed) return

    const historyMsgs = messages.slice(-8)
    const prompt = asFullAudit
      ? `${AUDITORIA_PROMPT}\n\nSOLICITUD DEL USUARIO:\n${trimmed}`
      : `${AUDITORIA_PROMPT}\n\nPregunta de seguimiento del usuario (mantén el rol de auditor):\n${trimmed}`

    const nextMessages: ChatMessagePayload[] = [
      ...messages,
      { role: 'user', content: trimmed },
    ]
    setMessages(nextMessages)
    if (asFullAudit) setAuditing(true)
    else setSending(true)
    setError(null)

    try {
      const result = await askCopilot({
        question: prompt,
        history: historyMsgs,
        domainIds: AUDIT_DOMAINS,
      })
      if (result.error && !result.reply) {
        throw new Error(result.error)
      }
      const reply = result.reply?.trim() || 'Sin respuesta del auditor.'
      const fuente = result.source
      setSource(fuente)
      const withReply: ChatMessagePayload[] = [
        ...nextMessages,
        { role: 'assistant', content: reply },
      ]
      setMessages(withReply)

      if (asFullAudit || !report) {
        setReport(reply)
        try {
          const saved = await persistDictamen({
            dictamenMd: reply,
            mensajes: withReply,
            fuente,
            id: asFullAudit ? null : activeId,
          })
          setOkMsg(
            asFullAudit
              ? `Dictamen guardado · ${saved.codigo}`
              : `Auditoría actualizada · ${saved.codigo}`,
          )
        } catch (saveErr) {
          console.warn('[auditorias] save', saveErr)
          setOkMsg('Dictamen generado (no se pudo guardar en base de datos)')
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar la auditoría con IA',
      )
    } finally {
      setAuditing(false)
      setSending(false)
    }
  }

  async function handleSaveManual() {
    if (!report.trim()) return
    setSaving(true)
    setError(null)
    try {
      const saved = await persistDictamen({
        dictamenMd: report,
        mensajes,
        fuente: source ?? 'local',
        id: activeId,
      })
      setOkMsg(`Guardado · ${saved.codigo}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  function openFromHistory(row: AuditoriaRecord) {
    setActiveId(row.id)
    setReport(row.dictamenMd)
    setMessages(row.mensajes)
    setSource(row.fuente)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este dictamen del historial?')) return
    try {
      await deleteAuditoria(id)
      const list = await loadAuditorias()
      setHistory(list)
      if (activeId === id) {
        const next = list[0] ?? null
        setActiveId(next?.id ?? null)
        setReport(next?.dictamenMd ?? '')
        setMessages(next?.mensajes ?? [])
        setSource(next?.fuente ?? null)
      }
      setOkMsg('Dictamen eliminado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  function handleExportPdf() {
    if (!report.trim()) return
    downloadReportPdf({
      title: active?.titulo || 'Auditoría de compromisos ambientales',
      subtitle: `${active?.codigo || 'Sin código'} · ${formatAuditoriaFecha(active?.createdAt || new Date().toISOString())}`,
      footer: 'Cementos Progreso Ambiente · Cumplimiento Legal · Auditorías',
      filename: stampFilename(
        active?.codigo?.toLowerCase().replace(/\s+/g, '_') || 'auditoria',
        'pdf',
      ),
      theme: 'cumplimiento',
      kpis: [
        { label: 'Compromisos', value: formatNum(kpis.total) },
        { label: 'Vencidos', value: formatNum(kpis.vencidos) },
        { label: 'En alerta', value: formatNum(kpis.alerta) },
        { label: 'Sin evidencia', value: formatNum(kpis.sinEvidencia) },
      ],
      sections: [
        {
          heading: 'Dictamen',
          body: report,
          style: 'markdown',
        },
      ],
    })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (sending || auditing) return
    const q = input
    setInput('')
    void runAuditor(q, false)
  }

  if (loading) {
    return (
      <div className="carbon-page hc-loading">
        <Loader2 className="hc-spin" size={28} />
        <p>Cargando portafolio e historial de auditorías…</p>
      </div>
    )
  }

  return (
    <div className="carbon-page fase1-page auditorias-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Scale size={14} />
            Cumplimiento Legal · Auditorías
          </p>
          <h1>Auditorías</h1>
          <p>
            La IA actúa como auditor de los compromisos ambientales. Los
            dictámenes se guardan en historial para consulta y exportación.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link
            to="/compromisos-ambientales/lista"
            className="btn-secondary-link"
          >
            Ver compromisos →
          </Link>
          <button
            type="button"
            className="btn-secondary-link"
            disabled={!report.trim() || saving}
            onClick={() => void handleSaveManual()}
          >
            {saving ? (
              <Loader2 className="hc-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            Guardar
          </button>
          <button
            type="button"
            className="btn-secondary-link"
            disabled={!report.trim()}
            onClick={handleExportPdf}
          >
            <Download size={16} />
            PDF
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={auditing || sending || rows.length === 0}
            onClick={() =>
              void runAuditor(
                'Ejecuta una auditoría completa de los compromisos ambientales',
                true,
              )
            }
          >
            {auditing ? (
              <Loader2 className="hc-spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            {auditing ? 'Auditando…' : 'Ejecutar auditoría con IA'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="hc-banner hc-banner-error" role="alert">
          <AlertTriangle size={16} />
          <strong>Error:</strong> {error}
        </div>
      ) : null}
      {okMsg ? (
        <div className="hc-banner hc-banner-ok" role="status">
          {okMsg}
        </div>
      ) : null}

      <div className="carbon-kpi-grid">
        {stats.map((kpi) => (
          <article key={kpi.id} className="carbon-kpi">
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <p>{kpi.hint}</p>
          </article>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="hc-banner hc-banner-warn" role="status">
          No hay compromisos ambientales registrados. Carga el portafolio para
          poder auditar.
          <Link
            to="/compromisos-ambientales/crear"
            className="btn-secondary-link"
          >
            Crear compromiso →
          </Link>
        </div>
      ) : null}

      <div className="auditorias-layout auditorias-layout--3">
        <section className="dash-panel auditorias-history">
          <div className="dash-panel-head">
            <div>
              <h2>Historial</h2>
              <p>{history.length} dictamen(es) guardados</p>
            </div>
          </div>
          {history.length === 0 ? (
            <p className="carbon-inline-note">
              Aún no hay auditorías guardadas. Al ejecutar una, se almacena
              automáticamente.
            </p>
          ) : (
            <ul className="auditorias-history-list">
              {history.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`auditorias-history-item${
                      row.id === activeId ? ' is-active' : ''
                    }`}
                    onClick={() => openFromHistory(row)}
                  >
                    <strong>{row.codigo || 'Sin código'}</strong>
                    <span>{formatAuditoriaFecha(row.createdAt)}</span>
                    <small>{row.resumen || row.titulo}</small>
                  </button>
                  <button
                    type="button"
                    className="auditorias-history-del"
                    title="Eliminar"
                    onClick={() => void handleDelete(row.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-panel auditorias-report">
          <div className="dash-panel-head">
            <div>
              <h2>
                <Bot
                  size={18}
                  style={{ marginRight: 8, verticalAlign: -3 }}
                />
                Dictamen del auditor IA
              </h2>
              <p>
                {active
                  ? `${active.codigo} · ${active.estado}`
                  : source
                    ? source === 'openai'
                      ? 'Generado con el copiloto'
                      : 'Modo reducido (sin modelo remoto)'
                    : 'Ejecuta una auditoría o selecciona del historial'}
              </p>
            </div>
          </div>
          {auditing ? (
            <div className="hc-loading" style={{ minHeight: 160 }}>
              <Loader2 className="hc-spin" size={24} />
              <p>El auditor está revisando compromisos y evidencias…</p>
            </div>
          ) : report ? (
            <div className="auditorias-md">
              <MarkdownBrief markdown={report} />
            </div>
          ) : (
            <div className="dash-empty">
              <p>
                Aún no hay dictamen. Usa{' '}
                <strong>Ejecutar auditoría con IA</strong> o una sugerencia.
              </p>
              <p className="carbon-inline-note">{AUDITORIA_FOLLOWUP_HINT}</p>
            </div>
          )}
        </section>

        <section className="dash-panel auditorias-chat">
          <div className="dash-panel-head">
            <div>
              <h2>Consultar al auditor</h2>
              <p>Preguntas de seguimiento con el mismo rol de auditoría</p>
            </div>
          </div>

          <div className="auditorias-suggestions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="btn-secondary-link"
                disabled={auditing || sending}
                onClick={() =>
                  void runAuditor(s, /auditoría completa/i.test(s))
                }
              >
                {s}
              </button>
            ))}
          </div>

          <div className="auditorias-thread" aria-live="polite">
            {messages.length === 0 ? (
              <p className="carbon-inline-note">
                El hilo del auditor aparecerá aquí.
              </p>
            ) : (
              messages.map((m, i) => (
                <article
                  key={`${m.role}-${i}`}
                  className={`auditorias-bubble auditorias-bubble--${m.role}`}
                >
                  <span>{m.role === 'user' ? 'Tú' : 'Auditor IA'}</span>
                  {m.role === 'assistant' ? (
                    <MarkdownBrief markdown={m.content} />
                  ) : (
                    <p>{m.content}</p>
                  )}
                </article>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="auditorias-composer" onSubmit={handleSubmit}>
            <input
              id="auditorias-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej. ¿Qué hallazgos críticos hay en Agroprogreso?"
              aria-label="Pregunta al auditor"
              disabled={sending || auditing}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={sending || auditing || !input.trim()}
            >
              {sending ? (
                <Loader2 className="hc-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
              Enviar
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
