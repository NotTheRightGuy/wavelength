import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Toasts are small cardstock slips dropped onto the table.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-5 stroke-[2.5] text-table" />,
        info: <InfoIcon className="size-5 stroke-[2.5] text-plastic-cobalt" />,
        warning: <TriangleAlertIcon className="size-5 stroke-[2.5] text-plastic-orange-lip" />,
        error: <OctagonXIcon className="size-5 stroke-[2.5] text-danger" />,
        loading: <Loader2Icon className="size-5 animate-spin stroke-[2.5] text-table" />,
      }}
      style={
        {
          "--normal-bg": "var(--cardstock)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--card-edge)",
          "--border-radius": "var(--radius-piece)",
          "--width": "min(380px, calc(100vw - 32px))",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast !font-sans !text-base !font-bold !shadow-lift-3 !border-2 !px-4 !py-3.5",
          description: "!text-ink-soft !font-medium",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
