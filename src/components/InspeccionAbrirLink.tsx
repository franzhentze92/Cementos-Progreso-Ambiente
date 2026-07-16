import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  isInspeccionCampoDetailPath,
  inspeccionCampoDetailPath,
} from '../data/inspeccionesCampo'
import { findInspeccionCampoId } from '../lib/inspeccionesCampoApi'

type Props = {
  link?: string | null
  fecha?: string
  plantaSede?: string
  unidadNegocio?: string
  className?: string
  title?: string
}

/** Botón Abrir: abre el informe interno de la plataforma. */
export function InspeccionAbrirLink({
  link,
  fecha,
  plantaSede,
  unidadNegocio,
  className = 'btn-secondary-link',
  title = 'Abrir informe de inspección',
}: Props) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const directHref =
    link && isInspeccionCampoDetailPath(link) ? link.trim() : null

  if (directHref) {
    return (
      <Link to={directHref} className={className} title={title}>
        Abrir
      </Link>
    )
  }

  const canResolve = Boolean(fecha && plantaSede && unidadNegocio)

  if (!canResolve && !link?.trim()) {
    return <span>—</span>
  }

  async function openInforme() {
    if (busy) return
    setBusy(true)
    try {
      if (fecha && plantaSede && unidadNegocio) {
        const id = await findInspeccionCampoId({
          fecha,
          plantaSede,
          unidadNegocio,
        })
        if (id) {
          navigate(inspeccionCampoDetailPath(id))
          return
        }
      }
      if (link?.trim()) {
        window.open(link.trim(), '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      console.warn('[inspeccion abrir]', err)
      if (link?.trim()) {
        window.open(link.trim(), '_blank', 'noopener,noreferrer')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={className}
      title={title}
      disabled={busy}
      onClick={() => void openInforme()}
    >
      {busy ? '…' : 'Abrir'}
    </button>
  )
}
