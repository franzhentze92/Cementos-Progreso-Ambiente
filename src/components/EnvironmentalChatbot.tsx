import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { SITES } from '../data/locations'

type ChatRole = 'bot' | 'user'

interface ChatMessage {
  id: string
  role: ChatRole
  text: string
}

const QUICK_PROMPTS = [
  '¿Cuánta energía renovable usamos?',
  '¿Dónde están las plantas?',
  'Háblame de biodiversidad',
  '¿Qué es la sustitución térmica?',
]

function fakeReply(input: string): string {
  const q = input.toLowerCase()
  const plants = SITES.filter((s) => s.type.includes('Planta') && s.status === 'Operativa')
  const countries = new Set(SITES.map((s) => s.country)).size

  if (q.includes('renov') || q.includes('eléctric') || q.includes('electric')) {
    return 'En 2026, el 62.1% de la energía eléctrica proviene de fuentes renovables, sobre un consumo regional de 555.8 GWh.'
  }
  if (q.includes('térmic') || q.includes('termic') || q.includes('combustible') || q.includes('altern')) {
    return 'La tasa de sustitución térmica actual es 9.8%, gracias al coprocesamiento de residuos de otras industrias. El consumo térmico reportado es de 14,318 TJ.'
  }
  if (q.includes('biodivers') || q.includes('especie') || q.includes('fauna') || q.includes('flora')) {
    return 'Desde 2007 se han identificado 265 especies de animales (240 aves y 25 mamíferos), 155 de mariposas, 22 de herpetofauna y 514 de flora en monitoreo biológico.'
  }
  if (q.includes('mapa') || q.includes('planta') || q.includes('ubic') || q.includes('dónde') || q.includes('donde')) {
    return `Tenemos ${plants.length} plantas operativas georreferenciadas en el mapa, además de centros y oficinas en ${countries} países de la región. Puedes filtrar por país y tipo en la página Mapa.`
  }
  if (q.includes('huella') || q.includes('carbono') || q.includes('co2') || q.includes('emision') || q.includes('emisión')) {
    return 'En el dashboard verás la tendencia de intensidad de CO₂ (Alcance 1 y 2). El módulo Huella de Carbono y las entradas DB estarán disponibles pronto para captura detallada.'
  }
  if (q.includes('reporte') || q.includes('dashboard') || q.includes('indicador')) {
    return 'La plataforma resume energía, sustitución térmica, biodiversidad, presencia regional y recomendaciones ambientales. Los reportes 1–4 están listos como estructura de navegación.'
  }
  if (q.includes('hola') || q.includes('buenas') || q.includes('ayuda')) {
    return '¡Hola! Soy el Asistente Ambiental CEMPRO. Pregúntame por energía renovable, plantas, biodiversidad, huella de carbono o indicadores del dashboard.'
  }

  return 'Puedo orientarte sobre energía renovable (62.1%), sustitución térmica (9.8%), biodiversidad monitoreada, ubicaciones en el mapa y recomendaciones del dashboard. ¿Sobre qué tema quieres saber más?'
}

export function EnvironmentalChatbot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Hola, soy el Asistente Ambiental CEMPRO. Pregúntame sobre indicadores, plantas o biodiversidad de la plataforma.',
    },
  ])
  const closeTimer = useRef<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const isTouch = useRef(false)

  useEffect(() => {
    isTouch.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none), (max-width: 768px)').matches
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [])

  function clearClose() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function openChat() {
    clearClose()
    setOpen(true)
  }

  function scheduleClose() {
    if (isTouch.current) return
    clearClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), 220)
  }

  function toggleChat() {
    clearClose()
    setOpen((v) => !v)
  }

  function pushBotReply(question: string) {
    setTyping(true)
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: fakeReply(question),
        },
      ])
      setTyping(false)
    }, 650 + Math.random() * 500)
  }

  function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || typing) return
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text: trimmed },
    ])
    setInput('')
    pushBotReply(trimmed)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div
      className={`env-chat${open ? ' is-open' : ''}`}
      onMouseEnter={openChat}
      onMouseLeave={scheduleClose}
    >
      {open && (
        <section className="env-chat-panel" aria-label="Asistente Ambiental CEMPRO">
          <header className="env-chat-header">
            <div className="env-chat-header-main">
              <img src="/logo-mark.svg" alt="" />
              <div>
                <strong>Asistente Ambiental CEMPRO</strong>
                <span>En línea · datos de la plataforma</span>
              </div>
            </div>
            <button
              type="button"
              className="env-chat-close"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
            >
              <X size={16} />
            </button>
          </header>

          <div className="env-chat-messages" ref={listRef}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`env-chat-bubble ${msg.role === 'user' ? 'is-user' : 'is-bot'}`}
              >
                {msg.role === 'bot' && (
                  <img src="/logo-mark.svg" alt="" className="env-chat-mini-logo" />
                )}
                <p>{msg.text}</p>
              </div>
            ))}
            {typing && (
              <div className="env-chat-bubble is-bot is-typing">
                <img src="/logo-mark.svg" alt="" className="env-chat-mini-logo" />
                <p>
                  <span />
                  <span />
                  <span />
                </p>
              </div>
            )}
          </div>

          <div className="env-chat-quick">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={typing}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form className="env-chat-form" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta ambiental…"
              aria-label="Mensaje al asistente"
            />
            <button type="submit" aria-label="Enviar" disabled={typing || !input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="env-chat-bubble-btn"
        onClick={toggleChat}
        aria-expanded={open}
        aria-label="Abrir Asistente Ambiental CEMPRO"
      >
        <img src="/logo-mark.svg" alt="" />
        <span className="env-chat-fab-badge">
          <MessageCircle size={12} />
        </span>
      </button>
    </div>
  )
}
