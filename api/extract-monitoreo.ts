import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractMonitoreoFromText } from './extractMonitoreoLogic'

export const config = {
  maxDuration: 60,
}

function readEnv(name: string): string | undefined {
  const env = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env
  const value = env?.[name]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function parseBody(req: VercelRequest): { text?: string; fileName?: string } {
  const raw = req.body
  if (raw == null) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as { text?: string; fileName?: string }
    } catch {
      return {}
    }
  }
  if (typeof raw === 'object') {
    return raw as { text?: string; fileName?: string }
  }
  return {}
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const apiKey = readEnv('OPENAI_API_KEY')
    if (!apiKey) {
      res.status(503).json({ error: 'OPENAI_API_KEY no configurada' })
      return
    }

    const body = parseBody(req)
    const text = typeof body.text === 'string' ? body.text : ''
    const fileName =
      typeof body.fileName === 'string' ? body.fileName : undefined

    const result = await extractMonitoreoFromText({ text, fileName, apiKey })
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    res.status(200).json({ data: result.data })
  } catch (err) {
    console.error('[extract-monitoreo]', err)
    const message =
      err instanceof Error ? err.message : 'Error interno al extraer el informe'
    // Siempre JSON para que el cliente no falle con "Unexpected token"
    res.status(500).json({
      error:
        message.length > 180
          ? 'Error interno al extraer el informe. Intenta de nuevo o usa un PDF más corto.'
          : message,
    })
  }
}
