import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

interface InstructionsBoxProps {
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
}

export function InstructionsBox({
  value,
  onChange,
  placeholder = 'e.g. Always be concise. Focus on engineering topics.',
}: InstructionsBoxProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-ink2 hover:bg-hover transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-brand/70" />
          Custom instructions
          {value.trim() && <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block" />}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="border-t border-border bg-surface2 px-3 py-2">
          <textarea
            rows={2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-xs text-ink placeholder:text-ink3 focus:outline-none resize-none leading-relaxed"
          />
        </div>
      )}
    </div>
  )
}
