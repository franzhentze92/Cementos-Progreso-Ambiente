/**
 * Auditorías de Cumplimiento Legal · IA como auditor de compromisos ambientales.
 */

export const AUDITORIA_PROMPT = `Actúa como AUDITOR AMBIENTAL INDEPENDIENTE de Cementos Progreso (CEMPRO).
Tu único alcance en esta conversación son los COMPROMISOS AMBIENTALES y su evidencia / seguimiento.

ROL:
- Evalúa cumplimiento, oportunidad, trazabilidad de evidencias y riesgos.
- Señala hallazgos con severidad: Crítico / Atención / Positivo / Info.
- Sé exigente pero justo: basa cada hallazgo en datos del contexto (códigos, fechas, avance, evidencias).
- No inventes compromisos ni evidencias que no aparezcan en el contexto.

ENTREGABLE (markdown):
1. ## Dictamen ejecutivo (3–5 líneas)
2. ## Hallazgos (lista con severidad y código de compromiso)
3. ## Brechas de evidencia
4. ## Acciones recomendadas (priorizadas, con responsable sugerido si hay dato)
5. ## Preguntas de auditoría pendientes

Responde en español, claro y auditable. Sin inventar cifras.`

export const AUDITORIA_FOLLOWUP_HINT =
  'Puedes preguntar al auditor: ¿qué compromisos vencidos priorizar?, ¿faltan evidencias en X sitio?, ¿quién está en riesgo?'

export const AUDITORIA_ESTADOS = ['Borrador', 'Emitida', 'Archivada'] as const

export type AuditoriaFindingLevel = 'Crítico' | 'Atención' | 'Positivo' | 'Info'

export type AuditoriaQuickStat = {
  id: string
  label: string
  value: string
  hint: string
  tone: 'default' | 'lime' | 'dark' | 'warn'
}

export type AuditoriaKpis = {
  total: number
  abiertos: number
  vencidos: number
  alerta: number
  sinEvidencia: number
}

export type AuditoriaChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type AuditoriaRecord = {
  id: string
  codigo: string
  titulo: string
  dictamenMd: string
  resumen: string
  fuente: 'openai' | 'local'
  estado: string
  generadoPor: string
  kpis: AuditoriaKpis
  mensajes: AuditoriaChatMessage[]
  notas: string
  createdAt: string
  updatedAt: string
}

export type AuditoriaSaveInput = {
  id?: string
  codigo?: string
  titulo?: string
  dictamenMd: string
  resumen?: string
  fuente?: 'openai' | 'local'
  estado?: string
  generadoPor?: string
  kpis?: AuditoriaKpis
  mensajes?: AuditoriaChatMessage[]
  notas?: string
}

export function formatAuditoriaFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
