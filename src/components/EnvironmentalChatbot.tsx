import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { MessageCircle, Mic, MicOff, Send, Volume2, X } from 'lucide-react'
import { askCopilot } from '../lib/chat/askCopilot'
import { loadChatDomains } from '../lib/chat/domains'
import type { ChatDomainSnapshot, ChatMessagePayload } from '../lib/chat/types'
import { useVoiceConversation } from '../lib/chat/useVoiceConversation'

type ChatRole = 'bot' | 'user'

interface ChatMessage {
  id: string
  role: ChatRole
  text: string
}

const QUICK_PROMPTS = [
  '¿Cuánto cemento produjo Alicon?',
  '¿Cuánta agua consume Agro?',
  '¿Qué dice el reglamento de descargas?',
  '¿Cómo va el NDA Agro?',
  '¿Hay licencias por vencer?',
  '¿Cuántos incidentes hay?',
]

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'bot',
  text: 'Hola, soy Javi Paniagua, tu Asistente Ambiental CEMPRO. ¿Cómo te puedo apoyar hoy?',
}

export function EnvironmentalChatbot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [domains, setDomains] = useState<ChatDomainSnapshot[]>([])
  const [domainsLoading, setDomainsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const listRef = useRef<HTMLDivElement>(null)
  const domainsRef = useRef<ChatDomainSnapshot[]>([])
  const messagesRef = useRef<ChatMessage[]>([WELCOME_MESSAGE])
  const busyRef = useRef(false)
  const welcomedVoiceRef = useRef(false)
  const sendMessageRef = useRef<(text: string) => void>(() => {})

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, typing])

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

  const onVoiceUtterance = useCallback((text: string) => {
    sendMessageRef.current(text)
  }, [])

  const { status: voiceStatus, interim, voiceName, speak, stopSpeaking, supported } =
    useVoiceConversation({
      enabled: open,
      onUtterance: onVoiceUtterance,
      holdListening: typing,
    })

  // Saludo hablado al abrir el chat (una vez por apertura)
  useEffect(() => {
    if (!open) {
      welcomedVoiceRef.current = false
      stopSpeaking()
      return
    }
    if (welcomedVoiceRef.current) return
    welcomedVoiceRef.current = true
    void speak(WELCOME_MESSAGE.text)
  }, [open, speak, stopSpeaking])

  function openChat() {
    setOpen(true)
  }

  function closeChat() {
    stopSpeaking()
    setOpen(false)
  }

  function toggleChat() {
    if (open) closeChat()
    else openChat()
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
      const botMsg: ChatMessage = {
        id: `bot-${crypto.randomUUID()}`,
        role: 'bot',
        text: result.reply,
      }
      setMessages((prev) => {
        const next = [...prev, botMsg]
        messagesRef.current = next
        return next
      })
      if (result.error) {
        console.warn('[chat]', result.error)
      }
      if (open) {
        await speak(result.reply)
      }
    } catch {
      const fallback =
        'No pude consultar los datos ahora. Intenta de nuevo en un momento.'
      const botMsg: ChatMessage = {
        id: `bot-${crypto.randomUUID()}`,
        role: 'bot',
        text: fallback,
      }
      setMessages((prev) => {
        const next = [...prev, botMsg]
        messagesRef.current = next
        return next
      })
      if (open) await speak(fallback)
    } finally {
      busyRef.current = false
      setTyping(false)
    }
  }

  function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busyRef.current || typing) return
    busyRef.current = true
    setTyping(true)
    setInput('')
    stopSpeaking()

    const userMsg: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: 'user',
      text: trimmed,
    }
    const prior = [...messagesRef.current, userMsg]
    messagesRef.current = prior
    setMessages(prior)

    void pushBotReply(trimmed, prior)
  }

  sendMessageRef.current = sendMessage

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  const domainLabel =
    voiceStatus === 'denied'
      ? 'Micrófono bloqueado — puedes escribir'
      : voiceStatus === 'unsupported'
        ? 'Voz no disponible en este navegador'
        : voiceStatus === 'speaking'
          ? 'Hablando…'
          : voiceStatus === 'listening'
            ? interim
              ? `Te escucho: “${interim}”`
              : 'Escuchando… habla cuando quieras'
            : domains.length > 0
              ? 'Listo para ayudarte'
              : domainsLoading
                ? 'Preparando…'
                : 'Asistente ambiental'

  return (
    <div className={`env-chat${open ? ' is-open' : ''}`}>
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
                <span>{domainLabel}</span>
              </div>
            </div>
            <div className="env-chat-header-actions">
              <span
                className={`env-chat-voice-pill is-${voiceStatus}`}
                title={voiceName ? `Voz: ${voiceName}` : 'Voz en español'}
                aria-live="polite"
              >
                {voiceStatus === 'speaking' ? (
                  <Volume2 size={14} />
                ) : voiceStatus === 'denied' || voiceStatus === 'unsupported' ? (
                  <MicOff size={14} />
                ) : (
                  <Mic size={14} />
                )}
              </span>
              <button
                type="button"
                className="env-chat-close"
                onClick={closeChat}
                aria-label="Cerrar chat"
              >
                <X size={16} />
              </button>
            </div>
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
              placeholder={
                supported && voiceStatus === 'listening'
                  ? 'Habla o escribe tu pregunta…'
                  : 'Escribe tu pregunta…'
              }
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
          {open && voiceStatus === 'listening' ? (
            <Mic size={12} />
          ) : (
            <MessageCircle size={12} />
          )}
        </span>
      </button>
    </div>
  )
}
