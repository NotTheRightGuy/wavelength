import { SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { audio } from '@/lib/audio'
import { settings, useSettings } from '@/lib/settings'

export function SettingsSheet() {
  const { muted, volume } = useSettings()
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" aria-label="Settings" onClick={() => audio.unlock()} />}
      >
        <SettingsIcon />
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="mute-switch">Mute</Label>
            <Switch id="mute-switch" checked={muted} onCheckedChange={(v) => settings.set({ muted: v })} />
          </div>
          <div className="flex flex-col gap-3">
            <Label>Volume</Label>
            <Slider
              aria-label="Volume"
              min={0}
              max={100}
              value={[Math.round(volume * 100)]}
              onValueChange={(v) => {
                const n = Array.isArray(v) ? v[0] : v
                settings.set({ volume: n / 100 })
                audio.tick()
              }}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
