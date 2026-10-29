import { QRCodeSVG } from 'qrcode.react'

export function QrJoin({ code, size = 116 }: { code: string; size?: number }) {
  return (
    <div data-testid="qr-join" className="shrink-0 rounded-2xl bg-white p-2 shadow-[0_3px_0_0_#a8935a]">
      <QRCodeSVG value={`${location.origin}/r/${code}`} size={size} fgColor="#134e4a" bgColor="#ffffff" aria-label={`QR code to join room ${code}`} />
    </div>
  )
}
