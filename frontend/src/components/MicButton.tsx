interface MicButtonProps {
  isListening?: boolean
  disabled?: boolean
  onClick?: () => void
}

export function MicButton({
  isListening = false,
  disabled = false,
  onClick,
}: MicButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isListening ? 'Stop recording' : 'Record voice meal'}
      aria-pressed={isListening}
      className={[
        'relative w-16 h-16 rounded-full border-2 flex items-center justify-center flex-shrink-0',
        'transition-all duration-200 disabled:opacity-50 shadow-sm',
        isListening
          ? 'border-rose bg-gradient-to-tr from-rose to-primary text-white shadow-fab scale-105'
          : 'border-primary/40 bg-soft-pink text-primary-dark hover:border-primary hover:scale-105 active:scale-95',
      ].join(' ')}
    >
      {!isListening && (
        <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-25" />
      )}
      {isListening ? (
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" />
        </svg>
      ) : (
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      )}
    </button>
  )
}
