import { useState, useEffect } from 'react'
import type { Language } from './language.tsx'

export function isEmail(val?: string | null): boolean {
  if (!val) return false
  const s = val.trim()
  return s.includes('@') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

/**
 * Checks if a user profile has a real, valid display name (not missing and not an email).
 */
export function hasValidName(user?: { name?: string | null; username?: string | null } | null): boolean {
  if (!user || !user.name) return false
  const name = user.name.trim()
  if (name.length < 2) return false
  if (isEmail(name)) return false
  return true
}

/**
 * Resolves a clean, personalized display name for the user.
 * Guarantees that an email address will NEVER be displayed.
 */
export function getDisplayName(user?: { name?: string | null; username?: string | null } | null): string {
  if (!user) return 'Friend'

  // If a valid non-email name is stored, use it
  if (user.name && !isEmail(user.name)) {
    const trimmed = user.name.trim()
    if (trimmed.length > 0) return trimmed
  }

  // If name was stored as an email, extract and capitalize the local-part
  const candidate = (user.name || user.username || '').trim()
  if (candidate.includes('@')) {
    const local = candidate.split('@')[0].replace(/[._0-9]+$/g, '').replace(/[._]/g, ' ').trim()
    if (local.length > 0) {
      // Capitalize first letter of each word
      return local
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    }
  }

  if (user.username && !isEmail(user.username)) {
    const u = user.username.trim()
    return u.charAt(0).toUpperCase() + u.slice(1)
  }

  return 'Friend'
}

/**
 * Returns time-based greeting strictly matching the user requirements:
 * 05:00–11:59: Good morning
 * 12:00–16:59: Good afternoon
 * 17:00–20:59: Good evening
 * 21:00–04:59: Good night
 */
export function getTimeGreeting(date = new Date(), language: Language = 'en'): string {
  const hours = date.getHours()

  if (language === 'hi') {
    if (hours >= 5 && hours < 12) return 'शुभ प्रभात'
    if (hours >= 12 && hours < 17) return 'शुभ दोपहर'
    if (hours >= 17 && hours < 21) return 'शुभ संध्या'
    return 'शुभ रात्रि'
  }

  if (hours >= 5 && hours < 12) return 'Good morning'
  if (hours >= 12 && hours < 17) return 'Good afternoon'
  if (hours >= 17 && hours < 21) return 'Good evening'
  return 'Good night'
}

/**
 * React hook that provides an auto-updating time-based greeting for the dashboard.
 * If the dashboard remains open when the time period transitions, it updates seamlessly.
 */
export function useDynamicGreeting(
  user?: { name?: string | null; username?: string | null } | null,
  language: Language = 'en',
) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    // Re-check periodically to update greeting when time period changes
    const timer = setInterval(() => {
      setNow(new Date())
    }, 30000)

    return () => clearInterval(timer)
  }, [])

  const greeting = getTimeGreeting(now, language)

  const name = user ? getDisplayName(user) : ''
  const isGeneric = !name || name.toLowerCase() === 'friend'

  // Full greeting sentence: e.g. "Good morning, Priya!" or "Good morning!"
  const fullGreeting = isGeneric ? `${greeting}!` : `${greeting}, ${name}!`

  return {
    greeting,
    name: isGeneric ? '' : name,
    fullGreeting,
  }
}
