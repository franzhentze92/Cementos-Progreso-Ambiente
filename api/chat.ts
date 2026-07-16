import type { VercelRequest, VercelResponse } from '@vercel/node'

type ChatTurn = { role: 'user' | 'assistant' | 'system'; content: string }

const SYSTEM_PROMPT = `Eres el Asistente Ambiental / copiloto de Cementos Progreso (CEMPRO).
Tu mundo es la empresa: Planta Alicón, Agroprogreso (fincas) y los datos/documentos de esta plataforma.
TODO gira alrededor de Cementos Progreso. No eres un asistente genérico de Guatemala.

PRIORIDAD OBLIGATORIA DE FUENTES:
1) CONTEXTO DE DATOS de la plataforma (operaciones, huella Alicon, Agroprogreso, licencias, NDA, documentos internos).
2) HISTORIAL de la conversación.
3) Internet SOLO si el usuario lo autorizó explícitamente en este hilo (p. ej. "sí, busca en internet", "sí por favor", "búscala").

REGLAS DURAS:
- Si preguntan por consumo de energía, electricidad, agua, producción, residuos, monitoreos, etc., asume que hablan de LA EMPRESA (Alicon / Agroprogreso), nunca del país, a menos que digan "Guatemala" o "nacional".
- NUNCA respondas con estadísticas nacionales, demográficas o sectoriales del país cuando la pregunta sea operativa de la empresa.
- Si el dato no está en el contexto: dilo con claridad, indica qué sí tienes (Alicon vs Agro), y pregunta: "¿Quieres que busque información pública en internet?"
- NO busques ni inventes datos de internet por tu cuenta.
- No inventes cifras (t, kWh, MWh, m³, lbs, NDA, producciones, tCO₂e).
- Distingue Alicon vs Agroprogreso. Si piden Agro y solo hay dato de Alicon (o al revés), dilo.
- Electricidad/energía operativa de la planta está en el monitoreo/huella Alicon (kWh, MWh, kWh/t). Agroprogreso puede no tener ese módulo.

ESTILO:
- Conversacional, claro y breve.
- Resúmenes en 3–6 bullets cuando pidan resumen.
- Sin encabezados técnicos tipo "DOMINIO:" o "Tabla Supabase".

MÉTRICAS ALICON:
- Producción de cemento (t) ≠ clinker consumo (t) ≠ clinker ingreso (t) ≠ factor clinker (%).
- Si hay "RANKINGS PRECALCULADOS", úsalos.

Puedes sugerir 1 pregunta de seguimiento breve al final.`

const WEB_PROMPT = `Eres el Asistente Ambiental de Cementos Progreso (CEMPRO).
El usuario AUTORIZÓ buscar en internet porque no había dato interno suficiente.
Responde en español, útil y breve. Prioriza fuentes oficiales (MARN, etc.) cuando aplique.
Deja claro que es información pública de internet, no un dato operativo de la plataforma.
No inventes cifras operativas de Alicon/Agroprogreso.`

function userAuthorizedWebSearch(
  message: string,
  history: ChatTurn[],
): boolean {
  const msg = message.toLowerCase().trim()

  // Pedido directo de buscar
  if (
    /busca(r|me|lo|la)?\s+(en\s+)?(internet|la\s+web|google|en\s+l[ií]nea)/i.test(
      msg,
    ) ||
    /investiga(r|lo|la)?\s+(en\s+)?(internet|la\s+web)/i.test(msg) ||
    /consulta(r)?\s+(fuentes|internet|la\s+web)/i.test(msg)
  ) {
    return true
  }

  // Confirmación corta tras ofrecimiento del bot
  const lastAssistant = [...history]
    .reverse()
    .find((h) => h.role === 'assistant')?.content
  if (!lastAssistant) return false

  const offered = /busca(r)?\s+(información\s+)?(pública\s+)?en\s+internet|quieres que busque|¿quieres que busque|autoriz/i.test(
    lastAssistant,
  )
  if (!offered) return false

  return /^(sí|si|dale|ok|okay|claro|por favor|sí por favor|si por favor|de acuerdo|adelante|busca|búscala|buscalo|búscalo|hazlo)([.!?\s]|$)/i.test(
    msg,
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
  history: ChatTurn[],
  apiKey: string,
): Promise<string | null> {
  try {
    const prior = history
      .slice(-4)
      .map((h) => `${h.role}: ${h.content}`)
      .join('\n')
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
            content:
              `Historial reciente:\n${prior || '(vacío)'}\n\n` +
              `Pedido actual:\n${message}\n\n` +
              `Contexto interno (referencia; no inventes operaciones):\n${context.slice(0, 30000)}`,
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

    const context = body.context?.trim() || 'No se recibió contexto de datos.'
    const history = Array.isArray(body.history) ? body.history.slice(-8) : []
    const domains = Array.isArray(body.domainIds)
      ? body.domainIds.join(', ')
      : 'empresa'

    // Internet solo con autorización explícita del usuario
    if (userAuthorizedWebSearch(message, history)) {
      const web = await withWebSearch(message, context, history, apiKey)
      if (web) {
        return res.status(200).json({ reply: web, usedWebSearch: true })
      }
      return res.status(200).json({
        reply:
          'Intenté buscar en internet, pero no obtuve un resultado útil. ¿Quieres reformular la pregunta o revisar otro indicador de la plataforma?',
      })
    }

    const messages: ChatTurn[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'system',
        content: `Unidades/dominios activos: ${domains}\n\nCONTEXTO DE LA EMPRESA:\n${context.slice(0, 120000)}`,
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
        temperature: 0.25,
        messages,
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('OpenAI error', openaiRes.status, errText)
      return res.status(502).json({ error: 'Error al consultar el modelo' })
    }

    const data = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const reply = data.choices?.[0]?.message?.content?.trim()
    if (!reply) {
      return res.status(502).json({ error: 'Respuesta vacía del modelo' })
    }

    return res.status(200).json({ reply })
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Error interno del chat',
    })
  }
}
