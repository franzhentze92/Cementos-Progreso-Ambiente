/**
 * Lógica compartida para el plugin de Vite (local).
 * Producción usa api/chat.ts (misma política CEMPRO-first).
 */
export type ChatTurn = { role: 'user' | 'assistant' | 'system'; content: string }

export const CHAT_SYSTEM_PROMPT = `Eres el Asistente Ambiental / copiloto de Cementos Progreso (CEMPRO).
Tu mundo es la empresa: Planta Alicón, Agroprogreso (fincas) y los datos/documentos de esta plataforma.
TODO gira alrededor de Cementos Progreso. No eres un asistente genérico de Guatemala.

PRIORIDAD OBLIGATORIA:
1) CONTEXTO DE DATOS de la plataforma (Alicon, Agroprogreso, licencias, NDA, documentos).
2) HISTORIAL de la conversación.
3) Internet SOLO si el usuario lo autorizó (ej. "sí, busca en internet").

REGLAS:
- Consumo de energía/electricidad/agua/producción/residuos = LA EMPRESA, no Guatemala (salvo que digan "Guatemala" o "nacional").
- Si no hay dato: dilo, indica qué sí tienes (Alicon vs Agro) y pregunta: "¿Quieres que busque información pública en internet?"
- No inventes cifras. Distingue Alicon vs Agroprogreso.
- Conversacional y breve. Sin encabezados técnicos "DOMINIO:" / "Tabla Supabase".`

export type OpenAIChatInput = {
  message: string
  history?: ChatTurn[]
  context?: string
  domainIds?: string[]
  apiKey: string
}

export type OpenAIChatResult =
  | { ok: true; reply: string; usedWebSearch?: boolean }
  | { ok: false; status: number; error: string }

function userAuthorizedWebSearch(message: string, history: ChatTurn[]): boolean {
  const msg = message.toLowerCase().trim()
  if (
    /busca(r|me|lo|la)?\s+(en\s+)?(internet|la\s+web|google)/i.test(msg) ||
    /investiga(r|lo|la)?\s+(en\s+)?(internet|la\s+web)/i.test(msg)
  ) {
    return true
  }
  const lastAssistant = [...history]
    .reverse()
    .find((h) => h.role === 'assistant')?.content
  if (!lastAssistant) return false
  const offered = /busca(r)?\s+(información\s+)?(pública\s+)?en\s+internet|quieres que busque/i.test(
    lastAssistant,
  )
  if (!offered) return false
  return /^(sí|si|dale|ok|claro|por favor|de acuerdo|adelante|busca|búscala|búscalo|hazlo)([.!?\s]|$)/i.test(
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

export async function completeEnvironmentalChat(
  input: OpenAIChatInput,
): Promise<OpenAIChatResult> {
  const message = input.message.trim()
  if (!message) return { ok: false, status: 400, error: 'Mensaje vacío' }

  const context =
    input.context?.trim() || 'No se recibió contexto de datos.'
  const history = Array.isArray(input.history) ? input.history.slice(-8) : []
  const domains = Array.isArray(input.domainIds)
    ? input.domainIds.join(', ')
    : 'empresa'

  if (userAuthorizedWebSearch(message, history)) {
    try {
      const prior = history
        .slice(-4)
        .map((h) => `${h.role}: ${h.content}`)
        .join('\n')
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          tools: [{ type: 'web_search' }],
          tool_choice: 'auto',
          temperature: 0.2,
          input: [
            {
              role: 'system',
              content:
                'Asistente CEMPRO. El usuario autorizó internet. Sé breve, cita que es fuente pública. No inventes datos operativos de la empresa.',
            },
            {
              role: 'user',
              content: `${prior}\n\nPedido: ${message}\n\nContexto interno:\n${context.slice(0, 30000)}`,
            },
          ],
        }),
      })
      if (res.ok) {
        const reply = extractResponsesText(await res.json())
        if (reply) return { ok: true, reply, usedWebSearch: true }
      }
    } catch (err) {
      console.error(err)
    }
    return {
      ok: true,
      reply:
        'Intenté buscar en internet, pero no obtuve un resultado útil. ¿Quieres reformular la pregunta?',
    }
  }

  const messages: ChatTurn[] = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    {
      role: 'system',
      content: `Dominios: ${domains}\n\nCONTEXTO DE LA EMPRESA:\n${context.slice(0, 350000)}`,
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
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.25,
      messages,
    }),
  })

  if (!openaiRes.ok) {
    console.error('OpenAI error', openaiRes.status, await openaiRes.text())
    return { ok: false, status: 502, error: 'Error al consultar el modelo de IA' }
  }

  const data = (await openaiRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const reply = data.choices?.[0]?.message?.content?.trim()
  if (!reply) {
    return { ok: false, status: 502, error: 'Respuesta vacía del modelo' }
  }
  return { ok: true, reply }
}
