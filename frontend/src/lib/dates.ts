export function localDateString(value: string | Date | number): string {
  const d = typeof value === 'number' ? new Date(value) : new Date(value)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatTime(iso: string, language: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(language === 'hi' ? 'hi-IN' : 'en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateLong(iso: string, language: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateShort(iso: string, language: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
    weekday: 'short',
    day: 'numeric',
  })
}
