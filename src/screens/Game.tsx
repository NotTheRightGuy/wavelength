import type { RoomState } from '@/lib/types'

// Placeholder; Task 16 replaces this with the real game screen.
export function Game({ state }: { state: RoomState; refresh: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-6 text-center text-2xl font-extrabold text-[#f7ecd0]">
      Game in progress ({state.room.code})
    </main>
  )
}
