import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center py-3 select-none data-disabled:opacity-60 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="groove relative grow overflow-hidden rounded-full bg-table-deep select-none data-horizontal:h-3 data-horizontal:w-full data-vertical:h-full data-vertical:w-3"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="rounded-full bg-plastic-orange select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            aria-label={props['aria-label']}
            className="relative block size-8 shrink-0 rounded-full border-[3px] border-plastic-orange-lip bg-[radial-gradient(circle_at_40%_30%,#ffffff,var(--plastic-cream)_45%,#e9d6a8)] shadow-lift-2 transition-transform duration-200 ease-spring select-none after:absolute after:-inset-2 hover:scale-105 active:scale-95 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-plastic-cobalt disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
