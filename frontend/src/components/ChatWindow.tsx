import { useState } from 'react'

import { useChatStream } from '../hooks/useChatStream.ts'
import { bodyFontClass, copy, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import type { User } from '../lib/types.ts'

interface ChatWindowProps {
  user: User
}

export function ChatWindow({ user }: ChatWindowProps) {
  const { language } = useLanguage()
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
    <div className="flex flex-col h-[60vh] bg-white border border-line rounded-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="font-display text-lg font-medium text-charcoal">{t(copy.chat.title, language)}</h2>
        <button
          type="button"
          onClick={clear}
          className={`${bodyFontClass(language)} text-sm text-charcoal-soft hover:text-charcoal`}
        >
          {t(copy.chat.clear, language)}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-lavender">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className={`${bodyFontClass(language)} text-sm text-charcoal-soft`}>
              {t(copy.chat.emptyPrompt, language)}
            </p>
            <p className={`${bodyFontClass(language)} text-sm text-charcoal-soft mt-1`}>
              {t(copy.chat.emptyExample, language)}
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
                `max-w-[80%] px-4 py-2 rounded-data ${bodyFontClass(language)} text-sm`,
                message.role === 'user'
                  ? 'bg-charcoal text-white'
                  : 'bg-white border border-line text-charcoal',
              ].join(' ')}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className={`bg-white border border-line rounded-data px-4 py-2 ${bodyFontClass(language)} text-sm text-charcoal-soft`}>
              {t(copy.chat.typing, language)}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose/10 border border-rose rounded-data p-3">
            <p className={`${bodyFontClass(language)} text-sm text-rose`}>{error}</p>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-4 border-t border-line bg-white"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t(copy.chat.placeholder, language)}
          className="flex-1 px-4 py-2 bg-lavender border border-line rounded-data font-sans text-charcoal placeholder:text-charcoal-soft focus-visible:outline-charcoal"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className={`${bodyFontClass(language)} px-4 py-2 bg-charcoal text-white rounded-data font-medium disabled:opacity-50`}
        >
          {t(copy.chat.send, language)}
        </button>
      </form>

      <p className={`${bodyFontClass(language)} px-4 pb-3 text-xs text-charcoal-soft text-center bg-white`}>
        AURA-Nutri provides food intelligence, not medical advice. Always consult a
        qualified physician or registered dietitian before changing your diet or taking
        supplements.
      </p>
    </div>
  )
}
