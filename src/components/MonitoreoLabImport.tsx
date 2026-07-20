import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
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
  /** Unidad esperada en esta pantalla (Agroprogreso | Alicón). */
  expectedUnidad?: 'Agroprogreso' | 'Alicón'
  /** Dónde ver los resultados tras guardar. */
  reportHref?: string
  /** Agro: aplica el primer muestreo al formulario. */
  onApply?: (payload: {
    header: AgroMonitoreoHeader
    rows: AgroMonitoreoParamRow[]
    year: number
    month: MonitoringMonth
  }) => void
  /** Tras guardar todos los puntos en Supabase. */
  onSaved?: (result: {
    savedRows: number
    puntos: number
    metaColumns: boolean
    unidadNegocio: string
  }) => void
  /** Texto de ayuda contextual. */
  hint?: string
}

export function MonitoreoLabImport({
  year,
  month,
  expectedUnidad,
  reportHref,
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

  const unidadPdf = preview?.data.unidadNegocio ?? ''
  const mismatch =
    Boolean(expectedUnidad && preview && unidadPdf && unidadPdf !== expectedUnidad)
  const canApplyToForm =
    Boolean(onApply) && (!expectedUnidad || unidadPdf === expectedUnidad)

  function applyPreview() {
    if (!preview || !canApplyToForm || !onApply) return
    onApply({
      header: preview.header,
      rows: preview.rows,
      year: preview.year ?? year,
      month: preview.month ?? month,
    })
    setSaveMsg(
      'Primer punto copiado al formulario de agua. Para guardar el PDF completo (todos los puntos) usa «Guardar todo el informe».',
    )
  }

  async function saveAll() {
    if (!preview) return
    setSaving(true)
    setError(null)
    setSaveMsg(null)
    try {
      const result = await saveImportedLabInforme(preview)
      const unidad = preview.data.unidadNegocio || 'Alicón'
      const where =
        unidad === 'Alicón'
          ? 'Reporte Alicón → Resultados de laboratorio'
          : 'esta tabla / reporte Agroprogreso'
      setSaveMsg(
        `Informe guardado: ${result.savedRows} parámetros en ${result.puntos} punto(s) (${unidad}). Revisa en ${where}.`,
      )
      onSaved?.({ ...result, unidadNegocio: unidad })
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
              'Sube el PDF del laboratorio (agua, aire, ruido). La IA extrae todos los puntos; confirma con «Guardar todo el informe» (no uses el botón verde «Guardar muestreo» de arriba para el PDF).'}
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
          <span>
            {saveMsg}{' '}
            {reportHref ? (
              <Link to={reportHref}>Ver resultados →</Link>
            ) : null}
          </span>
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

          {mismatch ? (
            <div className="hc-banner hc-banner-warn" role="status">
              <AlertTriangle size={18} />
              <span>
                Este PDF es de <strong>{unidadPdf}</strong>, pero estás en la
                pantalla de <strong>{expectedUnidad}</strong>. Puedes guardarlo
                igual (irá a {unidadPdf}). La tabla de abajo solo muestra{' '}
                {expectedUnidad}; para ver aire/ruido de Alicón abre el{' '}
                <Link to="/operaciones/planta-alicon/monitoreo-ambiental">
                  reporte Alicón
                </Link>{' '}
                o entra por{' '}
                <Link to="/entrada-datos/monitoreo-ambiental?proyecto=planta-alicon">
                  Entrada Alicón
                </Link>
                .
              </span>
            </div>
          ) : null}

          <div className="lab-import-meta">
            <div>
              <span>Sede</span>
              <strong>
                {preview.data.plantaSede || preview.header.plantaSede}
              </strong>
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
            <div
              key={`${m.puntoMuestreo}-${idx}`}
              className="lab-import-muestreo"
            >
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
              Para guardar este PDF usa el botón verde de abajo. El botón
              «Guardar muestreo» de la cabecera solo guarda el formulario de
              agua vacío y no es el informe.
            </p>
            <div className="lab-import-actions">
              {canApplyToForm ? (
                <button
                  type="button"
                  className="btn-secondary-link"
                  onClick={applyPreview}
                >
                  <CheckCircle2 size={16} />
                  Copiar 1.er punto al formulario
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
                {saving ? 'Guardando…' : 'Guardar todo el informe'}
              </button>
            </div>
          </footer>
        </div>
      ) : null}
    </section>
  )
}
