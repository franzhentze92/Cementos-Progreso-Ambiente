import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { askCopilot } from '../lib/chat/askCopilot'
import { loadChatDomains } from '../lib/chat/domains'
import type { ChatDomainSnapshot, ChatMessagePayload } from '../lib/chat/types'

type ChatRole = 'bot' | 'user'

interface ChatMessage {
  id: string
  role: ChatRole
  text: string
}

const QUICK_PROMPTS = [
  '¿Cuánto cemento produjo Alicon?',
  '¿Cuál es el factor clinker?',
  '¿Cuánta electricidad se consumió?',
  '¿Cuánto diésel móvil usamos?',
]

export function EnvironmentalChatbot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [domains, setDomains] = useState<ChatDomainSnapshot[]>([])
  const [domainsLoading, setDomainsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Hola, soy el Asistente Ambiental CEMPRO. Ya estoy conectado a los datos de Huella de Carbono (Alicon). Pregúntame por producción, factor clinker, energía, diésel, agua o residuos.',
    },
  ])
  const closeTimer = useRef<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const isTouch = useRef(false)
  const domainsRef = useRef<ChatDomainSnapshot[]>([])

  useEffect(() => {
    isTouch.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none), (max-width: 768px)').matches
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, typing])

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!open || domainsRef.current.length > 0 || domainsLoading) return
    let cancelled = false
    setDomainsLoading(true)
    loadChatDomains()
      .then((loaded) => {
        if (cancelled) return
        domainsRef.current = loaded
        setDomains(loaded)
      })
      .catch(() => {
        if (cancelled) return
        domainsRef.current = []
      })
      .finally(() => {
        if (!cancelled) setDomainsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, domainsLoading])

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

  function historyFromMessages(list: ChatMessage[]): ChatMessagePayload[] {
    return list
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))
  }

  async function pushBotReply(question: string, prior: ChatMessage[]) {
    setTyping(true)
    try {
      const result = await askCopilot({
        question,
        history: historyFromMessages(prior),
        cachedDomains: domainsRef.current,
      })
      if (result.domains.length) {
        domainsRef.current = result.domains
        setDomains(result.domains)
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: result.reply,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: 'No pude consultar los datos ahora. Intenta de nuevo en un momento.',
        },
      ])
    } finally {
      setTyping(false)
    }
  }

  function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || typing) return
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    }
    setMessages((prev) => {
      const next = [...prev, userMsg]
      void pushBotReply(trimmed, next)
      return next
    })
    setInput('')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  const domainLabel =
    domains.length > 0
      ? domains.map((d) => d.label).join(' · ')
      : domainsLoading
        ? 'Cargando datos…'
        : 'Datos de la plataforma'

  return (
    <div
      className={`env-chat${open ? ' is-open' : ''}`}
      onMouseEnter={openChat}
      onMouseLeave={scheduleClose}
    >
      {open && (
        <section
          className="env-chat-panel"
          aria-label="Asistente Ambiental CEMPRO"
        >
          <header className="env-chat-header">
            <div className="env-chat-header-main">
              <img src="/logo-mark.svg" alt="" />
              <div>
                <strong>Asistente Ambiental CEMPRO</strong>
                <span>Copiloto · {domainLabel}</span>
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
                  <img
                    src="/logo-mark.svg"
                    alt=""
                    className="env-chat-mini-logo"
                  />
                )}
                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
              </div>
            ))}
            {typing && (
              <div className="env-chat-bubble is-bot is-typing">
                <img
                  src="/logo-mark.svg"
                  alt=""
                  className="env-chat-mini-logo"
                />
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
              placeholder="Pregunta sobre huella Alicon…"
              aria-label="Mensaje al asistente"
            />
            <button
              type="submit"
              aria-label="Enviar"
              disabled={typing || !input.trim()}
            >
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
