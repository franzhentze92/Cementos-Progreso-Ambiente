export type ChatTurn = { role: 'user' | 'assistant' | 'system'; content: string }

export const CHAT_SYSTEM_PROMPT = `Eres el Asistente Ambiental CEMPRO, un copiloto de datos ambientales.
Respondes siempre en español, claro y conciso.

PRIORIDAD DE FUENTES:
1) CONTEXTO DE DATOS de la plataforma (indicadores, tablas, documentos internos).
2) Si la pregunta es de normativa/legislación y el dato NO está en el contexto, puedes apoyarte en información pública de internet (cuando esté habilitada la búsqueda web).
3) Nunca inventes cifras operativas (t, kWh, m³, lbs, NDA, producciones) que no estén en el contexto.

REGLAS:
- No inventes tCO₂e, alcances GHG ni factores de emisión si no aparecen en el contexto.
- No inventes artículos de ley: si usas internet, resume con cautela y menciona que proviene de fuentes públicas.
- Distingue Alicon vs Agroprogreso.
- Para preguntas legales, prioriza el dominio Documentos / legislación del contexto.
- Si realmente no hay información suficiente ni en contexto ni en web, dilo con claridad y ofrece alternativas.

REGLAS CRÍTICAS DE MÉTRICAS (huella Alicon):
- Producción de cemento (t) ≠ consumo de clinker (t) ≠ ingreso de clinker (t) ≠ factor clinker (%).
- Si preguntan "mayor/menor consumo de clinker", responde con toneladas de "clinker consumo".
- Si el contexto trae "RANKINGS PRECALCULADOS", úsalos como fuente de verdad.
- Al citar un mes, menciona la métrica pedida con su unidad correcta.

Puedes sugerir 1 pregunta de seguimiento breve al final.`

const WEB_FALLBACK_PROMPT = `Eres el Asistente Ambiental CEMPRO.
El usuario preguntó algo que no estaba (o no estaba completo) en los documentos internos.
Investiga con búsqueda web fuentes oficiales o confiables de Guatemala (MARN, Diario de Centro América, etc.) cuando aplique.
Responde en español, claro y útil.
Si usas internet, indica brevemente que es información de fuentes públicas.
No inventes cifras operativas de la empresa.`

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

function looksInsufficient(reply: string): boolean {
  const r = reply.toLowerCase()
  return (
    /no (tengo|encuentro|encontré|dispongo).{0,40}(información|dato|contexto|documento)/i.test(
      r,
    ) ||
    /no aparece en el contexto/i.test(r) ||
    /no (est[aá]|se encuentra) en (el |los )?(contexto|documentos|fuentes)/i.test(
      r,
    ) ||
    /fuera de (mi|el) (contexto|alcance|conocimiento)/i.test(r) ||
    /no (puedo|pude) (responder|ayudar).{0,30}(falta|sin).{0,20}(información|contexto)/i.test(
      r,
    )
  )
}

function wantsLegislationLookup(message: string): boolean {
  return /acuerdo|gubernativo|reglamento|ley|decreto|legislaci|marn|norma|instrumento ambiental/i.test(
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
      if (part.type === 'output_text' && part.text) chunks.push(part.text)
      if (part.type === 'text' && part.text) chunks.push(part.text)
    }
  }
  return chunks.join('\n').trim()
}

/** Segunda pasada: Responses API + web_search. */
async function answerWithWebSearch(input: {
  message: string
  context: string
  apiKey: string
}): Promise<OpenAIChatResult> {
  const models = ['gpt-4o-mini', 'gpt-4o']
  let lastError = 'No se pudo usar búsqueda web'

  for (const model of models) {
    try {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          tools: [{ type: 'web_search' }],
          tool_choice: 'auto',
          temperature: 0.2,
          input: [
            { role: 'system', content: WEB_FALLBACK_PROMPT },
            {
              role: 'user',
              content:
                `Pregunta del usuario:\n${input.message}\n\n` +
                `Contexto interno disponible (puede estar incompleto; úsalo si aporta):\n` +
                `${input.context.slice(0, 40000)}`,
            },
          ],
        }),
      })

      if (!res.ok) {
        lastError = await res.text()
        console.error('Web search Responses error', model, res.status, lastError)
        continue
      }

      const data = await res.json()
      const reply = extractResponsesText(data)
      if (reply) {
        return { ok: true, reply, usedWebSearch: true }
      }
    } catch (err) {
      console.error('Web search failed', model, err)
      lastError = err instanceof Error ? err.message : String(err)
    }
  }

  return {
    ok: false,
    status: 502,
    error: `Búsqueda web no disponible: ${lastError.slice(0, 180)}`,
  }
}

/** Llama a OpenAI con el contexto de dominios. Usado por Vercel y por Vite (local). */
export async function completeEnvironmentalChat(
  input: OpenAIChatInput,
): Promise<OpenAIChatResult> {
  const message = input.message.trim()
  if (!message) {
    return { ok: false, status: 400, error: 'Mensaje vacío' }
  }

  const context =
    input.context?.trim() ||
    'No se recibió contexto de datos. Indica que no hay información cargada.'

  const history = Array.isArray(input.history) ? input.history.slice(-8) : []
  const domains = Array.isArray(input.domainIds)
    ? input.domainIds.join(', ')
    : 'todos'

  const messages: ChatTurn[] = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    {
      role: 'system',
      content: `Dominios activos: ${domains}\n\nCONTEXTO DE DATOS:\n${context.slice(0, 180000)}`,
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
      temperature: 0.2,
      messages,
    }),
  })

  if (!openaiRes.ok) {
    const errText = await openaiRes.text()
    console.error('OpenAI error', openaiRes.status, errText)
    // Si falla el chat normal, aún intentamos web para normativa
    if (wantsLegislationLookup(message)) {
      const web = await answerWithWebSearch({
        message,
        context,
        apiKey: input.apiKey,
      })
      if (web.ok) return web
    }
    return {
      ok: false,
      status: 502,
      error: 'Error al consultar el modelo de IA',
    }
  }

  const data = (await openaiRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const reply = data.choices?.[0]?.message?.content?.trim()
  if (!reply) {
    return { ok: false, status: 502, error: 'Respuesta vacía del modelo' }
  }

  // Si no sabe por falta de contexto, investigar en internet
  if (looksInsufficient(reply)) {
    const web = await answerWithWebSearch({
      message,
      context,
      apiKey: input.apiKey,
    })
    if (web.ok) return web
  }

  // Normativa pedida por número: si no está en el contexto local, buscar en web
  if (wantsLegislationLookup(message)) {
    const agreementMatch = message.match(
      /(?:acuerdo|gubernativo|reglamento|decreto)[^\d]{0,40}(\d{1,4}[\s\-–]?\d{4})/i,
    )
    const code = agreementMatch?.[1]?.replace(/\s+/g, '-')
    if (code) {
      const inContext = new RegExp(code.replace('-', '[-\\s]?'), 'i').test(
        context,
      )
      if (!inContext) {
        const web = await answerWithWebSearch({
          message,
          context,
          apiKey: input.apiKey,
        })
        if (web.ok) return web
      }
    }
  }

  return { ok: true, reply }
}
