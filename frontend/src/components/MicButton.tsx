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
        'relative w-16 h-16 rounded-full border-2 flex items-center justify-center',
        'transition-colors duration-200 disabled:opacity-50',
        isListening
          ? 'border-primary bg-primary text-white dark:bg-[#E9A5D1] dark:border-[#E9A5D1] dark:text-[#121216]'
          : 'border-primary bg-soft-accent text-primary dark:bg-[#272731] dark:border-[#E9A5D1] dark:text-[#E9A5D1]',
      ].join(' ')}
    >
      {!isListening && (
        <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20" />
      )}
      {isListening ? (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
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
