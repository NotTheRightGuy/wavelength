import { BrowserRouter, Route, Routes } from 'react-router'
import { SettingsSheet } from '@/components/SettingsSheet'
import { Toaster } from '@/components/ui/sonner'
import Home from '@/screens/Home'
import Room from '@/screens/Room'
import ScreenView from '@/screens/ScreenView'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh font-sans text-on-table">
        <div className="fixed top-3 right-3 z-40">
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
