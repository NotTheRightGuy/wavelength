import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

// A plastic slide toggle: sunken teal track, cream knob with a gloss, orange when on.
function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch groove relative inline-flex shrink-0 items-center rounded-full p-[3px] transition-colors duration-200 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-[size=default]:h-9 data-[size=default]:w-16 data-[size=sm]:h-7 data-[size=sm]:w-12 data-checked:bg-plastic-orange data-unchecked:bg-table-deep aria-invalid:ring-3 aria-invalid:ring-destructive/30 data-disabled:cursor-not-allowed data-disabled:opacity-60",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-[radial-gradient(circle_at_40%_30%,#ffffff,var(--plastic-cream)_45%,#e9d6a8)] shadow-lift-1 transition-transform duration-300 ease-spring group-data-[size=default]/switch:size-[30px] group-data-[size=sm]/switch:size-[22px] group-data-[size=default]/switch:data-checked:translate-x-[28px] group-data-[size=sm]/switch:data-checked:translate-x-[20px] data-unchecked:translate-x-0 motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
