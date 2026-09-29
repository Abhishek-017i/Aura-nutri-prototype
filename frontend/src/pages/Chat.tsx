import { ChatWindow } from '../components/ChatWindow.tsx'
import type { User } from '../lib/types.ts'

interface ChatProps {
  user: User
}

export function Chat({ user }: ChatProps) {
  return (
    <main className="min-h-[60vh] w-full max-w-chat mx-auto px-6 py-8">
      <ChatWindow user={user} />
    </main>
  )
}
