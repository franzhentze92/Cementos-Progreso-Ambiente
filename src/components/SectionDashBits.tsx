import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import type { SectionKpi } from '../lib/sectionSummariesApi'

const KPI_TONE: Record<string, string> = {
  default: '',
  lime: 'lime',
  dark: 'dark',
  warn: 'warn',
}

export function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('es-GT', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

export const dashTooltip = {
  borderRadius: 10,
  border: '1px solid #e2e5e8',
  fontSize: 13,
}

export function EmptyPanel({ text, to }: { text: string; to: string }) {
  return (
    <div className="dash-empty">
      <p>{text}</p>
      <Link to={to} className="btn-secondary-link">
        Abrir módulo →
      </Link>
    </div>
  )
}

export function SectionKpiGrid({
  kpis,
  iconFor,
}: {
  kpis: SectionKpi[]
  iconFor: (id: string) => LucideIcon
}) {
  return (
    <div className="dash-kpi-grid dash-kpi-grid-dynamic">
      {kpis.map((kpi) => {
        const Icon = iconFor(kpi.id)
        const body = (
          <>
            <div className="dash-kpi-icon">
              <Icon size={18} />
            </div>
            <div>
              <span>{kpi.label}</span>
              <strong>
                {kpi.value}
                {kpi.unit ? (
                  <em className="dash-kpi-unit"> {kpi.unit}</em>
                ) : null}
              </strong>
              <small>{kpi.hint}</small>
            </div>
          </>
        )
        const cls = `dash-kpi ${KPI_TONE[kpi.tone] ?? ''}`.trim()
        return (
          <Link key={kpi.id} to={kpi.href} className={`${cls} dash-kpi-link`}>
            {body}
          </Link>
        )
      })}
    </div>
  )
}
