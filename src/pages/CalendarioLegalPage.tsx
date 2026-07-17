import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { loadCumplimiento } from '../lib/cumplimientoApi'
import { loadCapas } from '../lib/capaApi'
import { formatIsoDate } from '../data/cumplimiento'

type CalItem = {
  id: string
  fecha: string
  titulo: string
  origen: string
  href: string
  riesgo: 'alto' | 'medio' | 'bajo'
}

function riskFromDate(iso: string | null | undefined): 'alto' | 'medio' | 'bajo' {
  if (!iso) return 'bajo'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'bajo'
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000)
  if (days < 0 || days <= 15) return 'alto'
  if (days <= 45) return 'medio'
  return 'bajo'
}

export function CalendarioLegalPage() {
  const [items, setItems] = useState<CalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [obligaciones, capas] = await Promise.all([
          loadCumplimiento(),
          loadCapas(),
        ])
        if (cancelled) return

        const fromObl: CalItem[] = obligaciones
          .filter((o) => o.fechaVencimiento)
          .map((o) => ({
            id: `obl-${o.id}`,
            fecha: o.fechaVencimiento!,
            titulo: o.titulo || o.codigo || 'Obligación',
            origen: 'Cumplimiento legal',
            href: '/cumplimiento',
            riesgo: riskFromDate(o.fechaVencimiento),
          }))

        const fromCapa: CalItem[] = capas
          .filter(
            (c) =>
              c.fechaCompromiso &&
              !/cerrad|cancelad/i.test(c.estado),
          )
          .map((c) => ({
            id: `capa-${c.id}`,
            fecha: c.fechaCompromiso!,
            titulo: c.accion || c.hallazgo || c.codigo || 'CAPA',
            origen: 'Acciones correctivas (CAPA)',
            href: '/capa',
            riesgo: riskFromDate(c.fechaCompromiso),
          }))

        const merged = [...fromObl, ...fromCapa].sort((a, b) =>
          a.fecha.localeCompare(b.fecha),
        )
        setItems(merged)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar el calendario',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const upcoming = useMemo(() => items.slice(0, 40), [items])

  return (
    <div className="carbon-page fase1-page calendario-legal-page">
      <div className="page-header carbon-header">
        <div>
          <p className="carbon-kicker">
            <CalendarDays size={14} />
            Cumplimiento · Calendario
          </p>
          <h1>Calendario legal ambiental</h1>
          <p>
            Fechas clave de obligaciones legales y CAPAs abiertas. Use los
            módulos de detalle para gestionar cada ítem.
          </p>
        </div>
        <div className="hc-header-actions">
          <Link to="/resumen-cumplimiento" className="btn-secondary-link">
            Resumen →
          </Link>
          <Link to="/cumplimiento" className="btn-secondary-link">
            Cumplimiento legal →
          </Link>
        </div>
      </div>

      {loading && (
        <div className="hc-banner" role="status">
          <Loader2 size={16} className="spin" /> Cargando fechas…
        </div>
      )}
      {error && (
        <div className="hc-banner hc-banner-error" role="alert">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {!loading && !error && (
        <section className="carbon-section">
          <h2>Próximos vencimientos</h2>
          {upcoming.length === 0 ? (
            <p className="section-hub-empty">
              No hay fechas de vencimiento registradas todavía.
            </p>
          ) : (
            <div className="calendario-legal-list">
              {upcoming.map((item) => (
                <Link
                  key={item.id}
                  to={item.href}
                  className={`calendario-legal-row riesgo-${item.riesgo}`}
                >
                  <time dateTime={item.fecha}>{formatIsoDate(item.fecha)}</time>
                  <span className="calendario-legal-main">
                    <strong>{item.titulo}</strong>
                    <span>{item.origen}</span>
                  </span>
                  <span className={`fase1-pill fase1-pill--${item.riesgo === 'alto' ? 'danger' : item.riesgo === 'medio' ? 'warn' : 'ok'}`}>
                    {item.riesgo === 'alto'
                      ? 'Urgente'
                      : item.riesgo === 'medio'
                        ? 'Próximo'
                        : 'Programado'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
