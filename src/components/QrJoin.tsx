import { QRCodeSVG } from 'qrcode.react'

export function QrJoin({ code, size = 116 }: { code: string; size?: number }) {
  return (
    <div data-testid="qr-join" className="shrink-0 rounded-piece bg-white p-2.5 shadow-lift-1 ring-2 ring-card-edge/70">
      <QRCodeSVG value={`${location.origin}/r/${code}`} size={size} fgColor="#10302d" bgColor="#ffffff" aria-label={`QR code to join room ${code}`} />
    </div>
  )
}
