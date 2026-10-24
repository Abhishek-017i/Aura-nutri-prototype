import { useRef, useEffect, useState, useCallback } from 'react'

import { useChatStream } from '../hooks/useChatStream.ts'
import { useVoice } from '../hooks/useVoice.ts'
import { bodyFontClass, copy, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import type { User } from '../lib/types.ts'
import { IconLoader, IconMicrophone, IconSend, IconX } from './icons.tsx'

interface ChatWindowProps {
  user: User
  onClose?: () => void
  fullHeight?: boolean
  isDedicatedPage?: boolean
}

export function ChatWindow({ user, onClose, fullHeight = false, isDedicatedPage = false }: ChatWindowProps) {
  const { language } = useLanguage()
  const { messages, isLoading, error, send, clear } = useChatStream()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Voice recording integration
  const handleVoiceTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text))
  }, [])

  const voice = useVoice({ onTranscript: handleVoiceTranscript, language })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput('')
    if (voice.isListening) {
      voice.stop()
    }
    await send(user.id, text)
  }

  const handleMicToggle = () => {
    if (voice.isListening) {
      voice.stop()
    } else {
      voice.reset()
      voice.start()
    }
  }

  const quickPrompts = [
    t(copy.chat.emptyExample, language),
    language === 'hi'
      ? 'मेरे पीरियड के समय कौन से सुपरफूड्स अच्छे हैं?'
      : 'Which foods boost iron during my period?',
    language === 'hi'
      ? 'कैल्शियम और विटामिन D के आसान विकल्प बताएं'
      : 'Easy calcium & vitamin D rich meals',
  ]

  return (
    <div
      data-guide="chat-window"
      className={[
        'aura-chat-root flex flex-col w-full overflow-hidden transition-all duration-200 border-0 sm:border',
        fullHeight
          ? 'h-full min-h-[100dvh] sm:min-h-0 sm:h-[82vh] rounded-none sm:rounded-[28px]'
          : 'h-[100dvh] sm:h-[75vh] rounded-none sm:rounded-[28px]',
      ].join(' ')}
    >
      {/* Refined Header */}
      <div className="aura-chat-header flex items-center justify-between px-4 sm:px-6 py-3.5 border-b backdrop-blur-md z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-peach/40 dark:bg-card-secondary flex items-center justify-center border border-peach/50 dark:border-[#423847] text-primary dark:text-[#E9A5D1] shadow-xs">
            <span className="font-display font-bold text-xs">A</span>
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-semibold tracking-tight text-text-main dark:text-[#F5F1F7]">
              {t(copy.chat.title, language)}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald inline-block animate-pulse" />
              <span className={`${bodyFontClass(language)} text-[11px] text-text-muted dark:text-[#A39AAA]`}>
                {language === 'hi' ? 'महिला पोषण साथी' : "Women's Wellness Companion"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className={`${bodyFontClass(language)} text-xs px-2.5 py-1 rounded-full text-text-muted hover:text-text-main hover:bg-black/5 dark:text-[#C5BECF] dark:hover:text-[#F5F1F7] dark:hover:bg-white/5 transition-all`}
            >
              {t(copy.chat.clear, language)}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-black/5 dark:text-[#C5BECF] dark:hover:text-[#F5F1F7] dark:hover:bg-white/5 transition-colors"
              aria-label="Close chat"
            >
              <IconX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Transcript Area */}
      <div className="aura-chat-body flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 scroll-smooth">
        {/* Soft Assistant Intro Region (Dribbble-inspired feature card) */}
        {messages.length === 0 && (
          <div className="aura-chat-intro-card p-5 text-left mb-6 max-w-lg mx-auto transition-transform">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-white/80 dark:bg-card flex items-center justify-center text-[#E88A4D] font-bold text-sm shadow-xs flex-shrink-0 mt-0.5">
                ✦
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-sm font-semibold text-text-main dark:text-[#F5F1F7]">
                  {t(copy.chat.emptyPrompt, language)}
                </h3>
                <p className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#C5BECF] leading-relaxed`}>
                  {language === 'hi'
                    ? 'अपने व्यक्तिगत पोषण, हार्मोनल संतुलन, आयरन और कैल्शियम युक्त भोजन के बारे में निसंकोच पूछें।'
                    : 'Personalized food intelligence for your hormonal cycle, iron balance, and daily micronutrient targets.'}
                </p>
              </div>
            </div>

            {/* Quick Inspiration Pills */}
            <div className="mt-4 pt-3 border-t border-peach/50 dark:border-[#4A3A40]/40 flex flex-wrap gap-2">
              {quickPrompts.map((promptText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInput(promptText.replace(/^e\.g\.\s*|उदाहरण:\s*/i, '').replace(/^"|"$/g, ''))}
                  className={`${bodyFontClass(language)} text-[12px] px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#202027] text-text-main dark:text-[#F5F1F7] border border-peach/60 dark:border-[#383442] hover:border-[#E88A4D] dark:hover:border-[#E88A4D] transition-all text-left shadow-2xs hover:scale-[1.01] active:scale-[0.99]`}
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => {
          const isUser = message.role === 'user'
          return (
            <div
              key={index}
              className={[
                'flex w-full',
                isUser ? 'justify-end' : 'justify-start',
              ].join(' ')}
            >
              <div
                className={[
                  `max-w-[85%] sm:max-w-[78%] px-4.5 py-3 ${bodyFontClass(language)} text-sm leading-relaxed`,
                  isUser
                    ? 'aura-chat-bubble-user font-medium'
                    : 'aura-chat-bubble-assistant',
                ].join(' ')}
              >
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
              </div>
            </div>
          )
        })}

        {/* Loading / Typing State */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="aura-chat-bubble-assistant px-4 py-3 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E88A4D] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#E88A4D] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#E88A4D] animate-bounce" />
              <span className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#C5BECF] ml-1`}>
                {t(copy.chat.typing, language)}
              </span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="bg-rose/10 border border-rose/30 rounded-2xl p-3.5 dark:bg-[#593443]/40 dark:border-[#F08B9C]/50 max-w-lg mx-auto">
            <p className={`${bodyFontClass(language)} text-xs text-rose dark:text-[#F08B9C] font-medium`}>
              {error}
            </p>
          </div>
        )}

        {/* Voice Error Notification if any */}
        {voice.error && (
          <div className="bg-amber/10 border border-amber/30 rounded-2xl p-2.5 dark:bg-amber/20 dark:border-amber/40 text-center max-w-sm mx-auto">
            <p className={`${bodyFontClass(language)} text-xs text-amber-900 dark:text-amber-200`}>
              {voice.error}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pill-like Chat Composer */}
      <div
        className={[
          'bg-transparent border-t border-peach/30 dark:border-[#34313D] flex-shrink-0 z-10',
          isDedicatedPage
            ? 'p-3 sm:p-4 pb-24 sm:pb-5'
            : 'p-3 sm:p-4 pb-safe sm:pb-5',
        ].join(' ')}
      >
        <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto">
          <div className="aura-chat-composer flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 transition-all focus-within:ring-2 focus-within:ring-[#E88A4D]/40">
            {/* Integrated Mic Button */}
            {voice.supported && (
              <button
                type="button"
                onClick={handleMicToggle}
                disabled={isLoading}
                aria-label={voice.isListening ? 'Stop recording voice question' : 'Ask with microphone'}
                title={voice.isListening ? 'Stop recording' : 'Speak your question'}
                className={[
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0',
                  voice.isListening
                    ? 'aura-chat-mic-btn-active'
                    : 'aura-chat-mic-btn',
                ].join(' ')}
              >
                <IconMicrophone className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            )}

            {/* Input Field */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                voice.isListening
                  ? language === 'hi'
                    ? 'सुन रहे हैं... बोलिए'
                    : 'Listening... speak now'
                  : t(copy.chat.placeholder, language)
              }
              className="flex-1 bg-transparent border-none outline-none font-sans text-sm text-text-main placeholder:text-text-muted/70 dark:text-[#F5F1F7] dark:placeholder-[#A39AAA] px-1 py-1"
              disabled={isLoading}
            />

            {/* Circular Send Button */}
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label={t(copy.chat.send, language)}
              className="aura-chat-action-btn w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              {isLoading ? (
                <IconLoader className="w-4 h-4 text-white" />
              ) : (
                <IconSend className="w-4 h-4 sm:w-4.5 sm:h-4.5 translate-x-px" />
              )}
            </button>
          </div>
        </form>

        {/* Clinical Disclaimer */}
        <p className={`${bodyFontClass(language)} mt-2 px-3 text-[11px] text-text-muted/80 dark:text-[#A39AAA] text-center leading-normal max-w-lg mx-auto`}>
          AURA-Nutri provides food intelligence, not medical advice. Always consult a
          qualified physician or registered dietitian before changing your diet or taking
          supplements.
        </p>
      </div>
    </div>
  )
}

