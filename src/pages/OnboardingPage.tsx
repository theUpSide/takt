import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const toast = useToastStore()
  const [phone, setPhone] = useState('')
  const [label, setLabel] = useState('Personal')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim() || !user) return

    setSaving(true)
    setError(null)

    try {
      // Format phone to E.164
      let formatted = phone.replace(/\D/g, '')
      if (formatted.length === 10) {
        formatted = '+1' + formatted
      } else if (!formatted.startsWith('+')) {
        formatted = '+' + formatted
      }

      const { error: insertError } = await supabase
        .from('user_phones')
        .insert({
          user_id: user.id,
          phone: formatted,
          label: label.trim() || 'Personal',
        })

      if (insertError) {
        if (insertError.code === '23505') {
          setError('This phone number is already registered.')
        } else {
          setError(insertError.message)
        }
        return
      }

      toast.success('Phone registered! You can now create tasks via SMS.')
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save phone')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    navigate('/app', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f2540] px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Welcome to Takt!</h1>
          <p className="mt-3 text-[#8aa4bd]">
            Register your phone number to create tasks and events via SMS.
          </p>
        </div>

        <div className="rounded-xl border border-[#2a5080] bg-[#1A3B63] p-6">
          <form onSubmit={handleAddPhone} className="space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium text-[#c8d9e8]"
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full rounded-lg border border-[#2a5080] bg-[#0f2540] px-4 py-3 text-white placeholder:text-[#8aa4bd] focus:border-[#F2A14A] focus:outline-none focus:ring-2 focus:ring-[#F2A14A]/30 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="label"
                className="mb-1.5 block text-sm font-medium text-[#c8d9e8]"
              >
                Label
              </label>
              <select
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-lg border border-[#2a5080] bg-[#0f2540] px-4 py-3 text-white focus:border-[#F2A14A] focus:outline-none focus:ring-2 focus:ring-[#F2A14A]/30 transition-all"
              >
                <option value="Personal">Personal</option>
                <option value="Work">Work</option>
                <option value="Family">Family</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !phone.trim()}
              className="w-full rounded-lg bg-[#165A89] py-3 font-semibold text-white hover:bg-[#1e7ab8] disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
            >
              {saving ? 'Saving...' : 'Register Phone'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={handleSkip}
              className="text-sm text-[#8aa4bd] hover:text-[#c8d9e8] transition-colors"
            >
              Skip for now — I'll add it later in Settings
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[#8aa4bd]">
          You can always add or change phone numbers in Settings.
        </p>
      </div>
    </div>
  )
}
