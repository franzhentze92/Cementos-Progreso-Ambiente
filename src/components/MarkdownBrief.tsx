import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }

const SEVERITY_PILL: Record<string, string> = {
  Crítico: 'fase1-pill fase1-pill--danger',
  Critico: 'fase1-pill fase1-pill--danger',
  Atención: 'fase1-pill fase1-pill--warn',
  Atencion: 'fase1-pill fase1-pill--warn',
  Positivo: 'fase1-pill fase1-pill--ok',
  Info: 'fase1-pill fase1-pill--info',
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').trim().split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      i += 1
      continue
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed)
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3
      blocks.push({
        type: (`h${level}` as 'h1' | 'h2' | 'h3'),
        text: heading[2].trim(),
      })
      i += 1
      continue
    }

    const listMatch = /^(\d+[.)]|[-*+])\s+(.+)$/.exec(trimmed)
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1])
      const items: string[] = []
      while (i < lines.length) {
        const itemLine = lines[i].trim()
        if (!itemLine) break
        const itemMatch = ordered
          ? /^\d+[.)]\s+(.+)$/.exec(itemLine)
          : /^[-*+]\s+(.+)$/.exec(itemLine)
        if (!itemMatch) break
        items.push(itemMatch[1].trim())
        i += 1
      }
      blocks.push({ type: ordered ? 'ol' : 'ul', items })
      continue
    }

    const paraParts: string[] = [trimmed]
    i += 1
    while (i < lines.length) {
      const next = lines[i].trim()
      if (!next) break
      if (/^#{1,3}\s+/.test(next)) break
      if (/^(\d+[.)]|[-*+])\s+/.test(next)) break
      paraParts.push(next)
      i += 1
    }
    blocks.push({ type: 'p', text: paraParts.join(' ') })
  }

  return blocks
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // Captures: **bold**, [Severity], `code`, /module-path
  const pattern =
    /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)]+\)|\[(?:Cr[ií]tico|Atenci[oó]n|Positivo|Info)\]|\/[a-z][\w/-]*)/gi

  let last = 0
  let match: RegExpExecArray | null
  let idx = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t${idx++}`}>
          {text.slice(last, match.index)}
        </Fragment>,
      )
    }

    const token = match[0]

    if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      const inner = token.slice(2, -2)
      nodes.push(
        <strong key={`${keyPrefix}-b${idx++}`}>
          {renderInline(inner, `${keyPrefix}-bi${idx}`)}
        </strong>,
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code key={`${keyPrefix}-c${idx++}`} className="md-brief__code">
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (linkMatch) {
        const [, label, href] = linkMatch
        if (href.startsWith('/')) {
          nodes.push(
            <Link key={`${keyPrefix}-l${idx++}`} to={href} className="fase1-inline-link">
              {label}
            </Link>,
          )
        } else {
          nodes.push(
            <a
              key={`${keyPrefix}-a${idx++}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="fase1-inline-link"
            >
              {label}
            </a>,
          )
        }
      }
    } else if (token.startsWith('[') && token.endsWith(']')) {
      const label = token.slice(1, -1)
      const pillClass = SEVERITY_PILL[label]
      if (pillClass) {
        nodes.push(
          <span key={`${keyPrefix}-p${idx++}`} className={pillClass}>
            {label}
          </span>,
        )
      } else {
        nodes.push(
          <Fragment key={`${keyPrefix}-t${idx++}`}>{token}</Fragment>,
        )
      }
    } else if (token.startsWith('/')) {
      nodes.push(
        <Link
          key={`${keyPrefix}-m${idx++}`}
          to={token}
          className="fase1-inline-link md-brief__module"
        >
          {token}
        </Link>,
      )
    } else {
      nodes.push(
        <Fragment key={`${keyPrefix}-t${idx++}`}>{token}</Fragment>,
      )
    }

    last = match.index + token.length
  }

  if (last < text.length) {
    nodes.push(
      <Fragment key={`${keyPrefix}-t${idx++}`}>{text.slice(last)}</Fragment>,
    )
  }

  return nodes
}

type Props = {
  markdown: string
  className?: string
}

export function MarkdownBrief({ markdown, className }: Props) {
  const blocks = parseBlocks(markdown)

  if (!blocks.length) return null

  return (
    <div className={`md-brief${className ? ` ${className}` : ''}`}>
      {blocks.map((block, i) => {
        if (block.type === 'h1') {
          return (
            <h3 key={i} className="md-brief__h1">
              {renderInline(block.text, `h1-${i}`)}
            </h3>
          )
        }
        if (block.type === 'h2') {
          return (
            <h4 key={i} className="md-brief__h2">
              {renderInline(block.text, `h2-${i}`)}
            </h4>
          )
        }
        if (block.type === 'h3') {
          return (
            <h5 key={i} className="md-brief__h3">
              {renderInline(block.text, `h3-${i}`)}
            </h5>
          )
        }
        if (block.type === 'ol' || block.type === 'ul') {
          const ListTag = block.type
          return (
            <ListTag key={i} className={`md-brief__${block.type}`}>
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item, `li-${i}-${j}`)}</li>
              ))}
            </ListTag>
          )
        }
        if (block.type === 'p') {
          return (
            <p key={i} className="md-brief__p">
              {renderInline(block.text, `p-${i}`)}
            </p>
          )
        }
        return null
      })}
    </div>
  )
}
