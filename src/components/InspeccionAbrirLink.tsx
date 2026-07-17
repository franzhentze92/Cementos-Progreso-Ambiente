import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  inspeccionCampoDetailPath,
  inspeccionCampoIdFromLink,
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

/**
 * Abre el informe de inspección DENTRO de la plataforma (misma pestaña).
 * Nunca usa target=_blank ni URLs externas para el informe.
 */
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
  const [error, setError] = useState<string | null>(null)

  async function openInforme() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const fromLink = link ? inspeccionCampoIdFromLink(link) : null
      if (fromLink) {
        navigate(
          inspeccionCampoDetailPath(fromLink, {
            plantaSede,
            unidadNegocio,
          }),
        )
        return
      }

      if (fecha && plantaSede && unidadNegocio) {
        const id = await findInspeccionCampoId({
          fecha,
          plantaSede,
          unidadNegocio,
        })
        if (id) {
          navigate(
            inspeccionCampoDetailPath(id, {
              plantaSede,
              unidadNegocio,
            }),
          )
          return
        }
      }

      setError('Sin informe de campo')
    } catch (err) {
      console.warn('[inspeccion abrir]', err)
      setError('No se pudo abrir')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={className}
      title={error ?? title}
      disabled={busy}
      onClick={() => void openInforme()}
    >
      {busy ? '…' : error ? '—' : 'Abrir'}
    </button>
  )
}
