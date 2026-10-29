import { BrowserRouter, Route, Routes } from 'react-router'
import { SettingsSheet } from '@/components/SettingsSheet'
import { Toaster } from '@/components/ui/sonner'
import Home from '@/screens/Home'
import Room from '@/screens/Room'
import ScreenView from '@/screens/ScreenView'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh bg-teal-800 font-sans text-[#f7ecd0]">
        <div className="fixed top-2 right-2 z-40 text-[#f7ecd0] [&_button]:hover:bg-teal-700 [&_button]:hover:text-white">
          <SettingsSheet />
        </div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/r/:code" element={<Room />} />
          <Route path="/screen/:code" element={<ScreenView />} />
        </Routes>
        <Toaster position="top-center" />
      </div>
    </BrowserRouter>
  )
}
