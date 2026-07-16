import type { VercelRequest, VercelResponse } from '@vercel/node'
import { completeEnvironmentalChat } from './openaiReply'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      error: 'OPENAI_API_KEY no configurada en el servidor',
    })
  }

  try {
    const body = (req.body ?? {}) as {
      message?: string
      history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
      context?: string
      domainIds?: string[]
    }

    const result = await completeEnvironmentalChat({
      message: body.message ?? '',
      history: body.history,
      context: body.context,
      domainIds: body.domainIds,
      apiKey,
    })

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }

    return res.status(200).json({ reply: result.reply })
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Error interno del chat',
    })
  }
}
