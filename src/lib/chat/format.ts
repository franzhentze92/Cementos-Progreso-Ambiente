/** Utilidades compartidas para armar contexto del copiloto. */

export function fmt(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('es-GT', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

export function countBy<T>(
  items: T[],
  key: (item: T) => string,
): Array<{ key: string; count: number }> {
  const map = new Map<string, number>()
  for (const item of items) {
    const k = key(item) || '(sin dato)'
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([k, count]) => ({ key: k, count }))
    .sort((a, b) => b.count - a.count)
}

export function sumBy<T>(
  items: T[],
  key: (item: T) => string,
  value: (item: T) => number,
): Array<{ key: string; total: number }> {
  const map = new Map<string, number>()
  for (const item of items) {
    const k = key(item) || '(sin dato)'
    map.set(k, (map.get(k) ?? 0) + value(item))
  }
  return [...map.entries()]
    .map(([k, total]) => ({ key: k, total }))
    .sort((a, b) => b.total - a.total)
}

export function linesOf(
  rows: Array<{ key: string; count?: number; total?: number }>,
  opts?: { unit?: string; digits?: number; limit?: number },
): string {
  const limit = opts?.limit ?? 20
  const digits = opts?.digits ?? 1
  const unit = opts?.unit ? ` ${opts.unit}` : ''
  return rows
    .slice(0, limit)
    .map((r) => {
      if (r.total != null) return `- ${r.key}: ${fmt(r.total, digits)}${unit}`
      return `- ${r.key}: ${r.count ?? 0}`
    })
    .join('\n')
}

export function monthKey(fecha: string): string {
  if (!fecha || fecha.length < 7) return '(sin fecha)'
  return fecha.slice(0, 7)
}
