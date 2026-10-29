import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Every solid variant is a candy-plastic game piece (see `.plastic` in index.css).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 font-sans font-extrabold whitespace-nowrap outline-none select-none disabled:pointer-events-none aria-invalid:ring-3 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[2.5] [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "plastic plastic-orange",
        secondary: "plastic plastic-yellow",
        cobalt: "plastic plastic-cobalt",
        quiet: "plastic plastic-cream",
        teal: "plastic plastic-teal",
        destructive: "plastic plastic-danger",
        outline:
          "rounded-piece border-2 border-card-edge bg-field text-ink transition-colors hover:bg-cardstock-deep aria-expanded:bg-cardstock-deep disabled:opacity-60",
        ghost:
          "rounded-piece text-current transition-colors hover:bg-ink/8 aria-expanded:bg-ink/8 disabled:opacity-60",
        link: "text-current underline underline-offset-4 decoration-2 hover:decoration-plastic-orange",
      },
      size: {
        default: "h-12 px-5 text-label",
        xs: "h-9 gap-1 rounded-tile px-3 text-base [--lip:3px] [&_svg:not([class*='size-'])]:size-4",
        sm: "h-11 gap-1.5 rounded-tile px-4 text-base [--lip:4px] [&_svg:not([class*='size-'])]:size-4",
        lg: "h-14 px-6 text-xl",
        xl: "h-[4.25rem] px-7 text-2xl [--lip:7px]",
        icon: "size-12",
        "icon-xs": "size-9 rounded-tile [--lip:3px] [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-11 rounded-tile [--lip:4px]",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
