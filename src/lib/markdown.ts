/**
 * Lightweight Markdown → HTML renderer.
 * No dependencies. Converts common Markdown to safe HTML for display.
 * Backward-compatible: plain text without Markdown syntax passes through unchanged.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderMarkdown(text: string): string {
  if (!text) return ''

  // Escape HTML first (security)
  let html = escapeHtml(text)

  // Process line by line for block-level elements
  const lines = html.split('\n')
  const output: string[] = []
  let inUl = false
  let inOl = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Headings
    if (/^## /.test(line)) {
      if (inUl) { output.push('</ul>'); inUl = false }
      if (inOl) { output.push('</ol>'); inOl = false }
      output.push(`<h2>${line.slice(3).trim()}</h2>`)
      continue
    }
    if (/^# /.test(line)) {
      if (inUl) { output.push('</ul>'); inUl = false }
      if (inOl) { output.push('</ol>'); inOl = false }
      output.push(`<h3>${line.slice(2).trim()}</h3>`)
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      if (inUl) { output.push('</ul>'); inUl = false }
      if (inOl) { output.push('</ol>'); inOl = false }
      output.push('<hr>')
      continue
    }

    // Blockquote
    if (/^&gt; /.test(line)) {
      if (inUl) { output.push('</ul>'); inUl = false }
      if (inOl) { output.push('</ol>'); inOl = false }
      const inner = inlineFormat(line.slice(5))
      output.push(`<blockquote>${inner}</blockquote>`)
      continue
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      if (inOl) { output.push('</ol>'); inOl = false }
      if (!inUl) { output.push('<ul>'); inUl = true }
      output.push(`<li>${inlineFormat(line.slice(2))}</li>`)
      continue
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      if (inUl) { output.push('</ul>'); inUl = false }
      if (!inOl) { output.push('<ol>'); inOl = true }
      const content = line.replace(/^\d+\.\s*/, '')
      output.push(`<li>${inlineFormat(content)}</li>`)
      continue
    }

    // Close open lists before non-list lines
    if (inUl) { output.push('</ul>'); inUl = false }
    if (inOl) { output.push('</ol>'); inOl = false }

    // Empty line → paragraph break
    if (line.trim() === '') {
      output.push('<br>')
      continue
    }

    // Regular paragraph text
    output.push(`<p>${inlineFormat(line)}</p>`)
  }

  // Close any remaining open lists
  if (inUl) output.push('</ul>')
  if (inOl) output.push('</ol>')

  return output.join('')
}

/** Apply inline formatting: bold, italic, code */
function inlineFormat(text: string): string {
  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_  (not double)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>')
    // Inline code: `code`
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

/**
 * Strip markdown syntax from text to produce a plain-text preview.
 * Used in BrainCard and other places that need plain text excerpts.
 */
export function stripMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/^#{1,3}\s+/gm, '')       // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')       // italic
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')         // code
    .replace(/^[-*]\s+/gm, '')         // bullets
    .replace(/^\d+\.\s+/gm, '')        // numbered
    .replace(/^&gt;\s+/gm, '')         // blockquotes
    .replace(/^---+$/gm, '')           // dividers
    .replace(/\n{2,}/g, ' ')           // double newlines
    .trim()
}
