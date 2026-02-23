import { BookOpen, Sparkles, Shield, Smartphone } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function LoginScreen() {
  const { signIn } = useAuth()

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Brain 2.0</h1>
          <p className="text-sm text-ink2 mt-1.5">Your personal knowledge base</p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { icon: Sparkles, label: 'AI-powered' },
            { icon: Shield,   label: 'Private & secure' },
            { icon: Smartphone, label: 'Works offline' },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-xs text-ink2 shadow-sm">
              <Icon className="w-3 h-3 text-brand" />
              {label}
            </span>
          ))}
        </div>

        {/* Google sign-in */}
        <div id="g_id_signin_btn" className="flex justify-center" />

        {/* Manual sign-in button fallback */}
        <button
          onClick={signIn}
          className="w-full mt-4 flex items-center justify-center gap-3 h-11 px-4 bg-surface border border-border rounded-xl text-sm font-medium text-ink hover:bg-hover transition-colors shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-[11px] text-ink3 mt-5 leading-relaxed">
          Your data stays in your Google Sheet.{' '}
          <br />No account needed beyond your Google account.
        </p>
      </div>
    </div>
  )
}
