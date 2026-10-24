import { ChatWindow } from '../components/ChatWindow.tsx'
import type { User } from '../lib/types.ts'

interface ChatProps {
  user: User
}

export function Chat({ user }: ChatProps) {
  return (
    <main className="w-full max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-28 sm:pb-32">
      <ChatWindow user={user} />
    </main>
  )
}
