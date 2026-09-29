import { useCallback, useEffect, useRef, useState } from 'react'

import { copy, t } from '../lib/copy.ts'
import { transcribeAudio } from '../lib/api.ts'
import type { Language } from '../lib/language.tsx'

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

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
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
  const [supported] = useState(() => isSupported())

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  const cleanup = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    mediaRecorderRef.current = null
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    chunksRef.current = []
  }, [])

  const stop = useCallback(() => {
    try {
      mediaRecorderRef.current?.stop()
    } catch {
      // Ignore errors if recorder is already stopped.
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
