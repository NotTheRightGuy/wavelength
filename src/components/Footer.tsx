import { HeartIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const AUTHOR = 'nottherightguy'
const GITHUB_URL = 'https://github.com/NotTheRightGuy'

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn('flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-4 text-center text-base font-semibold text-on-table-soft', className)}>
      <span className="inline-flex items-center gap-1.5">
        Created with
        <HeartIcon aria-label="love" className="size-4 fill-plastic-orange text-plastic-orange" />
        by {AUTHOR}
      </span>
      <span aria-hidden="true">·</span>
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-sm underline decoration-2 underline-offset-4 outline-none hover:text-on-table focus-visible:ring-4 focus-visible:ring-plastic-yellow"
      >
        GitHub
      </a>
    </footer>
  )
}
