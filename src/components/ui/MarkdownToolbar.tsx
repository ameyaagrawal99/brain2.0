import { useRef, useState } from 'react'
import { Bold, Italic, Heading2, List, ListOrdered, Minus, Quote } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── Format application logic ───────────────────────────────────────── */

type Format = 'bold' | 'italic' | 'heading' | 'bullet' | 'numbered' | 'divider' | 'quote'

function applyFormat(
  textarea: HTMLTextAreaElement,
  format: Format,
  onChange: (val: string) => void,
) {
  const { value, selectionStart: ss, selectionEnd: se } = textarea
  const selected = value.slice(ss, se)
  const before   = value.slice(0, ss)
  const after    = value.slice(se)

  let newValue  = value
  let newSS     = ss
  let newSE     = se

  switch (format) {
    case 'bold': {
      const wrapped = `**${selected || 'bold text'}**`
      newValue = before + wrapped + after
      newSS = ss + 2
      newSE = ss + 2 + (selected || 'bold text').length
      break
    }
    case 'italic': {
      const wrapped = `*${selected || 'italic text'}*`
      newValue = before + wrapped + after
      newSS = ss + 1
      newSE = ss + 1 + (selected || 'italic text').length
      break
    }
    case 'heading': {
      // Prepend ## to the line containing the selection
      const lineStart = before.lastIndexOf('\n') + 1
      const prefix    = value.slice(0, lineStart)
      const rest      = value.slice(lineStart)
      const hasPrefix = rest.startsWith('## ')
      newValue = hasPrefix
        ? prefix + rest.slice(3)                    // toggle off
        : prefix + '## ' + rest
      const delta = hasPrefix ? -3 : 3
      newSS = ss + delta
      newSE = se + delta
      break
    }
    case 'bullet': {
      // Prepend "- " to every selected line
      const lines  = selected ? selected.split('\n') : ['']
      const result = lines.map((l) => (l.startsWith('- ') ? l.slice(2) : `- ${l}`)).join('\n')
      newValue = before + result + after
      newSS    = ss
      newSE    = ss + result.length
      break
    }
    case 'numbered': {
      const lines  = selected ? selected.split('\n') : ['']
      const result = lines.map((l, i) => {
        const stripped = l.replace(/^\d+\.\s*/, '')
        return `${i + 1}. ${stripped}`
      }).join('\n')
      newValue = before + result + after
      newSS    = ss
      newSE    = ss + result.length
      break
    }
    case 'divider': {
      const sep = '\n\n---\n\n'
      newValue = before + sep + after
      newSS = newSE = ss + sep.length
      break
    }
    case 'quote': {
      const lines  = selected ? selected.split('\n') : ['']
      const result = lines.map((l) => (l.startsWith('> ') ? l.slice(2) : `> ${l}`)).join('\n')
      newValue = before + result + after
      newSS    = ss
      newSE    = ss + result.length
      break
    }
  }

  onChange(newValue)

  // Restore cursor/selection after React re-render
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(newSS, newSE)
  })
}

/* ─── Toolbar button ─────────────────────────────────────────────────── */

interface ToolbarBtn {
  format: Format
  icon:   React.ElementType
  title:  string
}

const TOOLBAR_BUTTONS: ToolbarBtn[] = [
  { format: 'bold',     icon: Bold,        title: 'Bold (** **)' },
  { format: 'italic',   icon: Italic,      title: 'Italic (* *)' },
  { format: 'heading',  icon: Heading2,    title: 'Heading (##)' },
  { format: 'bullet',   icon: List,        title: 'Bullet list (-)' },
  { format: 'numbered', icon: ListOrdered, title: 'Numbered list (1.)' },
  { format: 'quote',    icon: Quote,       title: 'Blockquote (>)' },
  { format: 'divider',  icon: Minus,       title: 'Divider (---)' },
]

/* ─── Component ──────────────────────────────────────────────────────── */

interface MarkdownToolbarProps {
  value:       string
  onChange:    (val: string) => void
  rows?:       number
  placeholder?: string
  className?:  string
  disabled?:   boolean
}

export function MarkdownToolbar({
  value,
  onChange,
  rows = 5,
  placeholder,
  className,
  disabled = false,
}: MarkdownToolbarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [focused, setFocused] = useState(false)

  return (
    <div className={cn('group flex flex-col gap-0', className)}>
      {/* Toolbar — always visible when focused, subtly present when not */}
      <div
        className={cn(
          'flex flex-wrap gap-0.5 px-1.5 py-1 bg-surface border border-border border-b-0',
          'rounded-t-lg transition-opacity duration-150',
          focused ? 'opacity-100' : 'opacity-40 group-hover:opacity-70',
        )}
      >
        {TOOLBAR_BUTTONS.map(({ format, icon: Icon, title }) => (
          <button
            key={format}
            type="button"
            title={title}
            disabled={disabled}
            onMouseDown={(e) => {
              // Prevent textarea blur before we read selection
              e.preventDefault()
              if (textareaRef.current) {
                applyFormat(textareaRef.current, format, onChange)
              }
            }}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded text-ink3',
              'hover:bg-hover hover:text-ink transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <div className="ml-auto flex items-center pr-1">
          <span className="text-[10px] text-ink3 font-mono select-none">md</span>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full bg-surface2 border border-border rounded-b-lg px-3 py-2.5',
          'text-sm text-ink placeholder:text-ink3',
          'focus:outline-none focus:ring-2 focus:ring-brand/40',
          'resize-none font-mono leading-relaxed',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Rounded top only when toolbar is not shown (standalone use)
          'rounded-t-none',
        )}
      />
    </div>
  )
}
