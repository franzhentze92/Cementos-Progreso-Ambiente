import { loadAgroLicencias } from '../../agroLicenciasApi'
import { countBy, linesOf } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadAgroLicenciasDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadAgroLicencias()
    const byEstado = countBy(rows, (r) => r.estado)
    const bySede = countBy(rows, (r) => r.plantaSede)
    const byCategoria = countBy(rows, (r) => r.categoria)

    const sample = rows.map(
      (r) =>
        `- ${r.plantaSede} | ${r.licencia || '—'} | exp. ${r.expediente || '—'} | cat. ${r.categoria || '—'} | vigencia ${r.vigencia || '—'} (${r.vigenciaInicio || '?'} → ${r.vigenciaFin || '?'}) | ${r.estado}`,
    )

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

CATÁLOGO COMPLETO
${sample.join('\n') || '- Sin licencias'}
`.trim()

    return {
      id: 'agroLicencias',
      label: 'Licencias Agro',
      summary: `Licencias · ${rows.length} · ${byEstado.map((e) => `${e.key}:${e.count}`).join(', ')}`,
      context,
    }
  }
