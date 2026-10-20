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
    <div className="flex flex-col h-[75vh] bg-card border border-border rounded-3xl shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-soft-pink flex items-center justify-center text-primary text-sm shadow-sm">
            ✨
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-plum">{t(copy.chat.title, language)}</h2>
            <p className="text-[10px] text-muted font-medium">Personalized Women's Wellness AI</p>
          </div>
        </div>
        <button
          type="button"
          onClick={clear}
          className={`${bodyFontClass(language)} text-xs font-bold text-primary bg-soft-pink hover:bg-soft-pink/80 px-3.5 py-1.5 rounded-full transition-all shadow-sm`}
        >
          {t(copy.chat.clear, language)}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-background/60">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-soft-pink text-primary mx-auto flex items-center justify-center text-2xl mb-3 shadow-sm">
              💬
            </div>
            <p className={`${bodyFontClass(language)} text-sm font-bold text-plum`}>
              {t(copy.chat.emptyPrompt, language)}
            </p>
            <p className={`${bodyFontClass(language)} text-xs text-muted mt-1 max-w-xs mx-auto`}>
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
                `max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl ${bodyFontClass(language)} text-sm leading-relaxed shadow-sm`,
                message.role === 'user'
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white rounded-br-sm'
                  : 'bg-card border border-border text-dark-text rounded-bl-sm',
              ].join(' ')}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className={`bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-2.5 ${bodyFontClass(language)} text-xs text-primary shadow-sm flex items-center gap-2 animate-pulse`}>
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              {t(copy.chat.typing, language)}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-soft-pink border border-primary/20 rounded-2xl p-3.5">
            <p className={`${bodyFontClass(language)} text-xs text-primary font-bold`}>{error}</p>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-3 sm:p-4 border-t border-border bg-card"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t(copy.chat.placeholder, language)}
          className="flex-1 px-4 py-2.5 bg-background/60 border border-border rounded-full font-sans text-xs sm:text-sm text-dark-text placeholder:text-muted focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className={`${bodyFontClass(language)} px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs font-bold shadow-fab hover:scale-105 active:scale-95 transition-all disabled:opacity-50`}
        >
          {t(copy.chat.send, language)}
        </button>
      </form>

      <p className={`${bodyFontClass(language)} px-4 pb-3 text-[11px] text-muted text-center bg-white`}>
        AURA-Nutri provides food intelligence, not medical advice. Always consult a
        qualified physician or registered dietitian before changing your diet or taking
        supplements.
      </p>
    </div>
  )
}
