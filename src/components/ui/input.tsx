import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

// A pressed-in writing well on the cardstock.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "groove h-14 w-full min-w-0 rounded-piece border-2 border-card-edge bg-field px-4 text-lg font-semibold text-ink transition-[border-color,box-shadow] duration-150 outline-none placeholder:font-medium placeholder:text-ink-soft hover:border-[#c4a463] focus-visible:border-plastic-cobalt focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-plastic-cobalt/45 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:outline-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
