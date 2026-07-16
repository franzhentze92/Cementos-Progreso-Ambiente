import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onstart: ((ev: Event) => void) | null
  onend: ((ev: Event) => void) | null
  onerror: ((ev: Event & { error?: string }) => void) | null
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

export type VoiceStatus = 'idle' | 'listening' | 'speaking' | 'unsupported' | 'denied'

const FEMALE_NAME =
  /sabina|helena|monica|mónica|paulina|maria|maría|lucia|lucía|laura|carmen|isabel|sofia|sofía|camila|valentina|dalia|esperanza|francisca|juana|karina|catalina|paloma|elsa|zira|jenny|susan|google español|microsoft sabina|microsoft helena|microsoft sabrina/i

const MALE_NAME =
  /jorge|diego|carlos|miguel|pablo|raul|raúl|antonio|juan|pedro|enrique|andres|andrés|david|google español de estados unidos \(masculino\)|microsoft pablo|microsoft raul|microsoft jorge|male|hombre/i

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Prefiere voces femeninas en español latino / nativo (no inglés). */
export function pickSpanishFemaleVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const es = voices.filter((v) => /^es([-_]|$)/i.test(v.lang))
  if (!es.length) return null

  const latam = es.filter((v) =>
    /es-(MX|GT|CR|CO|AR|CL|PE|EC|UY|PY|BO|SV|HN|NI|PA|DO|PR|US)/i.test(v.lang),
  )
  const pool = latam.length ? latam : es

  const femaleLatam = pool.find(
    (v) => FEMALE_NAME.test(v.name) && !MALE_NAME.test(v.name),
  )
  if (femaleLatam) return femaleLatam

  const femaleAny = es.find(
    (v) => FEMALE_NAME.test(v.name) && !MALE_NAME.test(v.name),
  )
  if (femaleAny) return femaleAny

  // Preferencias por locale si el SO no expone género en el nombre
  const preferredLangs = ['es-MX', 'es-GT', 'es-CR', 'es-CO', 'es-US', 'es-ES']
  for (const lang of preferredLangs) {
    const hit = es.find(
      (v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase(),
    )
    if (hit && !MALE_NAME.test(hit.name)) return hit
  }

  return pool.find((v) => !MALE_NAME.test(v.name)) ?? pool[0] ?? null
}

/** Limpia el texto para que suene natural al hablar. */
export function textForSpeech(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[*_#>`]/g, ' ')
    .replace(/^\s*[-•]\s+/gm, '')
    // Siglas en mayúsculas: el TTS las deletrea; forzar lectura como palabra
    .replace(/\bCEMPRO\b/gi, 'Cémpro')
    .replace(/\bNDA\b/g, 'ene de a')
    .replace(/\bMARN\b/gi, 'Marn')
    .replace(/\bkWh\b/gi, 'kilovatios hora')
    .replace(/\bMWh\b/gi, 'megavatios hora')
    .replace(/\bm³\b/gi, 'metros cúbicos')
    .replace(/\bm3\b/gi, 'metros cúbicos')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200)
}

type Options = {
  enabled: boolean
  onUtterance: (text: string) => void
  /** Si true, no escucha (p. ej. mientras el bot piensa). */
  holdListening?: boolean
}

/**
 * Conversación continua: micrófono + altavoz mientras `enabled`.
 * Pausa el mic mientras habla el asistente para no autoescucharse.
 */
export function useVoiceConversation({
  enabled,
  onUtterance,
  holdListening = false,
}: Options) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [interim, setInterim] = useState('')
  const [voiceName, setVoiceName] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const enabledRef = useRef(enabled)
  const holdRef = useRef(holdListening)
  const speakingRef = useRef(false)
  const restartTimer = useRef<number | null>(null)
  const onUtteranceRef = useRef(onUtterance)
  const finalBuffer = useRef('')

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])
  useEffect(() => {
    holdRef.current = holdListening
  }, [holdListening])
  useEffect(() => {
    onUtteranceRef.current = onUtterance
  }, [onUtterance])

  const clearRestart = () => {
    if (restartTimer.current != null) {
      window.clearTimeout(restartTimer.current)
      restartTimer.current = null
    }
  }

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined') return
    window.speechSynthesis?.cancel()
    speakingRef.current = false
  }, [])

  const loadVoice = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const apply = () => {
      const voices = window.speechSynthesis.getVoices()
      const picked = pickSpanishFemaleVoice(voices)
      voiceRef.current = picked
      setVoiceName(picked ? `${picked.name} (${picked.lang})` : null)
    }
    apply()
    window.speechSynthesis.onvoiceschanged = apply
  }, [])

  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
          resolve()
          return
        }
        const clean = textForSpeech(text)
        if (!clean) {
          resolve()
          return
        }

        stopSpeaking()
        speakingRef.current = true
        setStatus('speaking')

        try {
          recognitionRef.current?.stop()
        } catch {
          /* ignore */
        }

        const utter = new SpeechSynthesisUtterance(clean)
        utter.lang = voiceRef.current?.lang || 'es-MX'
        utter.rate = 1.28
        utter.pitch = 1.05
        utter.volume = 1
        if (voiceRef.current) utter.voice = voiceRef.current

        const done = () => {
          speakingRef.current = false
          if (enabledRef.current) setStatus('listening')
          else setStatus('idle')
          resolve()
        }
        utter.onend = done
        utter.onerror = done
        window.speechSynthesis.speak(utter)
      }),
    [stopSpeaking],
  )

  const startListening = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec || !enabledRef.current) return
    if (holdRef.current || speakingRef.current) return
    try {
      rec.start()
    } catch {
      // Already started
    }
  }, [])

  const scheduleListen = useCallback(() => {
    clearRestart()
    restartTimer.current = window.setTimeout(() => {
      if (!enabledRef.current || holdRef.current || speakingRef.current) return
      startListening()
    }, 280)
  }, [startListening])

  useEffect(() => {
    loadVoice()
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setStatus('unsupported')
      return
    }

    const rec = new Ctor()
    rec.lang = 'es-MX'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    recognitionRef.current = rec

    rec.onstart = () => {
      if (!speakingRef.current) setStatus('listening')
    }

    rec.onresult = (event) => {
      if (speakingRef.current || holdRef.current) return
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const piece = result[0]?.transcript ?? ''
        if (result.isFinal) {
          finalBuffer.current = `${finalBuffer.current} ${piece}`.trim()
        } else {
          interimText += piece
        }
      }
      setInterim(interimText.trim())

      if (finalBuffer.current) {
        const said = finalBuffer.current.trim()
        finalBuffer.current = ''
        setInterim('')
        if (said.length >= 2) onUtteranceRef.current(said)
      }
    }

    rec.onerror = (ev) => {
      const err = ev.error || ''
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setStatus('denied')
        enabledRef.current = false
        return
      }
      // no-speech / aborted → reiniciar
      if (enabledRef.current && !speakingRef.current && !holdRef.current) {
        scheduleListen()
      }
    }

    rec.onend = () => {
      if (enabledRef.current && !speakingRef.current && !holdRef.current) {
        scheduleListen()
      }
    }

    return () => {
      clearRestart()
      try {
        rec.onstart = null
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
        rec.abort()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
      stopSpeaking()
    }
  }, [loadVoice, scheduleListen, stopSpeaking])

  useEffect(() => {
    if (!enabled) {
      clearRestart()
      setInterim('')
      finalBuffer.current = ''
      try {
        recognitionRef.current?.stop()
      } catch {
        /* ignore */
      }
      stopSpeaking()
      setStatus((s) => (s === 'unsupported' || s === 'denied' ? s : 'idle'))
      return
    }

    if (status === 'unsupported' || status === 'denied') return

    loadVoice()
    if (!holdListening && !speakingRef.current) {
      startListening()
      setStatus('listening')
    }
  }, [enabled, holdListening, loadVoice, startListening, status, stopSpeaking])

  useEffect(() => {
    if (!enabled) return
    if (holdListening || speakingRef.current) {
      try {
        recognitionRef.current?.stop()
      } catch {
        /* ignore */
      }
      return
    }
    scheduleListen()
  }, [enabled, holdListening, scheduleListen])

  return {
    status,
    interim,
    voiceName,
    speak,
    stopSpeaking,
    supported: status !== 'unsupported',
  }
}
