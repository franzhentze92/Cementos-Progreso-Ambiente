import type { VercelRequest, VercelResponse } from '@vercel/node'

type ChatTurn = { role: 'user' | 'assistant' | 'system'; content: string }

const SYSTEM_PROMPT = `Eres el Asistente Ambiental CEMPRO. Conversas en español de forma natural, clara y breve.

PRIORIDAD DE FUENTES:
1) CONTEXTO DE DATOS de la plataforma (indicadores, tablas, documentos internos).
2) HISTORIAL de la conversación: si el usuario pide "resúmelo", "explícalo", "optimizar", etc., continúa sobre lo ya hablado.
3) Si la pregunta es de normativa y el dato NO está en el contexto, puedes apoyarte en información pública de internet.
4) Nunca inventes cifras operativas (t, kWh, m³, lbs, NDA, producciones) que no estén en el contexto.

ESTILO:
- Responde como un asistente conversacional, no como un volcado de base de datos.
- Cuando te pidan resumen, da 3–6 bullets o un párrafo corto con lo esencial.
- Cuando te pidan recomendaciones u optimización, usa los datos del contexto y da acciones concretas.
- No copies encabezados técnicos tipo "DOMINIO:" o "Tabla Supabase".

REGLAS:
- No inventes tCO₂e, alcances GHG ni factores de emisión si no aparecen en el contexto.
- Distingue Alicon vs Agroprogreso.
- Para licencias "por vencer" o "vencidas", usa fechas de vigencia del contexto.

REGLAS CRÍTICAS DE MÉTRICAS (huella Alicon):
- Producción de cemento (t) ≠ consumo de clinker (t) ≠ ingreso de clinker (t) ≠ factor clinker (%).
- Si el contexto trae "RANKINGS PRECALCULADOS", úsalos como fuente de verdad.

Puedes sugerir 1 pregunta de seguimiento breve al final.`

const WEB_PROMPT = `Eres el Asistente Ambiental CEMPRO.
Investiga con búsqueda web fuentes oficiales de Guatemala cuando el contexto interno no alcance.
Responde en español, claro y útil. Indica si usas fuentes públicas.
No inventes cifras operativas de la empresa.`

function looksInsufficient(reply: string): boolean {
  const r = reply.toLowerCase()
  return (
    /no (tengo|encuentro|encontré|dispongo).{0,40}(información|dato|contexto|documento)/i.test(
      r,
    ) || /no aparece en el contexto/i.test(r)
  )
}

function wantsLegislation(message: string): boolean {
  return /acuerdo|gubernativo|reglamento|ley|decreto|legislaci|marn/i.test(
    message,
  )
}

function extractResponsesText(data: unknown): string {
  const root = data as {
    output_text?: string
    output?: Array<{
      type?: string
      content?: Array<{ type?: string; text?: string }>
    }>
  }
  if (root.output_text?.trim()) return root.output_text.trim()
  const chunks: string[] = []
  for (const item of root.output ?? []) {
    if (item.type !== 'message') continue
    for (const part of item.content ?? []) {
      if ((part.type === 'output_text' || part.type === 'text') && part.text) {
        chunks.push(part.text)
      }
    }
  }
  return chunks.join('\n').trim()
}

async function withWebSearch(
  message: string,
  context: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        tools: [{ type: 'web_search' }],
        tool_choice: 'auto',
        temperature: 0.2,
        input: [
          { role: 'system', content: WEB_PROMPT },
          {
            role: 'user',
            content: `Pregunta:\n${message}\n\nContexto interno:\n${context.slice(0, 40000)}`,
          },
        ],
      }),
    })
    if (!res.ok) return null
    return extractResponsesText(await res.json()) || null
  } catch (err) {
    console.error('web search', err)
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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

    const body = (req.body ?? {}) as {
      message?: string
      history?: ChatTurn[]
      context?: string
      domainIds?: string[]
    }

    const message = body.message?.trim()
    if (!message) {
      return res.status(400).json({ error: 'Mensaje vacío' })
    }

    const context =
      body.context?.trim() ||
      'No se recibió contexto de datos.'
    const history = Array.isArray(body.history) ? body.history.slice(-8) : []
    const domains = Array.isArray(body.domainIds)
      ? body.domainIds.join(', ')
      : 'todos'

    const messages: ChatTurn[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'system',
        content: `Dominios: ${domains}\n\nCONTEXTO:\n${context.slice(0, 120000)}`,
      },
      ...history.filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string',
      ),
      { role: 'user', content: message },
    ]

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages,
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('OpenAI error', openaiRes.status, errText)
      if (wantsLegislation(message)) {
        const web = await withWebSearch(message, context, apiKey)
        if (web) return res.status(200).json({ reply: web })
      }
      return res.status(502).json({ error: 'Error al consultar el modelo' })
    }

    const data = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    let reply = data.choices?.[0]?.message?.content?.trim()
    if (!reply) {
      return res.status(502).json({ error: 'Respuesta vacía del modelo' })
    }

    if (looksInsufficient(reply) || wantsLegislation(message)) {
      const codeMatch = message.match(
        /(?:acuerdo|gubernativo|reglamento|decreto)[^\d]{0,40}(\d{1,4}[\s\-–]?\d{4})/i,
      )
      const code = codeMatch?.[1]?.replace(/\s+/g, '-')
      const missing =
        looksInsufficient(reply) ||
        (code && !new RegExp(code.replace('-', '[-\\s]?'), 'i').test(context))
      if (missing) {
        const web = await withWebSearch(message, context, apiKey)
        if (web) reply = web
      }
    }

    return res.status(200).json({ reply })
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Error interno del chat',
    })
  }
}
