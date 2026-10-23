import { useCallback, useEffect, useRef, useState } from 'react'

import { copy, t } from '../lib/copy.ts'
import { transcribeAudio } from '../lib/api.ts'
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

interface SpeechGrammarList {
  addFromString(string: string, weight?: number): void
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  grammars?: SpeechGrammarList
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
  if (typeof window === 'undefined') return null
  const win = window as unknown as Record<string, unknown>
  return (win.SpeechRecognition ?? win.webkitSpeechRecognition) as SpeechRecognitionConstructor | null
}

function selectMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return undefined
}

function isVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (getRecognitionConstructor() !== null) return true
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  )
}

export function useVoice(options: VoiceOptions = {}): VoiceState & VoiceActions {
  const { onTranscript, language = 'en' } = options
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [supported] = useState(() => isVoiceSupported())

  // Web Speech API ref
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // MediaRecorder fallback refs
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const reset = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // Ignore errors during abort
      }
      recognitionRef.current = null
    }

    mediaRecorderRef.current = null
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    chunksRef.current = []
  }, [])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore errors if recognition is already stopped
      }
    }
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // Ignore errors if recorder is already stopped
      }
    }
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  const start = useCallback(async () => {
    if (!supported) {
      setError(t(copy.voice.unsupported, language))
      return
    }

    setError(null)
    setInterimTranscript('')
    setIsListening(true)

    const RecognitionConstructor = getRecognitionConstructor()

    // 1. Primary: Browser SpeechRecognition with en-IN and Hinglish food biasing
    if (RecognitionConstructor) {
      try {
        const recognition = new RecognitionConstructor()

        // Force Indian English to output Latin/English characters for Hinglish speech
        recognition.lang = 'en-IN'
        recognition.continuous = false
        recognition.interimResults = true
        recognition.maxAlternatives = 1

        // Optional Grammar biasing for common Hinglish food terms
        const win = window as unknown as Record<string, unknown>
        const GrammarListConstructor = (win.SpeechGrammarList ?? win.webkitSpeechGrammarList) as
          | (new () => SpeechGrammarList)
          | undefined

        if (GrammarListConstructor) {
          try {
            const grammarList = new GrammarListConstructor()
            const foodTerms = [
              'dal', 'roti', 'chapati', 'paratha', 'sabzi', 'chawal', 'rice',
              'paneer', 'chicken', 'mutton', 'egg', 'dahi', 'curd', 'salad',
              'katori', 'bowl', 'plate', 'glass', 'cup', 'piece', 'slice',
              'afghani chicken', 'biryani', 'pulao', 'idli', 'dosa', 'thepla',
              'khichdi', 'poha', 'upma', 'milk', 'doodh', 'chai', 'tea',
              '1', '2', '3', '4', '5', 'ek', 'do', 'teen', 'char'
            ]
            const grammar = `#JSGF V1.0; grammar foods; public <food> = ${foodTerms.join(' | ')} ;`
            grammarList.addFromString(grammar, 1)
            recognition.grammars = grammarList
          } catch {
            // Ignore if speech grammars are unsupported
          }
        }

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
            const full = final.trim()
            setTranscript((prev) => (prev ? `${prev} ${full}` : full).trim())
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
        return
      } catch (err) {
        console.warn('SpeechRecognition failed to start, falling back to MediaRecorder', err)
      }
    }

    // 2. Fallback: MediaRecorder + Groq Whisper STT
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const mimeType = selectMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        setIsListening(false)
        setInterimTranscript('')

        if (chunksRef.current.length === 0) {
          setError(t(copy.voice.noSpeech, language))
          cleanup()
          return
        }

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        cleanup()

        try {
          const { transcript: text } = await transcribeAudio(blob)
          if (text) {
            setTranscript((prev) => (prev ? `${prev} ${text}` : text).trim())
            onTranscript?.(text)
          } else {
            setError(t(copy.voice.noSpeech, language))
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : t(copy.voice.genericError, language)
          setError(message)
        }
      }

      recorder.onerror = () => {
        setError(t(copy.voice.genericError, language))
        setIsListening(false)
        cleanup()
      }

      recorder.start()
    } catch (err) {
      setIsListening(false)
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError(t(copy.voice.notAllowed, language))
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError(t(copy.voice.audioCapture, language))
        } else {
          setError(t(copy.voice.genericError, language))
        }
      } else {
        setError(t(copy.voice.genericError, language))
      }
      cleanup()
    }
  }, [language, onTranscript, supported, cleanup])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

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
