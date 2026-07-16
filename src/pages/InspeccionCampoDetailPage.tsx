import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  Factory,
  ImageIcon,
  Loader2,
  MapPin,
  ShieldAlert,
  Sparkles,
  User,
} from 'lucide-react'
import {
  CLASIFICACION_LABELS,
  type InspeccionCampoDetail,
  type InspeccionClasificacion,
  type InspeccionHallazgoRecord,
} from '../data/inspeccionesCampo'
import { loadInspeccionCampoDetail } from '../lib/inspeccionesCampoApi'

const CLASS_META: Record<
  InspeccionClasificacion,
  { label: string; tone: string; Icon: typeof CheckCircle2 }
> = {
  buena_practica: {
    label: CLASIFICACION_LABELS.buena_practica,
    tone: 'is-good',
    Icon: Sparkles,
  },
  situacion_riesgo: {
    label: CLASIFICACION_LABELS.situacion_riesgo,
    tone: 'is-risk',
    Icon: ShieldAlert,
  },
  observacion_general: {
    label: CLASIFICACION_LABELS.observacion_general,
    tone: 'is-obs',
    Icon: Eye,
  },
}

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  if (!y || !m || !d) return fecha
  try {
    return new Date(y, m - 1, d).toLocaleDateString('es-GT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return fecha
  }
}

function backPathFor(detail: InspeccionCampoDetail): string {
  const isAlicon =
    detail.plantaSede.toLowerCase() === 'alicon' ||
    detail.unidadNegocio.toLowerCase().includes('cementos')
  return isAlicon
    ? '/entrada-datos/planta-alicon/inspeccion-ambiental'
    : '/entrada-datos/agroprogreso/inspeccion-ambiental'
}

function opsPathFor(detail: InspeccionCampoDetail): string {
  const isAlicon =
    detail.plantaSede.toLowerCase() === 'alicon' ||
    detail.unidadNegocio.toLowerCase().includes('cementos')
  return isAlicon
    ? '/operaciones/planta-alicon/inspeccion-ambiental'
    : '/operaciones/agroprogreso/inspeccion-ambiental'
}

function AreaCard({ hallazgo }: { hallazgo: InspeccionHallazgoRecord }) {
  const meta = CLASS_META[hallazgo.clasificacion]
  const Icon = meta.Icon

  return (
    <article className={`insp-detail-area ${meta.tone}`}>
      <header className="insp-detail-area-head">
        <div>
          <span className="insp-detail-area-order">Área {hallazgo.orden}</span>
          <h3>{hallazgo.areaNombre}</h3>
        </div>
        <span className={`insp-detail-badge ${meta.tone}`}>
          <Icon size={14} />
          {meta.label}
        </span>
      </header>

      {hallazgo.comentario ? (
        <p className="insp-detail-area-comment">{hallazgo.comentario}</p>
      ) : (
        <p className="insp-detail-area-comment is-muted">Sin comentario de área</p>
      )}

      {hallazgo.fotoUrls.length > 0 ? (
        <div className="insp-detail-photos">
          {hallazgo.fotoUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="insp-detail-photo"
              title="Ver foto completa"
            >
              <img src={url} alt={`Evidencia ${hallazgo.areaNombre}`} loading="lazy" />
            </a>
          ))}
        </div>
      ) : (
        <div className="insp-detail-photos-empty">
          <ImageIcon size={18} />
          Sin fotos en esta área
        </div>
      )}
    </article>
  )
}

export function InspeccionCampoDetailPage() {
  const { id = '' } = useParams()
  const [detail, setDetail] = useState<InspeccionCampoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadInspeccionCampoDetail(id)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setError('No encontramos esta inspección.')
          setDetail(null)
          return
        }
        setDetail(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Error al cargar la inspección')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const counts = useMemo(() => {
    if (!detail) return { riesgo: 0, obs: 0, buenas: 0, fotos: 0 }
    return {
      riesgo: detail.hallazgos.filter((h) => h.clasificacion === 'situacion_riesgo')
        .length,
      obs: detail.hallazgos.filter((h) => h.clasificacion === 'observacion_general')
        .length,
      buenas: detail.hallazgos.filter((h) => h.clasificacion === 'buena_practica')
        .length,
      fotos: detail.hallazgos.reduce((n, h) => n + h.fotoUrls.length, 0),
    }
  }, [detail])

  if (loading) {
    return (
      <div className="insp-detail-page is-loading">
        <Loader2 className="spin" size={28} />
        <p>Cargando informe de inspección…</p>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="insp-detail-page">
        <div className="insp-detail-empty">
          <AlertTriangle size={28} />
          <h1>Informe no disponible</h1>
          <p>{error ?? 'Inspección no encontrada'}</p>
          <Link to="/entrada-datos/agroprogreso/inspeccion-ambiental" className="btn-secondary-link">
            <ArrowLeft size={14} /> Volver a inspecciones
          </Link>
        </div>
      </div>
    )
  }

  const back = backPathFor(detail)
  const ops = opsPathFor(detail)
  const riskTone =
    detail.nivelRiesgo === 'Alto'
      ? 'is-risk'
      : detail.nivelRiesgo === 'Medio'
        ? 'is-obs'
        : 'is-good'

  return (
    <div className="insp-detail-page">
      <div className="insp-detail-topbar">
        <Link to={back} className="insp-detail-back">
          <ArrowLeft size={16} />
          Volver a entrada de datos
        </Link>
        <Link to={ops} className="btn-secondary-link">
          Ver en operaciones
        </Link>
      </div>

      <header className="insp-detail-hero">
        <div className="insp-detail-hero-copy">
          <span className="insp-detail-kicker">
            <ClipboardList size={14} />
            Informe de inspección de campo
          </span>
          <h1>{detail.plantaSede}</h1>
          <p>{detail.unidadNegocio}</p>
          <div className="insp-detail-meta">
            <span>
              <CalendarDays size={14} />
              {formatFecha(detail.fecha)}
            </span>
            <span>
              <User size={14} />
              {detail.responsable || 'Sin responsable'}
            </span>
            <span>
              <Factory size={14} />
              {detail.estado === 'completada' ? 'Completada' : detail.estado}
            </span>
          </div>
        </div>

        <div className="insp-detail-score">
          <strong>{detail.resultadoGeneral ?? '—'}</strong>
          <span>Resultado / 100</span>
          <em className={`insp-detail-badge ${riskTone}`}>
            Riesgo {detail.nivelRiesgo || '—'}
          </em>
        </div>
      </header>

      <section className="insp-detail-kpis">
        <article>
          <MapPin size={16} />
          <div>
            <strong>{detail.hallazgos.length}</strong>
            <span>Áreas inspeccionadas</span>
          </div>
        </article>
        <article>
          <ShieldAlert size={16} />
          <div>
            <strong>{counts.riesgo}</strong>
            <span>Situaciones de riesgo</span>
          </div>
        </article>
        <article>
          <Eye size={16} />
          <div>
            <strong>{counts.obs}</strong>
            <span>Observaciones</span>
          </div>
        </article>
        <article>
          <Sparkles size={16} />
          <div>
            <strong>{counts.buenas}</strong>
            <span>Buenas prácticas</span>
          </div>
        </article>
        <article>
          <ImageIcon size={16} />
          <div>
            <strong>{counts.fotos}</strong>
            <span>Evidencias fotográficas</span>
          </div>
        </article>
        <article>
          <AlertTriangle size={16} />
          <div>
            <strong>{detail.requiereAccionInmediata || 'No'}</strong>
            <span>Acción inmediata</span>
          </div>
        </article>
      </section>

      <section className="insp-detail-summary">
        <div className="insp-detail-panel">
          <h2>Nota general</h2>
          <p>{detail.notaGeneral || 'Sin nota general generada.'}</p>
        </div>
        <div className="insp-detail-panel">
          <h2>Comentario del inspector</h2>
          <p>
            {detail.comentarioGeneral.trim()
              ? detail.comentarioGeneral
              : 'Sin comentario general.'}
          </p>
        </div>
      </section>

      <section className="insp-detail-areas-section">
        <div className="insp-detail-areas-head">
          <h2>Detalle por área</h2>
          <p>
            Clasificación, comentario y fotos capturadas durante la inspección
            conversacional.
          </p>
        </div>

        {detail.hallazgos.length === 0 ? (
          <div className="insp-detail-empty-inline">
            Esta inspección no tiene hallazgos por área registrados.
          </div>
        ) : (
          <div className="insp-detail-areas-grid">
            {detail.hallazgos.map((h) => (
              <AreaCard key={h.id} hallazgo={h} />
            ))}
          </div>
        )}
      </section>

      {counts.fotos > 0 && (
        <section className="insp-detail-gallery">
          <h2>Galería de evidencias</h2>
          <div className="insp-detail-gallery-grid">
            {detail.hallazgos.flatMap((h) =>
              h.fotoUrls.map((url) => (
                <button
                  key={`${h.id}-${url}`}
                  type="button"
                  className="insp-detail-gallery-item"
                  onClick={() => setLightbox(url)}
                >
                  <img src={url} alt={h.areaNombre} loading="lazy" />
                  <span>{h.areaNombre}</span>
                </button>
              )),
            )}
          </div>
        </section>
      )}

      {lightbox && (
        <div
          className="insp-detail-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="insp-detail-lightbox-close"
            onClick={() => setLightbox(null)}
          >
            Cerrar
          </button>
          <img src={lightbox} alt="Evidencia ampliada" />
        </div>
      )}
    </div>
  )
}
