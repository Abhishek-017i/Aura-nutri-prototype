import { ChatWindow } from '../components/ChatWindow.tsx'
import type { User } from '../lib/types.ts'

interface ChatProps {
  user: User
}

export function Chat({ user }: ChatProps) {
  return (
    <main className="w-full sm:max-w-3xl sm:mx-auto px-0 sm:px-6 py-0 sm:py-6 h-[calc(100dvh-3.5rem)] sm:h-[82vh] flex flex-col">
      <ChatWindow user={user} fullHeight isDedicatedPage />
    </main>
  )
}
