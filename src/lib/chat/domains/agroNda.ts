import { loadAgroNdaCascoVerde } from '../../agroNdaCascoVerdeApi'
import { loadAgroNdaGeneral } from '../../agroNdaGeneralApi'
import { countBy, fmt, linesOf } from '../format'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

export const loadAgroNdaDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const [general, casco] = await Promise.all([
      loadAgroNdaGeneral(),
      loadAgroNdaCascoVerde(),
    ])

    const ndaVals = general.filter((r) => r.nda != null).map((r) => r.nda!)
    const avgNda =
      ndaVals.length > 0
        ? ndaVals.reduce((a, b) => a + b, 0) / ndaVals.length
        : null
    const bySedeNda = general
      .filter((r) => r.nda != null)
      .map((r) => ({ key: `${r.fecha} ${r.plantaSede}`, total: r.nda! }))
      .sort((a, b) => b.total - a.total)

    const cascoBySede = countBy(casco, (r) => r.plantaSede)
    const hallazgosCriticos = casco.reduce(
      (s, r) => s + (r.hallazgosCriticos ?? 0),
      0,
    )
    const notas = casco.filter((r) => r.nota != null).map((r) => r.nota!)
    const avgNota =
      notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null

    const genLines = general.slice(0, 30).map(
      (r) =>
        `- ${r.fecha} (sem ${r.semana ?? '—'}) | ${r.plantaSede} | IDA ${fmt(r.notaIda, 1)} | Casco Verde ${fmt(r.cascoVerde, 1)} | Incidentes ${fmt(r.incidentes, 1)} | Compromisos ${fmt(r.compromisos, 1)} | NDA ${fmt(r.nda, 1)}`,
    )
    const cvLines = casco.slice(0, 30).map(
      (r) =>
        `- ${r.fecha} (sem ${r.semana ?? '—'}) | ${r.plantaSede} | insp. #${r.noInspeccion ?? '—'} | ${r.inspector} | nota ${fmt(r.nota, 1)} | hallazgos críticos ${r.hallazgosCriticos ?? 0}`,
    )

    const context = `
DOMINIO: NDA (Nota de Desempeño Ambiental) Agroprogreso
Tablas Supabase: agro_nda_general, agro_nda_casco_verde

NDA GENERAL
- Registros: ${general.length}
- NDA promedio: ${fmt(avgNda, 2)}
- Ranking NDA (más alto primero):
${linesOf(bySedeNda, { digits: 2, limit: 20 }) || '- Sin datos'}

Detalle NDA general:
${genLines.join('\n') || '- Sin datos NDA general'}

CASCO VERDE (inspecciones NDA)
- Registros: ${casco.length}
- Nota promedio: ${fmt(avgNota, 2)}
- Hallazgos críticos totales: ${hallazgosCriticos}
- Por sede:
${linesOf(cascoBySede) || '- Sin datos'}

Detalle Casco Verde:
${cvLines.join('\n') || '- Sin datos Casco Verde'}
`.trim()

    return {
      id: 'agroNda',
      label: 'NDA Agro',
      summary: `NDA · promedio ${fmt(avgNda, 1)} · Casco Verde ${casco.length} insp.`,
      context,
    }
  }
