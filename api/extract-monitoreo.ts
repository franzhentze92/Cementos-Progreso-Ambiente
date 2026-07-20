import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractMonitoreoFromText } from './extractMonitoreoLogic'

function readEnv(name: string): string | undefined {
  const env = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env
  const value = env?.[name]
  return typeof value === 'string' && value.trim() ? value : undefined
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
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

  const body = req.body as { text?: string; fileName?: string }
  const text = typeof body?.text === 'string' ? body.text : ''
  const fileName =
    typeof body?.fileName === 'string' ? body.fileName : undefined

  const result = await extractMonitoreoFromText({ text, fileName, apiKey })
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.status(200).json({ data: result.data })
}
