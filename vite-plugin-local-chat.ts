import type { Plugin } from 'vite'

type ChatBody = {
  message?: string
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  context?: string
  domainIds?: string[]
}

type ExtractBody = {
  text?: string
  fileName?: string
}

function readJsonBody<T>(req: import('http').IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? (JSON.parse(raw) as T) : ({} as T))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

/**
 * En desarrollo, Vite no ejecuta /api de Vercel.
 * Replica POST /api/chat y POST /api/extract-monitoreo.
 */
export function localChatApiPlugin(apiKey: string | undefined): Plugin {
  return {
    name: 'local-chat-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]

        if (url === '/api/chat') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          if (!apiKey?.trim()) {
            res.statusCode = 503
            res.end(
              JSON.stringify({
                error: 'OPENAI_API_KEY no configurada en .env',
              }),
            )
            return
          }

          try {
            const body = await readJsonBody<ChatBody>(req)
            const { completeEnvironmentalChat } = await import(
              './api/openaiReply'
            )
            const result = await completeEnvironmentalChat({
              message: body.message ?? '',
              history: body.history,
              context: body.context,
              domainIds: body.domainIds,
              apiKey,
            })

            if (!result.ok) {
              res.statusCode = result.status
              res.end(JSON.stringify({ error: result.error }))
              return
            }

            res.statusCode = 200
            res.end(JSON.stringify({ reply: result.reply }))
          } catch (err) {
            console.error('[local-chat-api]', err)
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Error interno del chat' }))
          }
          return
        }

        if (url === '/api/extract-monitoreo') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          if (!apiKey?.trim()) {
            res.statusCode = 503
            res.end(
              JSON.stringify({
                error: 'OPENAI_API_KEY no configurada en .env',
              }),
            )
            return
          }

          try {
            const body = await readJsonBody<ExtractBody>(req)
            const { extractMonitoreoFromText } = await import(
              './api/extractMonitoreoLogic'
            )
            const result = await extractMonitoreoFromText({
              text: body.text ?? '',
              fileName: body.fileName,
              apiKey,
            })

            if (!result.ok) {
              res.statusCode = result.status
              res.end(JSON.stringify({ error: result.error }))
              return
            }

            res.statusCode = 200
            res.end(JSON.stringify({ data: result.data }))
          } catch (err) {
            console.error('[local-extract-monitoreo]', err)
            res.statusCode = 500
            res.end(
              JSON.stringify({ error: 'Error interno al extraer el informe' }),
            )
          }
          return
        }

        next()
      })
    },
  }
}
