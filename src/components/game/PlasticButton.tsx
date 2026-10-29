import { LoaderCircleIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { audio } from '@/lib/audio'
import { haptics } from '@/lib/haptics'
import { cn } from '@/lib/utils'

export type PlasticVariant = 'primary' | 'secondary' | 'tertiary' | 'quiet' | 'teal' | 'danger'
export type PlasticSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon-sm' | 'icon' | 'icon-lg'

const VARIANT = {
  primary: 'default',
  secondary: 'secondary',
  tertiary: 'cobalt',
  quiet: 'quiet',
  teal: 'teal',
  danger: 'destructive',
} as const

const SIZE = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
  xl: 'xl',
  'icon-sm': 'icon-sm',
  icon: 'icon',
  'icon-lg': 'icon-lg',
} as const

export type PlasticButtonProps = Omit<ComponentProps<typeof Button>, 'variant' | 'size'> & {
  /** primary = orange, secondary = sunshine yellow, tertiary = cobalt, quiet = cream piece. */
  variant?: PlasticVariant
  size?: PlasticSize
  /** Shows a spinner, sets aria-busy and blocks presses; the label stays for layout and screen readers. */
  loading?: boolean
  /** Stretch to the container width. */
  block?: boolean
  /** Play the tick sound and haptic on press (default true). */
  feedback?: boolean
}

/** A candy-plastic game-piece button: glossy top, bottom lip, squash on press and spring back. */
export function PlasticButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  feedback = true,
  disabled,
  className,
  children,
  onPointerDown,
  ...props
}: PlasticButtonProps) {
  return (
    <Button
      variant={VARIANT[variant]}
      size={SIZE[size]}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(block && 'w-full', className)}
      onPointerDown={(e) => {
        if (feedback && !disabled && !loading) {
          haptics.tick()
          audio.tick(0.7)
        }
        onPointerDown?.(e)
      }}
      {...props}
    >
      {loading && <LoaderCircleIcon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
      {children}
    </Button>
  )
}
