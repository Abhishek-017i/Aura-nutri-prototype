import { useState } from 'react'

import { useChatStream } from '../hooks/useChatStream.ts'
import type { User } from '../lib/types.ts'

interface ChatWindowProps {
  user: User
}

export function ChatWindow({ user }: ChatWindowProps) {
  const { messages, isLoading, error, send, clear } = useChatStream()
  const [input, setInput] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput('')
    await send(user.id, text)
  }

  return (
    <div className="flex flex-col h-[60vh] bg-surface border border-line rounded-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="font-display text-lg font-medium text-ink">AURA Assistant</h2>
        <button
          type="button"
          onClick={clear}
          className="font-sans text-sm text-ink-soft hover:text-iron"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="font-sans text-sm text-ink-soft">
              Nutrition se related kuch bhi pooch sakti hain.
            </p>
            <p className="font-hindi text-sm text-ink-soft mt-1">
              Jaise: "Iron badhane ke liye kya khayein?"
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={[
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start',
            ].join(' ')}
          >
            <div
              className={[
                'max-w-[80%] px-4 py-2 rounded-data font-sans text-sm',
                message.role === 'user'
                  ? 'bg-iron text-paper'
                  : 'bg-paper border border-line text-ink',
              ].join(' ')}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-paper border border-line rounded-data px-4 py-2 font-sans text-sm text-ink-soft">
              Soch rahi hain...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-risk-high/10 border border-risk-high rounded-data p-3">
            <p className="font-sans text-sm text-risk-high">{error}</p>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-4 border-t border-line"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
          className="flex-1 px-4 py-2 bg-paper border border-line rounded-data font-sans text-ink placeholder:text-ink-soft focus-visible:outline-iron"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-iron text-paper rounded-data font-sans font-medium disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <p className="px-4 pb-3 font-sans text-xs text-ink-soft text-center">
        AURA-Nutri provides food intelligence, not medical advice. Always consult a
        qualified physician or registered dietitian before changing your diet or taking
        supplements.
      </p>
    </div>
  )
}
