import { ChatWindow } from '../components/ChatWindow.tsx'
import type { User } from '../lib/types.ts'

interface ChatProps {
  user: User
}

export function Chat({ user }: ChatProps) {
  return (
    <main className="min-h-screen w-full max-w-chat mx-auto px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">
        AURA Assistant
      </h1>
      <ChatWindow user={user} />
    </main>
  )
}
