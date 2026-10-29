import { useParams } from 'react-router'

// Placeholder; Task 19 replaces this with the shared screen.
export default function ScreenView() {
  const { code } = useParams()
  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-center text-2xl font-extrabold text-[#f7ecd0]">
      Shared screen for {code}
    </main>
  )
}
