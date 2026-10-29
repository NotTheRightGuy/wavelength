import { useParams } from 'react-router'
import { GameHeading } from '@/components/game'

// Placeholder; Task 19 replaces this with the shared screen.
export default function ScreenView() {
  const { code } = useParams()
  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-center">
      <GameHeading level={1} size="title">Shared screen for {code}</GameHeading>
    </main>
  )
}
