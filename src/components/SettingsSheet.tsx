import { SettingsIcon, Volume2Icon, VolumeXIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { audio } from '@/lib/audio'
import { settings, useSettings } from '@/lib/settings'

export function SettingsSheet() {
  const { muted, volume } = useSettings()
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="teal" size="icon-sm" aria-label="Settings" onClick={() => audio.unlock()} />}
      >
        <SettingsIcon className="size-6" />
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Sound for this phone only.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-8 px-6">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="mute-switch">
              {muted ? <VolumeXIcon className="size-6 stroke-[2.5]" aria-hidden="true" /> : <Volume2Icon className="size-6 stroke-[2.5]" aria-hidden="true" />}
              Mute
            </Label>
            <Switch id="mute-switch" checked={muted} onCheckedChange={(v) => settings.set({ muted: v })} />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <Label>Volume</Label>
              <span className="font-display text-subheading tabular-nums">{Math.round(volume * 100)}</span>
            </div>
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
