import type { VercelRequest, VercelResponse } from '@vercel/node'

type ChatTurn = { role: 'user' | 'assistant' | 'system'; content: string }

const SYSTEM_PROMPT = `Eres el Asistente Ambiental CEMPRO, un copiloto de datos ambientales.
Respondes siempre en español, claro y conciso.
SOLO puedes basarte en el CONTEXTO DE DATOS que te entreguen (viene de Supabase y otras fuentes conectadas).
Si un dato no está en el contexto, dilo explícitamente: no inventes cifras.
No inventes tCO₂e, alcances GHG ni factores de emisión si no aparecen en el contexto.
Cuando cites números, usa unidades (t, kWh, gal, m³, %).
Si preguntan algo operativo de la planta (producción, clinker, energía, diésel, agua, residuos), prioriza el dominio de huella/monitoreo.

REGLAS CRÍTICAS DE MÉTRICAS:
- Producción de cemento (t) ≠ consumo de clinker (t) ≠ ingreso de clinker (t) ≠ factor clinker (%).
- Si preguntan "mayor/menor consumo de clinker", responde con toneladas de "clinker consumo", nunca con producción de cemento ni solo con el factor %.
- Si el contexto trae "RANKINGS PRECALCULADOS", úsalos como fuente de verdad para máximos y mínimos.
- Al citar un mes, menciona la métrica pedida con su unidad correcta.

Puedes sugerir 1 pregunta de seguimiento breve al final.`

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
    const body = req.body as {
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
      'No se recibió contexto de datos. Indica que no hay información cargada.'

    const history = Array.isArray(body.history) ? body.history.slice(-8) : []
    const domains = Array.isArray(body.domainIds)
      ? body.domainIds.join(', ')
      : 'carbon'

    const messages: ChatTurn[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'system',
        content: `Dominios activos: ${domains}\n\nCONTEXTO DE DATOS:\n${context.slice(0, 120000)}`,
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
        temperature: 0.2,
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
    return res.status(500).json({ error: 'Error interno del chat' })
  }
}
