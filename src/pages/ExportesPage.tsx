import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  EXPORT_PACKS,
  runExportPack,
  type ExportPackId,
} from '../lib/exportPacks'
import { PDF_THEMES } from '../lib/exportDownload'

function rgbCss(rgb: [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

export function ExportesPage() {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  async function handleExport(packId: ExportPackId, format: 'pdf' | 'csv') {
    const key = `${packId}:${format}`
    setBusyId(key)
    setError(null)
    setOkMsg(null)
    try {
      await runExportPack(packId, format)
      setOkMsg(
        `Descarga lista: ${packId} (${format.toUpperCase()}). Revise la carpeta de descargas.`,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo generar la exportación',
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="carbon-page fase1-page exportes-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <Package size={14} />
            Fase 1 · Centro de exportaciones
          </p>
          <h1>Exportes y packs de evidencia</h1>
          <p>
            Genere PDF oficiales y CSV compatibles con Excel para gerencia,
            auditoría y autoridades. Los packs usan datos vivos de Supabase.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link to="/cumplimiento" className="btn-secondary-link">
            Cumplimiento →
          </Link>
          <Link to="/capa" className="btn-secondary-link">
            CAPA →
          </Link>
          <Link to="/dashboard" className="btn-secondary-link">
            Dashboard →
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

      <section className="carbon-section">
        <h2>Packs disponibles</h2>
        <div className="fase1-export-grid">
          {EXPORT_PACKS.map((pack) => {
            const theme = PDF_THEMES[pack.theme]
            return (
            <article
              key={pack.id}
              className="fase1-export-card"
              style={{
                borderTopColor: rgbCss(theme.accent),
                ['--pack-accent' as string]: rgbCss(theme.accent),
                ['--pack-header' as string]: rgbCss(theme.header),
                ['--pack-bg' as string]: rgbCss(theme.kpiBg),
              }}
            >
              <div
                className="fase1-export-icon"
                style={{
                  background: rgbCss(theme.kpiBg),
                  color: rgbCss(theme.header),
                }}
              >
                {pack.formats.includes('pdf') ? (
                  <FileText size={22} />
                ) : (
                  <FileSpreadsheet size={22} />
                )}
              </div>
              <div className="fase1-export-body">
                <h3 style={{ color: rgbCss(theme.header) }}>{pack.title}</h3>
                <p>{pack.description}</p>
                <span className="fase1-export-audience">{pack.audience}</span>
              </div>
              <div className="fase1-export-actions">
                {pack.formats.includes('pdf') && (
                  <button
                    type="button"
                    className="btn-primary fase1-export-pdf-btn"
                    style={{
                      background: `linear-gradient(135deg, ${rgbCss(theme.accent)}, ${rgbCss(theme.header)})`,
                    }}
                    disabled={busyId != null}
                    onClick={() => void handleExport(pack.id, 'pdf')}
                  >
                    {busyId === `${pack.id}:pdf` ? (
                      <Loader2 className="hc-spin" size={16} />
                    ) : (
                      <FileDown size={16} />
                    )}
                    PDF
                  </button>
                )}
                {pack.formats.includes('csv') && (
                  <button
                    type="button"
                    className="btn-secondary-link"
                    disabled={busyId != null}
                    onClick={() => void handleExport(pack.id, 'csv')}
                  >
                    {busyId === `${pack.id}:csv` ? (
                      <Loader2 className="hc-spin" size={16} />
                    ) : (
                      <Download size={16} />
                    )}
                    Excel (CSV)
                  </button>
                )}
              </div>
            </article>
            )
          })}
        </div>
      </section>

      <section className="carbon-section">
        <h2>Cómo usar</h2>
        <ul className="fase1-help-list">
          <li>
            <strong>PDF</strong> — informe listo para compartir con gerencia o
            adjuntar a un expediente de auditoría.
          </li>
          <li>
            <strong>Excel (CSV)</strong> — abre directo en Excel / Google Sheets
            con UTF-8 (incluye BOM). Ideal para análisis o anexos tabulares.
          </li>
          <li>
            Los packs de <em>Cumplimiento</em> y <em>CAPA</em> reflejan el
            portafolio actual; sincronice licencias/trámites desde Cumplimiento
            antes de exportar si necesita el inventario completo.
          </li>
        </ul>
      </section>
    </div>
  )
}
