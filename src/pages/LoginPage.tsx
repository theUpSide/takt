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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Takt</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Personal Task and Calendar Management
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow dark:bg-gray-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {mode !== 'magic' && (
              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/30 dark:text-green-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-500 py-2 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {loading
                ? 'Loading...'
                : mode === 'signin'
                  ? 'Sign In'
                  : mode === 'signup'
                    ? 'Sign Up'
                    : 'Send Magic Link'}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm">
            {mode === 'signin' && (
              <>
                <button
                  onClick={() => setMode('signup')}
                  className="text-blue-500 hover:text-blue-600"
                >
                  Don't have an account? Sign up
                </button>
                <br />
                <button
                  onClick={() => setMode('magic')}
                  className="text-gray-500 hover:text-gray-600 dark:text-gray-400"
                >
                  Sign in with magic link
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                onClick={() => setMode('signin')}
                className="text-blue-500 hover:text-blue-600"
              >
                Already have an account? Sign in
              </button>
            )}
            {mode === 'magic' && (
              <button
                onClick={() => setMode('signin')}
                className="text-blue-500 hover:text-blue-600"
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
