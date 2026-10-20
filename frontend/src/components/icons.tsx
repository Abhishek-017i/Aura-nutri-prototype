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

export function IconLeaf({ className = 'w-5 h-5' }: IconProps) {
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
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 1 8.3C19.2 15.6 15.3 20 11 20z" />
      <path d="M11 20v-9" />
    </svg>
  )
}

export function IconBell({ className = 'w-5 h-5', hasAlert = true }: IconProps & { hasAlert?: boolean }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {hasAlert && (
        <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary ring-2 ring-white" />
      )}
    </div>
  )
}

export function IconUtensils({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
      <path d="M15 11v11" />
      <path d="M5 2v4a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2" />
      <path d="M8 9v13" />
    </svg>
  )
}

export function IconSparkles({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2zM19 17l1.2 2.8L23 21l-2.8 1.2L19 25l-1.2-2.8L15 21l2.8-1.2L19 17z" />
    </svg>
  )
}

export function IconChevronRight({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function IconArrowRight({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

export function IconLogoPetals({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="currentColor">
      <path
        d="M18 4C14 11 11 17 11 23a7 7 0 0 0 14 0c0-6-3-12-7-19z"
        fill="#E88BA8"
      />
      <path
        d="M8 12c3 4 7 8 13 9a7 7 0 0 1-10 6 7 7 0 0 1-3-15z"
        fill="#80864A"
        opacity="0.9"
      />
      <path
        d="M28 12c-3 4-7 8-13 9a7 7 0 0 0 10 6 7 7 0 0 0 3-15z"
        fill="#C85D80"
        opacity="0.9"
      />
    </svg>
  )
}
