import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  Camera,
  ImagePlus,
  MessageCircle,
  Mic,
  MicOff,
  Send,
  Volume2,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { askCopilot } from '../lib/chat/askCopilot'
import { loadChatDomains } from '../lib/chat/domains'
import {
  beginInspectionFlow,
  createIdleInspectionState,
  handleInspectionPhotos,
  handleInspectionText,
  isInspectionFlowActive,
  wantsStartInspection,
  type InspectionFlowState,
  type InspectionTurnResult,
  type InspectionUiMode,
} from '../lib/chat/inspectionFlow'
import { useVoiceConversation } from '../lib/chat/useVoiceConversation'
import type { ChatDomainSnapshot, ChatMessagePayload } from '../lib/chat/types'
type ChatRole = 'bot' | 'user'

interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  imageUrls?: string[]
}

const QUICK_PROMPTS = [
  'Quiero hacer una inspección',
  '¿Cuánto cemento produjo Alicon?',
  '¿Cuánta agua consume Agro?',
  '¿Cómo va el NDA Agro?',
  '¿Hay licencias por vencer?',
]

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'bot',
  text: 'Hola, soy el asistente virtual de Ambiente CEMPRO. ¿Cómo te puedo apoyar hoy?',
}

const DEFAULT_UI: InspectionUiMode = {
  chips: [],
  expectPhoto: false,
  allowSkipComment: false,
  placeholder: 'Escribe tu pregunta…',
}

export function EnvironmentalChatbot() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [domains, setDomains] = useState<ChatDomainSnapshot[]>([])
  const [domainsLoading, setDomainsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [inspection, setInspection] = useState<InspectionFlowState>(
    createIdleInspectionState,
  )
  const [flowUi, setFlowUi] = useState<InspectionUiMode>(DEFAULT_UI)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const domainsRef = useRef<ChatDomainSnapshot[]>([])
  const messagesRef = useRef<ChatMessage[]>([WELCOME_MESSAGE])
  const inspectionRef = useRef<InspectionFlowState>(createIdleInspectionState())
  const busyRef = useRef(false)
  const welcomedVoiceRef = useRef(false)
  const sendMessageRef = useRef<(text: string) => void>(() => {})

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    inspectionRef.current = inspection
  }, [inspection])

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

  const {
    status: voiceStatus,
    interim,
    voiceName,
    speak,
    stopSpeaking,
    requestMicAccess,
    supported,
  } = useVoiceConversation({
    enabled: open,
    onUtterance: onVoiceUtterance,
    holdListening: typing || uploadingPhoto,
  })

  useEffect(() => {
    if (!open) {
      welcomedVoiceRef.current = false
      stopSpeaking()
      return
    }
    if (welcomedVoiceRef.current) return
    if (voiceStatus === 'denied' || voiceStatus === 'unsupported') {
      welcomedVoiceRef.current = true
      return
    }
    if (voiceStatus === 'needs-permission') return
    if (voiceStatus !== 'listening' && voiceStatus !== 'idle') return
    welcomedVoiceRef.current = true
    void speak(WELCOME_MESSAGE.text)
  }, [open, speak, stopSpeaking, voiceStatus])

  async function openChat() {
    setOpen(true)
    await requestMicAccess()
  }

  function closeChat() {
    stopSpeaking()
    setOpen(false)
  }

  function toggleChat() {
    if (open) closeChat()
    else void openChat()
  }

  function historyFromMessages(list: ChatMessage[]): ChatMessagePayload[] {
    return list
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))
  }

  function applyTurn(result: InspectionTurnResult) {
    setInspection(result.state)
    inspectionRef.current = result.state
    setFlowUi(result.ui)
    const botMsg: ChatMessage = {
      id: `bot-${crypto.randomUUID()}`,
      role: 'bot',
      text: result.botText,
    }
    setMessages((prev) => {
      const next = [...prev, botMsg]
      messagesRef.current = next
      return next
    })
    return result.speakText ?? result.botText
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
      setFlowUi(DEFAULT_UI)
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

  async function processUserText(trimmed: string, userMsg: ChatMessage) {
    const prior = [...messagesRef.current, userMsg]
    messagesRef.current = prior
    setMessages(prior)

    try {
      const active = isInspectionFlowActive(inspectionRef.current)
      const starting =
        !active &&
        (inspectionRef.current.step === 'idle' ||
          inspectionRef.current.step === 'done') &&
        wantsStartInspection(trimmed)

      if (active || starting) {
        const turn = await handleInspectionText(
          starting ? createIdleInspectionState() : inspectionRef.current,
          trimmed,
          { responsable: user?.name ?? user?.username ?? '' },
        )
        if (turn) {
          const spoken = applyTurn(turn)
          if (open) await speak(spoken)
          return
        }
      }

      // Si el flujo no aplica, respuesta normal del copiloto
      if (!isInspectionFlowActive(inspectionRef.current)) {
        setFlowUi(DEFAULT_UI)
      }
      await pushBotReply(trimmed, prior)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Hubo un problema con la inspección. Intenta de nuevo.'
      const botMsg: ChatMessage = {
        id: `bot-${crypto.randomUUID()}`,
        role: 'bot',
        text: msg,
      }
      setMessages((prev) => {
        const next = [...prev, botMsg]
        messagesRef.current = next
        return next
      })
      if (open) await speak(msg)
    } finally {
      busyRef.current = false
      setTyping(false)
    }
  }

  function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busyRef.current || typing || uploadingPhoto) return
    busyRef.current = true
    setTyping(true)
    setInput('')
    stopSpeaking()

    const userMsg: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: 'user',
      text: trimmed,
    }
    void processUserText(trimmed, userMsg)
  }

  sendMessageRef.current = sendMessage

  function handleChip(chipId: string, label: string) {
    if (chipId === '__add_photo__' || chipId === '__take_photo__') {
      cameraInputRef.current?.click()
      return
    }
    if (chipId === '__gallery_photo__') {
      galleryInputRef.current?.click()
      return
    }
    if (!chipId.trim() || busyRef.current || typing) return
    busyRef.current = true
    setTyping(true)
    stopSpeaking()

    const userMsg: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: 'user',
      text: label,
    }
    // Resolución por id de chip; el bubble muestra el label legible
    void processUserText(chipId, userMsg)
  }

  async function onPhotosSelected(files: FileList | null) {
    if (!files?.length || busyRef.current || uploadingPhoto) return
    if (inspectionRef.current.step !== 'await_photo') return

    const list = Array.from(files)
    busyRef.current = true
    setUploadingPhoto(true)
    stopSpeaking()

    const previews = list.map((f) => URL.createObjectURL(f))
    const userMsg: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: 'user',
      text: list.length === 1 ? 'Foto del área' : `${list.length} fotos del área`,
      imageUrls: previews,
    }
    setMessages((prev) => {
      const next = [...prev, userMsg]
      messagesRef.current = next
      return next
    })

    try {
      const turn = await handleInspectionPhotos(inspectionRef.current, list)
      if (turn) {
        const spoken = applyTurn(turn)
        if (open) await speak(spoken)
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? `No pude subir la foto: ${err.message}`
          : 'No pude subir la foto. Intenta de nuevo.'
      const botMsg: ChatMessage = {
        id: `bot-${crypto.randomUUID()}`,
        role: 'bot',
        text: msg,
      }
      setMessages((prev) => {
        const next = [...prev, botMsg]
        messagesRef.current = next
        return next
      })
      if (open) await speak(msg)
    } finally {
      busyRef.current = false
      setUploadingPhoto(false)
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  const showPhotoActions =
    flowUi.expectPhoto || inspection.step === 'await_photo'

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  function startInspectionFromQuick() {
    if (busyRef.current || typing) return
    if (isInspectionFlowActive(inspectionRef.current)) {
      sendMessage('cancelar')
      return
    }
    busyRef.current = true
    setTyping(true)
    stopSpeaking()
    const userMsg: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: 'user',
      text: 'Quiero hacer una inspección',
    }
    setMessages((prev) => {
      const next = [...prev, userMsg]
      messagesRef.current = next
      return next
    })
    void (async () => {
      try {
        const turn = beginInspectionFlow(user?.name ?? user?.username ?? '')
        const spoken = applyTurn(turn)
        if (open) await speak(spoken)
      } finally {
        busyRef.current = false
        setTyping(false)
      }
    })()
  }

  const inFlow = isInspectionFlowActive(inspection)
  const chips =
    inFlow || inspection.step === 'select_project'
      ? flowUi.chips
      : QUICK_PROMPTS.map((p) => ({ id: p, label: p }))

  const domainLabel =
    uploadingPhoto
      ? 'Subiendo foto…'
      : voiceStatus === 'denied'
        ? 'Micrófono bloqueado — puedes escribir'
        : voiceStatus === 'unsupported'
          ? 'Voz no disponible en este navegador'
          : voiceStatus === 'needs-permission'
            ? 'Toca “Activar micrófono” para hablar'
            : voiceStatus === 'speaking'
              ? 'Hablando…'
              : voiceStatus === 'listening'
                ? interim
                  ? `Te escucho: “${interim}”`
                  : 'Escuchando… habla cuando quieras'
                : inFlow
                  ? 'Inspección en curso'
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
                ) : voiceStatus === 'denied' ||
                  voiceStatus === 'unsupported' ||
                  voiceStatus === 'needs-permission' ? (
                  <MicOff size={14} />
                ) : (
                  <Mic size={14} />
                )}
              </span>
              {(voiceStatus === 'needs-permission' ||
                voiceStatus === 'denied') && (
                <button
                  type="button"
                  className="env-chat-mic-btn"
                  onClick={() => void requestMicAccess()}
                >
                  <Mic size={14} />
                  Activar micrófono
                </button>
              )}
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
                <div className="env-chat-bubble-body">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                  {msg.imageUrls && msg.imageUrls.length > 0 && (
                    <div className="env-chat-thumbs">
                      {msg.imageUrls.map((src) => (
                        <img key={src} src={src} alt="Evidencia de inspección" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(typing || uploadingPhoto) && (
              <div className="env-chat-bubble is-bot is-typing">
                <img
                  src="/logo-mark.svg"
                  alt=""
                  className="env-chat-mini-logo"
                />
                <div className="env-chat-bubble-body">
                  <p>
                    <span />
                    <span />
                    <span />
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="env-chat-quick">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  if (
                    !inFlow &&
                    chip.label === 'Quiero hacer una inspección'
                  ) {
                    startInspectionFromQuick()
                    return
                  }
                  if (inFlow || inspection.step === 'select_project') {
                    handleChip(chip.id, chip.label)
                    return
                  }
                  sendMessage(chip.label)
                }}
                disabled={typing || uploadingPhoto}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {showPhotoActions && (
            <div className="env-chat-photo-bar">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="env-chat-file-input"
                onChange={(e) => void onPhotosSelected(e.target.files)}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="env-chat-file-input"
                onChange={(e) => void onPhotosSelected(e.target.files)}
              />
              <button
                type="button"
                className="env-chat-photo-primary"
                disabled={typing || uploadingPhoto}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera size={16} />
                Tomar foto ahora
              </button>
              <button
                type="button"
                className="env-chat-photo-secondary"
                disabled={typing || uploadingPhoto}
                onClick={() => galleryInputRef.current?.click()}
                title="Solo si necesitas una foto ya guardada"
              >
                <ImagePlus size={15} />
                Galería
              </button>
            </div>
          )}

          <form className="env-chat-form" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                flowUi.placeholder ||
                (supported && voiceStatus === 'listening'
                  ? 'Habla o escribe tu pregunta…'
                  : 'Escribe tu pregunta…')
              }
              aria-label="Mensaje al asistente"
            />
            <button
              type="submit"
              aria-label="Enviar"
              disabled={typing || uploadingPhoto || !input.trim()}
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
