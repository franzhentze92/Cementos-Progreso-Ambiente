import { loadAgroMonitoreos } from '../../agroMonitoreosApi'
import { countBy, fmt, linesOf } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadAgroMonitoreosDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const rows = await loadAgroMonitoreos()
    const byCumple = countBy(rows, (r) => r.cumple)
    const bySede = countBy(rows, (r) => r.plantaSede)
    const byParam = countBy(rows, (r) => r.parametro)
    const byTipoAgua = countBy(rows, (r) => r.tipoAgua)
    const noCumple = rows.filter((r) => /^no/i.test(r.cumple.trim())).length

    const sample = rows.slice(0, 40).map(
      (r) =>
        `- ${r.fecha} | ${r.plantaSede} | ${r.puntoMuestreo} | ${r.tipoAgua} | ${r.parametro}: ${fmt(r.resultado, 3)} ${r.unidad} (límite ${r.limitePermisible || '—'}) | cumple ${r.cumple}`,
    )

    const context = `
DOMINIO: Monitoreos ambientales de agua Agroprogreso
Tabla Supabase: agro_monitoreos_ambientales

RESUMEN
- Total mediciones: ${rows.length}
- No cumplen límite: ${noCumple}
- Por cumplimiento:
${linesOf(byCumple) || '- Sin datos'}
- Por sede:
${linesOf(bySede) || '- Sin datos'}
- Por tipo de agua:
${linesOf(byTipoAgua) || '- Sin datos'}
- Por parámetro:
${linesOf(byParam) || '- Sin datos'}

DETALLE
${sample.join('\n') || '- Sin monitoreos'}
`.trim()

    return {
      id: 'agroMonitoreos',
      label: 'Monitoreos Agro',
      summary: `Agro monitoreos · ${rows.length} mediciones · ${noCumple} fuera de límite`,
      context,
    }
  }
