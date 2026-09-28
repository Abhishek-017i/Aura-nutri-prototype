import { useCallback, useEffect, useRef, useState } from 'react'

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

export function useVoice(options: VoiceOptions = {}): VoiceState & VoiceActions {
  const { onTranscript } = options
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
      setError('Speech recognition is not supported in this browser.')
      return
    }

    setError(null)
    setInterimTranscript('')
    setIsListening(true)

    const recognition = new Constructor()
    recognition.lang = 'hi-IN'
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
      let message = 'Voice input failed. Please try again or type your meal.'
      if (event.error === 'no-speech') {
        message = 'Kuch suna nahi. Phir se bolein.'
      } else if (event.error === 'audio-capture') {
        message = 'Microphone access nahi mila. Check karein.'
      } else if (event.error === 'not-allowed') {
        message = 'Mic permission denied. Browser settings mein allow karein.'
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
  }, [onTranscript])

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
