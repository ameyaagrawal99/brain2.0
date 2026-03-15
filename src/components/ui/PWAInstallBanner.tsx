/**
 * PWAInstallBanner — shows a subtle "Add to home screen" banner when the
 * browser fires the beforeinstallprompt event (Chrome / Edge / Android).
 *
 * Behaviour:
 *   • Only shown once per 14 days (dismissal stored in localStorage).
 *   • Only shown on the second visit or after 30 seconds on the first visit,
 *     so it doesn't interrupt new users immediately.
 *   • After the user accepts/dismisses the system prompt, the banner hides.
 */

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const DISMISSED_KEY = 'brain2_pwa_dismissed'
const VISIT_KEY     = 'brain2_visit_count'
const COOLDOWN_MS   = 14 * 24 * 60 * 60 * 1000  // 14 days

interface DeferredPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPrompt | null>(null)
  const [visible, setVisible]               = useState(false)

  useEffect(() => {
    // Track visit count
    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? '0', 10) + 1
    localStorage.setItem(VISIT_KEY, String(visits))

    // Check cooldown
    const lastDismissed = parseInt(localStorage.getItem(DISMISSED_KEY) ?? '0', 10)
    if (Date.now() - lastDismissed < COOLDOWN_MS) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as DeferredPrompt)
      // Show immediately on 2nd+ visit; delay 30s on first visit
      if (visits >= 2) {
        setVisible(true)
      } else {
        setTimeout(() => setVisible(true), 30_000)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  }

  if (!visible || !deferredPrompt) return null

  return (
    <div className="relative overflow-hidden bg-brand/5 border-b border-brand/15 px-3 sm:px-4 py-2.5 flex items-center gap-3 animate-slideUp">
      <div className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
        <Download className="w-3.5 h-3.5 text-brand" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink leading-none">Install Brain 2.0</p>
        <p className="text-xs text-ink2 mt-0.5">Add to home screen for instant access, offline support &amp; notifications.</p>
      </div>
      <button
        onClick={handleInstall}
        className="shrink-0 px-3 py-1.5 bg-brand text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-ink3 hover:bg-hover transition-colors"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
