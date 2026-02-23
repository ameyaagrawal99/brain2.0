import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open:     boolean
  onClose:  () => void
  title?:   string
  size?:    'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
  className?: string
}

const sizeMap = {
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-5xl',
}

export function Modal({ open, onClose, title, size = 'lg', children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-overlay bg-black/30"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className={cn(
          'relative w-full bg-surface text-ink overflow-hidden animate-scale-in',
          'rounded-t-2xl sm:rounded-xl shadow-xl',
          'sm:max-h-[90vh] flex flex-col',
          sizeMap[size],
          className,
        )}
        style={{ maxHeight: '92dvh' }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
            <h2 className="text-base font-semibold text-ink truncate pr-4">{title}</h2>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-ink3 hover:bg-hover hover:text-ink transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 w-7 h-7 rounded-md flex items-center justify-center text-ink3 hover:bg-hover hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  )
}
