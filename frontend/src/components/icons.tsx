interface IconProps {
  className?: string
}

export function IconHome({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 9v10a1 1 0 0 0 1 1h4.5v-5h3v5H18a1 1 0 0 0 1-1V9" />
    </svg>
  )
}

export function IconChat({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7.5 19.5h-3a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5h15A1.5 1.5 0 0 1 21 6v12a1.5 1.5 0 0 1-1.5 1.5h-7.5l-4.5 3.75V19.5Z" />
    </svg>
  )
}

export function IconHistory({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}

export function IconProfile({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.582-6 8-6s8 2 8 6" />
    </svg>
  )
}

export function IconFire({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <path d="M12.7 2.3c-.2-.4-.8-.4-1 0C10.6 5.2 8 8.3 8 11c0 2.2 1.8 4 4 4s4-1.8 4-4c0-2.7-2.6-5.8-3.3-8.7ZM12 21c-3.3 0-6-2.7-6-6 0-1.6.6-3 1.6-4.1.2-.3.6-.2.6.2 0 1.9 1.3 3.6 3.2 4.2.3.1.6-.1.6-.4V11c0-.2.2-.4.4-.3 1.6.8 2.6 2.5 2.6 4.3 0 3.3-2.7 6-6 6Z" />
    </svg>
  )
}

export function IconPlus({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconCheatDay({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 6c-3.3 0-6 2.7-6 6 0 1.7.7 3.2 1.8 4.2h8.4c1.1-1 1.8-2.5 1.8-4.2 0-3.3-2.7-6-6-6Z" />
      <path d="M9 10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0ZM16 10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0ZM12 13.5c1 0 2-.5 2-1.5h-4c0 1 1 1.5 2 1.5Z" />
    </svg>
  )
}

export function IconChevronDown({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
