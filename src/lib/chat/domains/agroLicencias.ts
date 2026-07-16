import { loadAgroLicencias } from '../../agroLicenciasApi'
import { countBy, linesOf } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export const loadAgroLicenciasDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadAgroLicencias()
    const byEstado = countBy(rows, (r) => r.estado)
    const bySede = countBy(rows, (r) => r.plantaSede)
    const byCategoria = countBy(rows, (r) => r.categoria)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in90 = new Date(today)
    in90.setDate(in90.getDate() + 90)

    const vencidas = rows.filter((r) => {
      const fin = parseDate(r.vigenciaFin)
      return fin != null && fin < today
    })
    const porVencer = rows.filter((r) => {
      const fin = parseDate(r.vigenciaFin)
      return fin != null && fin >= today && fin <= in90
    })
    const vigentesSinFecha = rows.filter(
      (r) => /vigente/i.test(r.estado) && !parseDate(r.vigenciaFin),
    )

    const fmtRow = (r: (typeof rows)[number]) =>
      `- ${r.plantaSede} | ${r.licencia || '—'} | exp. ${r.expediente || '—'} | cat. ${r.categoria || '—'} | vigencia ${r.vigencia || '—'} (${r.vigenciaInicio || '?'} → ${r.vigenciaFin || '?'}) | ${r.estado}`

    const context = `
DOMINIO: Licencias ambientales Agroprogreso
Tabla Supabase: agro_licencias_ambientales

RESUMEN
- Total licencias: ${rows.length}
- Por estado:
${linesOf(byEstado) || '- Sin datos'}
- Por sede:
${linesOf(bySede) || '- Sin datos'}
- Por categoría:
${linesOf(byCategoria) || '- Sin datos'}

VENCIDAS (vigencia_fin < hoy): ${vencidas.length}
${vencidas.map(fmtRow).join('\n') || '- Ninguna con fecha de fin vencida en el catálogo'}

POR VENCER (próximos 90 días): ${porVencer.length}
${porVencer.map(fmtRow).join('\n') || '- Ninguna por vencer en 90 días según vigencia_fin'}

VIGENTES SIN FECHA DE FIN CLARA: ${vigentesSinFecha.length}
${vigentesSinFecha.map(fmtRow).join('\n') || '- Ninguna'}

CATÁLOGO COMPLETO
${rows.map(fmtRow).join('\n') || '- Sin licencias'}
`.trim()

    return {
      id: 'agroLicencias',
      label: 'Licencias Agro',
      summary: `Licencias · ${rows.length} · vencidas ${vencidas.length} · por vencer (90d) ${porVencer.length}`,
      context,
    }
  }
