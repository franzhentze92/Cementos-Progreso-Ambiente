/**
 * Preferencias del admin: qué documentos del catálogo entran al copiloto.
 * Se guardan en localStorage (solo afectan el navegador del admin / sesión).
 */

const STORAGE_KEY = 'cempro-copilot-disabled-docs'

const MIN_TRAINED_CHARS = 80

export function isKnowledgeDocTrained(charCount: number): boolean {
  return charCount > MIN_TRAINED_CHARS
}

export function loadDisabledKnowledgeDocIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function saveDisabledKnowledgeDocIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

export function setKnowledgeDocEnabled(docId: string, enabled: boolean): Set<string> {
  const next = loadDisabledKnowledgeDocIds()
  if (enabled) next.delete(docId)
  else next.add(docId)
  saveDisabledKnowledgeDocIds(next)
  return next
}

export function isKnowledgeDocEnabled(
  docId: string,
  charCount: number,
  disabledIds?: Set<string>,
): boolean {
  if (!isKnowledgeDocTrained(charCount)) return false
  const disabled = disabledIds ?? loadDisabledKnowledgeDocIds()
  return !disabled.has(docId)
}
