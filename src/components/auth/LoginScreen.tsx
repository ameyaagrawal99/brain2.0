import { useAuth } from '@/hooks/useAuth'
import { useBrainStore } from '@/store/useBrainStore'
import { BookOpen, Sparkles, RefreshCw, Smartphone } from 'lucide-react'

export function LoginScreen() {
  const { signIn } = useAuth()
  const error = useBrainStore((s) => s.authState.error)
  const demoMode = useBrainStore((s) => s.settings.demoMode)
  const updateSettings = useBrainStore((s) => s.updateSettings)

  const features = [
    { icon: BookOpen,   label: 'Journal-style reading',   desc: 'Beautiful card + table views for your entries' },
    { icon: Sparkles,   label: 'AI-powered enhancements', desc: 'Rewrite, tag, and organize with OpenAI' },
    { icon: RefreshCw,  label: 'Two-way sync',            desc: 'Read and write back to Google Sheets live' },
    { icon: Smartphone, label: 'Mobile-first',            desc: 'Works beautifully on phone and desktop' },
  ]

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3 animate-slide-up">
        <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shadow-md">
          <BookOpen className="w-7 h-7 text-brand" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Brain 2.0</h1>
          <p className="text-sm text-ink2 mt-1">Your personal knowledge base</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl shadow-card p-8 animate-scale-in">
        <h2 className="text-lg font-semibold text-ink mb-1">Sign in to continue</h2>
        <p className="text-sm text-ink2 mb-6">Connect your Google account to sync with your Sheets knowledge base.</p>

        {/* Error */}
        {error && error !== 'VITE_GOOGLE_CLIENT_ID not set' && (
          <div className="mb-4 p-3 rounded-lg bg-danger/8 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}
        {error === 'VITE_GOOGLE_CLIENT_ID not set' && (
          <div className="mb-4 p-3 rounded-lg bg-warn/8 border border-warn/20 text-warn text-sm">
            <strong>Setup needed:</strong> Add your Google Client ID to <code className="font-mono text-xs bg-warn/10 px-1 py-0.5 rounded">.env.local</code>
          </div>
        )}

        {/* Google Sign-In button */}
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-border2 bg-surface hover:bg-hover text-ink text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-sm"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-ink3">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={() => updateSettings({ demoMode: true })}
          className="mt-4 w-full px-4 py-3 rounded-lg border border-brand/30 bg-brand/5 text-brand text-sm font-medium hover:bg-brand/10 transition-colors"
        >
          View sample dashboard
        </button>

        <p className="mt-5 text-center text-xs text-ink3 leading-relaxed">
          Your data stays in your Google Sheet. We never store it.
        </p>
      </div>

      {/* Features */}
      <div className="mt-10 w-full max-w-sm grid grid-cols-2 gap-3 animate-fade-in">
        {features.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-brand flex-shrink-0" />
              <span className="text-xs font-medium text-ink">{label}</span>
            </div>
            <p className="text-xs text-ink2 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
    </svg>
  )
}
