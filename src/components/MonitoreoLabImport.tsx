import { useRef, useState } from 'react'
import {
  CheckCircle2,
  Database,
  FileUp,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
import type { MonitoringMonth } from '../data/agroMonitoreos'
import type { AgroMonitoreoHeader, AgroMonitoreoParamRow } from '../data/agroMonitoreos'
import {
  importMonitoreoLabPdf,
  saveImportedLabInforme,
  type LabImportPreview,
} from '../lib/monitoreoLabImport'

type Props = {
  year: number
  month: MonitoringMonth
  /** Agro: aplica el primer muestreo al formulario. */
  onApply?: (payload: {
    header: AgroMonitoreoHeader
    rows: AgroMonitoreoParamRow[]
    year: number
    month: MonitoringMonth
  }) => void
  /** Tras guardar todos los puntos en Supabase. */
  onSaved?: (result: { savedRows: number; puntos: number }) => void
  /** Texto de ayuda contextual. */
  hint?: string
}

export function MonitoreoLabImport({
  year,
  month,
  onApply,
  onSaved,
  hint,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [preview, setPreview] = useState<LabImportPreview | null>(null)

  async function handleFile(file: File | null) {
    if (!file) return
    setBusy(true)
    setError(null)
    setSaveMsg(null)
    setPreview(null)
    try {
      const result = await importMonitoreoLabPdf(file, year, month)
      setPreview(result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo leer el informe con IA',
      )
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function applyPreview() {
    if (!preview || !onApply) return
    onApply({
      header: preview.header,
      rows: preview.rows,
      year: preview.year ?? year,
      month: preview.month ?? month,
    })
    setSaveMsg('Parámetros aplicados al formulario. Revisa y guarda el muestreo.')
  }

  async function saveAll() {
    if (!preview) return
    setSaving(true)
    setError(null)
    setSaveMsg(null)
    try {
      const result = await saveImportedLabInforme(preview)
      setSaveMsg(
        `Guardado: ${result.savedRows} parámetros en ${result.puntos} punto(s) de muestreo.`,
      )
      onSaved?.(result)
      setPreview(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el informe en el sistema',
      )
    } finally {
      setSaving(false)
    }
  }

  const muestreos = preview?.data.muestreos ?? []

  return (
    <section className="lab-import-panel">
      <div className="lab-import-head">
        <div>
          <h2>
            <Sparkles size={18} />
            Cargar informe de laboratorio
          </h2>
          <p>
            {hint ??
              'Sube el PDF del laboratorio (agua, aire, ruido). La IA extrae todos los puntos y parámetros; puedes guardarlos organizados o aplicar el primer muestreo al formulario.'}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary-link"
          disabled={busy || saving}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="hc-spin" size={16} />
          ) : (
            <FileUp size={16} />
          )}
          {busy ? 'Leyendo con IA…' : 'Seleccionar PDF'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error ? (
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      {saveMsg ? (
        <div className="hc-banner hc-banner-ok" role="status">
          <CheckCircle2 size={18} />
          {saveMsg}
        </div>
      ) : null}

      {preview ? (
        <div className="lab-import-preview">
          <header>
            <div>
              <strong>{preview.fileName}</strong>
              <span>
                {preview.pages} pág. · {preview.data.unidadNegocio} ·{' '}
                {preview.data.medio} · confianza {preview.data.confidence}
                {preview.data.laboratorio
                  ? ` · ${preview.data.laboratorio}`
                  : ''}
              </span>
              <span>
                {muestreos.length} punto(s) · {preview.totalParametros}{' '}
                parámetro(s) extraídos
              </span>
              {preview.extractNote ? (
                <small>{preview.extractNote}</small>
              ) : null}
              {preview.data.notas ? <small>{preview.data.notas}</small> : null}
            </div>
            <button
              type="button"
              className="btn-ghost"
              aria-label="Cerrar vista previa"
              onClick={() => setPreview(null)}
            >
              <X size={16} />
            </button>
          </header>

          <div className="lab-import-meta">
            <div>
              <span>Sede</span>
              <strong>{preview.data.plantaSede || preview.header.plantaSede}</strong>
            </div>
            <div>
              <span>Medio</span>
              <strong>{preview.data.medio}</strong>
            </div>
            <div>
              <span>Puntos</span>
              <strong>{muestreos.length}</strong>
            </div>
            <div>
              <span>Parámetros</span>
              <strong>{preview.totalParametros}</strong>
            </div>
          </div>

          {muestreos.map((m, idx) => (
            <div key={`${m.puntoMuestreo}-${idx}`} className="lab-import-muestreo">
              <h3>
                {m.puntoMuestreo}
                <span>
                  {m.fecha ?? 'sin fecha'} · {m.tipoMedio} ·{' '}
                  {m.parametros.length} parámetros
                </span>
              </h3>
              <div className="lab-import-table-wrap">
                <table className="lab-import-table">
                  <thead>
                    <tr>
                      <th>Parámetro</th>
                      <th>Resultado</th>
                      <th>Unidad</th>
                      <th>Límite</th>
                      <th>Cumple</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.parametros.slice(0, 40).map((r, i) => (
                      <tr key={`${r.parametro}-${i}`}>
                        <td>{r.parametro}</td>
                        <td>
                          {r.resultado != null ? String(r.resultado) : '—'}
                        </td>
                        <td>{r.unidad || '—'}</td>
                        <td>{r.limitePermisible || '—'}</td>
                        <td>{r.cumple || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {m.parametros.length > 40 ? (
                  <p className="lab-import-more">
                    +{m.parametros.length - 40} parámetros más (se guardan
                    todos)
                  </p>
                ) : null}
              </div>
            </div>
          ))}

          <footer>
            <p>
              Se reemplazan resultados previos del mismo punto y fecha. Revisa
              la extracción antes de confirmar.
            </p>
            <div className="lab-import-actions">
              {onApply ? (
                <button
                  type="button"
                  className="btn-secondary-link"
                  onClick={applyPreview}
                >
                  <CheckCircle2 size={16} />
                  Aplicar 1.er punto al formulario
                </button>
              ) : null}
              <button
                type="button"
                className="btn-primary"
                disabled={saving || preview.totalParametros === 0}
                onClick={() => void saveAll()}
              >
                {saving ? (
                  <Loader2 className="hc-spin" size={16} />
                ) : (
                  <Database size={16} />
                )}
                {saving ? 'Guardando…' : 'Guardar todo en el sistema'}
              </button>
            </div>
          </footer>
        </div>
      ) : null}
    </section>
  )
}
