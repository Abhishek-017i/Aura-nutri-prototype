import { useState } from 'react'

import { useChatStream } from '../hooks/useChatStream.ts'
import { bodyFontClass, copy, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import type { User } from '../lib/types.ts'
import { IconX } from './icons.tsx'

interface ChatWindowProps {
  user: User
  onClose?: () => void
}

export function ChatWindow({ user, onClose }: ChatWindowProps) {
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
    <div data-guide="chat-window" className="flex flex-col h-[70vh] sm:h-[60vh] bg-card border border-border rounded-card dark:bg-[#202027] dark:border-[#34313D] dark:rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-[#34313D]">
        <h2 className="font-display text-lg font-medium text-text-main dark:text-[#F5F1F7]">{t(copy.chat.title, language)}</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={clear}
            className={`${bodyFontClass(language)} text-sm text-text-muted hover:text-text-main dark:text-[#C5BECF] dark:hover:text-[#F5F1F7] transition-colors`}
          >
            {t(copy.chat.clear, language)}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main dark:text-[#C5BECF] dark:hover:text-[#F5F1F7] dark:hover:bg-[#272731] transition-colors"
              aria-label="Close chat"
            >
              <IconX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background dark:bg-[#18181F]">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#C5BECF]`}>
              {t(copy.chat.emptyPrompt, language)}
            </p>
            <p className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#A39AAA] mt-1`}>
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
                `max-w-[80%] px-4 py-2.5 rounded-data ${bodyFontClass(language)} text-sm`,
                message.role === 'user'
                  ? 'bg-primary text-white dark:bg-[#E9A5D1] dark:text-[#121216] dark:rounded-2xl font-medium shadow-sm'
                  : 'bg-card border border-border text-text-main dark:bg-[#272731] dark:border-[#34313D] dark:text-[#F5F1F7] dark:rounded-2xl shadow-sm',
              ].join(' ')}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className={`bg-card border border-border rounded-data px-4 py-2 ${bodyFontClass(language)} text-sm text-text-muted dark:bg-[#272731] dark:border-[#34313D] dark:text-[#C5BECF] dark:rounded-2xl`}>
              {t(copy.chat.typing, language)}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose/10 border border-rose rounded-data p-3 dark:bg-[#593443]/40 dark:border-[#F08B9C]/50 dark:rounded-xl">
            <p className={`${bodyFontClass(language)} text-sm text-rose dark:text-[#F08B9C]`}>{error}</p>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-4 border-t border-border bg-card dark:border-[#34313D] dark:bg-[#202027]"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t(copy.chat.placeholder, language)}
          className="flex-1 px-4 py-2 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted focus-visible:outline-text-main dark:bg-[#18181F] dark:text-[#F5F1F7] dark:border-[#34313D] dark:placeholder-[#A39AAA] dark:focus-visible:outline-[#E9A5D1] dark:rounded-xl"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className={`${bodyFontClass(language)} px-4 py-2 bg-primary hover:bg-primary-hover text-white dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] dark:text-[#121216] rounded-data dark:rounded-xl font-medium disabled:opacity-50 transition-colors`}
        >
          {t(copy.chat.send, language)}
        </button>
      </form>

      <p className={`${bodyFontClass(language)} px-4 pb-3 text-xs text-text-muted dark:text-[#A39AAA] text-center bg-card dark:bg-[#202027]`}>
        AURA-Nutri provides food intelligence, not medical advice. Always consult a
        qualified physician or registered dietitian before changing your diet or taking
        supplements.
      </p>
    </div>
  )
}
