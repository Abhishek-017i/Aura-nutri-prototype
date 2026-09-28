import { useCallback, useState } from 'react'

import { sendChat } from '../lib/api.ts'
import type { ChatMessage } from '../lib/types.ts'

interface UseChatStreamResult {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  send: (userId: string, text: string) => Promise<void>
  clear: () => void
}

export function useChatStream(): UseChatStreamResult {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = useCallback(async (userId: string, text: string) => {
    const userMessage: ChatMessage = { role: 'user', content: text }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setIsLoading(true)
    setError(null)

    try {
      const response = await sendChat(userId, nextMessages)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.reply },
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Assistant reply nahi mila.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [messages])

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    send,
    clear,
  }
}
