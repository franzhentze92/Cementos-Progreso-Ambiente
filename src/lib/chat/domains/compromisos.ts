import {
  formatNum,
  riskForCompromiso,
  type CompromisoRecord,
} from '../../../data/compromisosAmbientales'
import {
  loadCompromisos,
  loadEvidencias,
} from '../../compromisosAmbientalesApi'
import type { ChatDomainLoader, ChatDomainSnapshot } from '../types'

function lineOf(c: CompromisoRecord, evidencias: number): string {
  const risk = riskForCompromiso(c)
  return `- ${c.codigo || '—'} | ${c.titulo.slice(0, 70)} | sitio ${c.sitio || '—'} | estado ${c.estado} | avance ${formatNum(c.porcentajeAvance, 0)}% | vence ${c.fechaVencimiento || '—'} | resp. ${c.responsablePrincipal || '—'} | criticidad ${c.criticidad || '—'} | riesgo ${risk} | evidencias ${evidencias}`
}

export const loadCompromisosDomain: ChatDomainLoader =
  async (): Promise<ChatDomainSnapshot> => {
    const [rows, evidencias] = await Promise.all([
      loadCompromisos(),
      loadEvidencias().catch(() => []),
    ])

    const evidByComp = new Map<string, number>()
    for (const e of evidencias) {
      evidByComp.set(e.compromisoId, (evidByComp.get(e.compromisoId) ?? 0) + 1)
    }

    let abiertos = 0
    let vencidos = 0
    let criticos = 0
    let sinEvidencia = 0
    let avanceSum = 0

    for (const c of rows) {
      const risk = riskForCompromiso(c)
      if (risk !== 'cerrado' && risk !== 'suspendido') abiertos += 1
      if (risk === 'vencido') vencidos += 1
      if (risk === 'critico' || risk === 'atencion') criticos += 1
      if ((evidByComp.get(c.id) ?? 0) === 0 && risk !== 'cerrado') {
        sinEvidencia += 1
      }
      avanceSum += c.porcentajeAvance ?? 0
    }

    const avanceProm = rows.length
      ? Math.round(avanceSum / rows.length)
      : null

    const context = `
DOMINIO: Compromisos ambientales (auditoría)
Tablas Supabase: compromisos_ambientales, compromisos_evidencias

RESUMEN AUDITABLE
- Total compromisos: ${rows.length}
- Abiertos: ${abiertos}
- Vencidos: ${vencidos}
- En alerta / críticos: ${criticos}
- Sin evidencia registrada (abiertos): ${sinEvidencia}
- Avance promedio: ${avanceProm == null ? '—' : `${avanceProm}%`}
- Evidencias totales: ${evidencias.length}

PORTAFOLIO (hasta 60)
${
  rows
    .slice(0, 60)
    .map((c) => lineOf(c, evidByComp.get(c.id) ?? 0))
    .join('\n') || '- Sin compromisos'
}

EVIDENCIAS RECIENTES (hasta 25)
${
  evidencias
    .slice(0, 25)
    .map(
      (e) =>
        `- ${e.titulo.slice(0, 60)} | compromiso ${e.compromisoId.slice(0, 8)}… | tipo ${e.tipoEvidencia || '—'} | revisión ${e.estadoRevision || '—'} | ${e.fechaCumplimiento || e.createdAt || '—'}`,
    )
    .join('\n') || '- Sin evidencias'
}
`.trim()

    return {
      id: 'compromisos',
      label: 'Compromisos ambientales',
      summary: `Compromisos · ${rows.length} · abiertos ${abiertos} · vencidos ${vencidos} · sin evidencia ${sinEvidencia}`,
      context,
    }
  }
