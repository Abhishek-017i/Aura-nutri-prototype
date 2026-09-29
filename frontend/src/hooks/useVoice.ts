import { useCallback, useEffect, useRef, useState } from 'react'

import { copy, t } from '../lib/copy.ts'
import type { Language } from '../lib/language.tsx'

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognition

interface VoiceOptions {
  onTranscript?: (text: string) => void
  language?: Language
}

interface VoiceState {
  isListening: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  supported: boolean
}

interface VoiceActions {
  start: () => void
  stop: () => void
  reset: () => void
}

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const win = window as unknown as Record<string, unknown>
  return (win.SpeechRecognition ?? win.webkitSpeechRecognition) as SpeechRecognitionConstructor | null
}

const LANG_CODE: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
}

export function useVoice(options: VoiceOptions = {}): VoiceState & VoiceActions {
  // Default to English so the mic does not force Hindi when the caller has not
  // supplied a language. The app normally passes the active UI language, which
  // lets English/Hindi/Hinglish speakers use the language they are comfortable
  // with. Web Speech API requires a specific locale code; it cannot auto-detect.
  const { onTranscript, language = 'en' } = options
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [supported] = useState(() => typeof window !== 'undefined' && getRecognitionConstructor() !== null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const reset = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const start = useCallback(() => {
    const Constructor = getRecognitionConstructor()
    if (!Constructor) {
      setError(t(copy.voice.unsupported, language))
      return
    }

    setError(null)
    setInterimTranscript('')
    setIsListening(true)

    const recognition = new Constructor()
    recognition.lang = LANG_CODE[language]
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result[0]?.transcript ?? ''
        if (result.isFinal) {
          final += text
        } else {
          interim += text
        }
      }
      if (final) {
        const full = final
        setTranscript((prev) => `${prev} ${full}`.trim())
        onTranscript?.(full)
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = (event) => {
      let message = t(copy.voice.genericError, language)
      if (event.error === 'no-speech') {
        message = t(copy.voice.noSpeech, language)
      } else if (event.error === 'audio-capture') {
        message = t(copy.voice.audioCapture, language)
      } else if (event.error === 'not-allowed') {
        message = t(copy.voice.notAllowed, language)
      }
      setError(message)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [language, onTranscript])

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    supported,
    start,
    stop,
    reset,
  }
}
