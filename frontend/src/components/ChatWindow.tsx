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
    <div className="flex flex-col h-[60vh] bg-card border border-border rounded-card dark:bg-[#876671] dark:border-[#A77D87]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-[#A77D87]">
        <h2 className="font-display text-lg font-medium text-text-main dark:text-[#F7E4E1]">{t(copy.chat.title, language)}</h2>
        <button
          type="button"
          onClick={clear}
          className={`${bodyFontClass(language)} text-sm text-text-muted hover:text-text-main dark:text-[#EBD7D9] dark:hover:text-[#F7E4E1]`}
        >
          {t(copy.chat.clear, language)}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background dark:bg-[#20212A]">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#EBD7D9]`}>
              {t(copy.chat.emptyPrompt, language)}
            </p>
            <p className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#EBD7D9]/80 mt-1`}>
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
                  ? 'bg-primary text-white dark:bg-[#EAC8C8] dark:text-[#20212A] font-medium'
                  : 'bg-card border border-border text-text-main dark:bg-[#936F79] dark:border-[#A77D87] dark:text-[#F7E4E1]',
              ].join(' ')}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className={`bg-card border border-border rounded-data px-4 py-2 ${bodyFontClass(language)} text-sm text-text-muted dark:bg-[#936F79] dark:border-[#A77D87] dark:text-[#EBD7D9]`}>
              {t(copy.chat.typing, language)}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose/10 border border-rose rounded-data p-3 dark:bg-[#876671] dark:border-[#E27B76]">
            <p className={`${bodyFontClass(language)} text-sm text-rose dark:text-[#E27B76]`}>{error}</p>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-4 border-t border-border bg-card dark:border-[#A77D87] dark:bg-[#876671]"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t(copy.chat.placeholder, language)}
          className="flex-1 px-4 py-2 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted focus-visible:outline-text-main dark:bg-[#20212A] dark:text-[#F7E4E1] dark:border-[#A77D87] dark:placeholder-[#EBD7D9]/60 dark:focus-visible:outline-[#F7E4E1]"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className={`${bodyFontClass(language)} px-4 py-2 bg-primary hover:bg-primary-hover text-white dark:bg-[#EAC8C8] dark:hover:bg-[#F7E4E1] dark:text-[#20212A] rounded-data font-medium disabled:opacity-50 transition-colors`}
        >
          {t(copy.chat.send, language)}
        </button>
      </form>

      <p className={`${bodyFontClass(language)} px-4 pb-3 text-xs text-text-muted dark:text-[#EBD7D9]/70 text-center bg-card dark:bg-[#876671]`}>
        AURA-Nutri provides food intelligence, not medical advice. Always consult a
        qualified physician or registered dietitian before changing your diet or taking
        supplements.
      </p>
    </div>
  )
}
