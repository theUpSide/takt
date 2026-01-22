import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const { user, loading, signIn, signUp, signInWithMagicLink } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (user) {
    return <Navigate to="/app" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (mode === 'magic') {
      const { error } = await signInWithMagicLink(email)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for a magic link!')
      }
      return
    }

    const action = mode === 'signin' ? signIn : signUp
    const { error } = await action(email, password)
    if (error) {
      setError(error.message)
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left side - Branding */}
      <div
        className="flex flex-col items-center justify-center px-8 py-12 md:w-1/2 md:py-0"
        style={{ background: 'linear-gradient(135deg, #1A3B63 0%, #0f2540 100%)' }}
      >
        <div className="max-w-md text-center">
          <img
            src="/brand/takt_lockup_small_transparent_bg.png"
            alt="Takt"
            className="mx-auto h-48 md:h-64 w-auto drop-shadow-2xl"
          />
          <p className="mt-6 text-lg text-[#c8d9e8] md:text-xl">
            Personal Task and Calendar Management
          </p>
          <p className="mt-4 text-sm text-[#8aa4bd]">
            Organize your day. Achieve your goals. Stay in rhythm.
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex flex-1 items-center justify-center bg-[#0f2540] px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-2xl font-bold text-white">
              {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Magic link'}
            </h2>
            <p className="mt-2 text-[#8aa4bd]">
              {mode === 'signin'
                ? 'Sign in to continue to Takt'
                : mode === 'signup'
                  ? 'Get started with Takt today'
                  : 'We\'ll send you a secure link'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-[#c8d9e8]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-[#2a5080] bg-[#1A3B63] px-4 py-3 text-white placeholder:text-[#8aa4bd] focus:border-[#F2A14A] focus:outline-none focus:ring-2 focus:ring-[#F2A14A]/30 transition-all"
                placeholder="you@example.com"
              />
            </div>

            {mode !== 'magic' && (
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-[#c8d9e8]"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-[#2a5080] bg-[#1A3B63] px-4 py-3 text-white placeholder:text-[#8aa4bd] focus:border-[#F2A14A] focus:outline-none focus:ring-2 focus:ring-[#F2A14A]/30 transition-all"
                  placeholder="Enter your password"
                />
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#165A89] py-3 font-semibold text-white hover:bg-[#1e7ab8] disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
            >
              {loading
                ? 'Loading...'
                : mode === 'signin'
                  ? 'Sign In'
                  : mode === 'signup'
                    ? 'Create Account'
                    : 'Send Magic Link'}
            </button>
          </form>

          <div className="mt-8 space-y-3 text-center">
            {mode === 'signin' && (
              <>
                <button
                  onClick={() => setMode('signup')}
                  className="text-[#F2A14A] hover:text-[#f5b76d] transition-colors"
                >
                  Don't have an account? <span className="font-semibold">Sign up</span>
                </button>
                <br />
                <button
                  onClick={() => setMode('magic')}
                  className="text-[#8aa4bd] hover:text-[#c8d9e8] text-sm transition-colors"
                >
                  Sign in with magic link
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                onClick={() => setMode('signin')}
                className="text-[#F2A14A] hover:text-[#f5b76d] transition-colors"
              >
                Already have an account? <span className="font-semibold">Sign in</span>
              </button>
            )}
            {mode === 'magic' && (
              <button
                onClick={() => setMode('signin')}
                className="text-[#F2A14A] hover:text-[#f5b76d] transition-colors"
              >
                Sign in with password instead
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
