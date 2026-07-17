import {
  formatIsoDate,
  formatNum,
  type ExpedienteRecord,
} from './expedientes'

export type InsightLevel = 'Crítico' | 'Atención' | 'Positivo'

export type ExpedientesReport = {
  meta: {
    total: number
    vigentes: number
    borradores: number
    obsoletos: number
    conArchivo: number
    ligados: number
  }
  kpis: Array<{
    id: string
    label: string
    value: string
    hint: string
    tone: 'default' | 'warn' | 'ok' | 'dark'
  }>
  byTema: Array<{ name: string; value: number }>
  byTipo: Array<{ name: string; value: number }>
  bySitio: Array<{ name: string; value: number }>
  insights: Array<{ id: string; level: InsightLevel; title: string; text: string }>
  detailRows: ExpedienteRecord[]
}

function countBy(
  rows: ExpedienteRecord[],
  key: (r: ExpedienteRecord) => string,
): Array<{ name: string; value: number }> {
  const map = new Map<string, number>()
  for (const r of rows) {
    const k = key(r) || 'Otro'
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function buildExpedientesReport(
  records: ExpedienteRecord[],
): ExpedientesReport {
  const vigentes = records.filter((r) => /vigente/i.test(r.estado)).length
  const borradores = records.filter((r) => /borrador/i.test(r.estado)).length
  const obsoletos = records.filter((r) => /obsolet/i.test(r.estado)).length
  const conArchivo = records.filter((r) => r.archivoUrl.trim()).length
  const ligados = records.filter(
    (r) => r.moduloLigado.trim() || r.refLigada.trim(),
  ).length

  const insights: ExpedientesReport['insights'] = []
  if (records.length === 0) {
    insights.push({
      id: 'vacio',
      level: 'Atención',
      title: 'Sin expedientes',
      text: 'Cargue resoluciones, estudios, actas y monitores por sitio para armar el repositorio.',
    })
  }
  if (conArchivo < records.length && records.length > 0) {
    insights.push({
      id: 'sin-archivo',
      level: 'Atención',
      title: `${formatNum(records.length - conArchivo)} sin URL de archivo`,
      text: 'Agregue el enlace al documento para que auditoría y el copiloto puedan consultarlo.',
    })
  }
  if (vigentes > 0 && obsoletos === 0) {
    insights.push({
      id: 'ok',
      level: 'Positivo',
      title: `${formatNum(vigentes)} expediente(s) vigente(s)`,
      text: 'El acervo documental está activo y disponible por sitio/tema.',
    })
  }

  return {
    meta: {
      total: records.length,
      vigentes,
      borradores,
      obsoletos,
      conArchivo,
      ligados,
    },
    kpis: [
      {
        id: 'total',
        label: 'Expedientes',
        value: formatNum(records.length),
        hint: `${formatNum(vigentes)} vigentes`,
        tone: 'dark',
      },
      {
        id: 'archivos',
        label: 'Con archivo',
        value: formatNum(conArchivo),
        hint: 'URL / evidencia',
        tone: conArchivo < records.length ? 'warn' : 'ok',
      },
      {
        id: 'ligados',
        label: 'Ligados a módulos',
        value: formatNum(ligados),
        hint: 'Cumplimiento, CAPA, etc.',
        tone: 'default',
      },
      {
        id: 'obs',
        label: 'Obsoletos / borrador',
        value: formatNum(obsoletos + borradores),
        hint: 'Pendientes de depurar',
        tone: obsoletos + borradores > 0 ? 'warn' : 'ok',
      },
    ],
    byTema: countBy(records, (r) => r.tema),
    byTipo: countBy(records, (r) => r.tipoDocumento),
    bySitio: countBy(records, (r) => r.sitio),
    insights,
    detailRows: [...records].sort((a, b) =>
      (b.fechaDocumento ?? '').localeCompare(a.fechaDocumento ?? ''),
    ),
  }
}

export { formatIsoDate }
