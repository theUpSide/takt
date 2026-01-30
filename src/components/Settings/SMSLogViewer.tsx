import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/dateUtils'
import { useToastStore } from '@/stores/toastStore'
import clsx from 'clsx'

interface UserPhone {
  id: string
  phone: string
  label: string
  created_at: string
}

interface ParsedItem {
  type: string
  title: string
  due_date?: string
  start_time?: string
  end_time?: string
  category_hint?: string
  description?: string
}

interface SMSLogEntry {
  id: string
  twilio_sid: string
  from_number: string
  body: string
  parsed_result: {
    // New multi-item format
    items?: ParsedItem[]
    // Legacy single-item format
    type?: string
    title?: string
    due_date?: string
    start_time?: string
    category_hint?: string
  } | null
  item_id: string | null
  items_created?: number
  error: string | null
  processed_at: string
}

// Helper to normalize parsed_result to always return an array of items
function getItemsFromParsedResult(parsed: SMSLogEntry['parsed_result']): ParsedItem[] {
  if (!parsed) return []

  // New format with items array
  if (parsed.items && Array.isArray(parsed.items)) {
    return parsed.items
  }

  // Legacy single-item format
  if (parsed.type && parsed.title) {
    return [{
      type: parsed.type,
      title: parsed.title,
      due_date: parsed.due_date,
      start_time: parsed.start_time,
      category_hint: parsed.category_hint,
    }]
  }

  return []
}

export default function SMSLogViewer() {
  const [logs, setLogs] = useState<SMSLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phones, setPhones] = useState<UserPhone[]>([])
  const [newPhone, setNewPhone] = useState('')
  const [newLabel, setNewLabel] = useState('Personal')
  const [phoneLoading, setPhoneLoading] = useState(true)
  const [phoneSaving, setPhoneSaving] = useState(false)
  const toast = useToastStore()

  // Fetch user's registered phones on mount
  useEffect(() => {
    const fetchPhones = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        if (!session?.session?.user) return

        const { data } = await supabase
          .from('user_phones')
          .select('*')
          .eq('user_id', session.session.user.id)
          .order('created_at', { ascending: true })

        if (data) {
          setPhones(data)
        }
      } catch {
        // No phones yet, that's fine
      } finally {
        setPhoneLoading(false)
      }
    }
    fetchPhones()
  }, [])

  const handleAddPhone = async () => {
    if (!newPhone.trim()) return
    setPhoneSaving(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.user) {
        toast.error('You must be logged in')
        return
      }

      // Format phone to E.164 (add +1 if not present)
      let formattedPhone = newPhone.replace(/\D/g, '') // Strip non-digits
      if (formattedPhone.length === 10) {
        formattedPhone = '+1' + formattedPhone
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone
      }

      const { data, error: insertError } = await supabase
        .from('user_phones')
        .insert({
          user_id: session.session.user.id,
          phone: formattedPhone,
          label: newLabel.trim() || 'Personal',
        })
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          toast.error('This phone number is already registered')
        } else {
          throw insertError
        }
        return
      }

      setPhones((prev) => [...prev, data])
      setNewPhone('')
      setNewLabel('Personal')
      toast.success(`Phone ${formattedPhone} added!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add phone')
    } finally {
      setPhoneSaving(false)
    }
  }

  const handleRemovePhone = async (phoneId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('user_phones')
        .delete()
        .eq('id', phoneId)

      if (deleteError) throw deleteError

      setPhones((prev) => prev.filter((p) => p.id !== phoneId))
      toast.success('Phone number removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove phone')
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('sms_log')
        .select('*')
        .order('processed_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError
      setLogs(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch SMS logs')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-theme-text-muted">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading SMS logs...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-theme-accent-danger/30 bg-theme-accent-danger/10 p-4">
        <div className="flex items-center gap-2 text-theme-accent-danger">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Error loading logs</span>
        </div>
        <p className="mt-1 text-sm text-theme-text-secondary">{error}</p>
        <button
          onClick={fetchLogs}
          className="mt-3 text-sm text-theme-accent-primary hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Phone Registration Section */}
      <div className="border-b border-theme-border-primary pb-6">
        <h2 className="text-lg font-semibold text-theme-text-primary mb-1">Your Phone Numbers</h2>
        <p className="text-sm text-theme-text-muted mb-4">
          Register phone numbers that can text the Takt app. Each number can create tasks, events, and projects via SMS.
        </p>

        {phoneLoading ? (
          <div className="animate-pulse h-10 bg-theme-bg-tertiary rounded-lg" />
        ) : (
          <>
            {/* Registered phones list */}
            {phones.length > 0 && (
              <div className="space-y-2 mb-4">
                {phones.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-theme-accent-success/30 bg-theme-accent-success/10 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="h-4 w-4 text-theme-accent-success shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <span className="text-sm font-medium text-theme-text-primary">{p.phone}</span>
                        <span className="ml-2 rounded-md bg-theme-bg-tertiary px-2 py-0.5 text-xs text-theme-text-muted">
                          {p.label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePhone(p.id)}
                      className="rounded-md p-1.5 text-theme-text-muted hover:text-theme-accent-danger hover:bg-theme-accent-danger/10 transition-all-fast"
                      title="Remove phone"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new phone form */}
            <div className="flex gap-2">
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                className="flex-1 rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-4 py-2.5 text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/20 transition-all-fast"
              />
              <select
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2.5 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/20 transition-all-fast"
              >
                <option value="Personal">Personal</option>
                <option value="Work">Work</option>
                <option value="Family">Family</option>
                <option value="Other">Other</option>
              </select>
              <button
                onClick={handleAddPhone}
                disabled={phoneSaving || !newPhone.trim()}
                className="rounded-lg bg-theme-accent-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-all-fast btn-press"
              >
                {phoneSaving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </>
        )}

        {phones.length === 0 && !phoneLoading && (
          <p className="mt-2 text-xs text-theme-accent-warning">
            No phones registered. Add a phone number to enable SMS features.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-theme-text-primary mb-1">SMS Log</h2>
          <p className="text-sm text-theme-text-muted">
            View messages received via SMS and their parsed results
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-hover transition-all-fast btn-press"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-theme-text-muted opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="mt-2 text-theme-text-muted">No SMS messages received yet</p>
          <p className="mt-1 text-sm text-theme-text-muted">
            Text your Twilio number to create tasks via SMS
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const parsedItems = getItemsFromParsedResult(log.parsed_result)
            const hasItems = parsedItems.length > 0
            const itemsCreated = log.items_created ?? (log.item_id ? 1 : 0)

            return (
              <div
                key={log.id}
                className={clsx(
                  'rounded-lg border p-4 transition-all-fast',
                  log.error
                    ? 'border-theme-accent-danger/30 bg-theme-accent-danger/5'
                    : 'border-theme-border-primary hover:bg-theme-bg-hover'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Message body */}
                    <p className="text-theme-text-primary font-medium">
                      "{log.body}"
                    </p>

                    {/* Parsed items */}
                    {hasItems && (
                      <div className="mt-3 space-y-2">
                        {parsedItems.map((item, idx) => (
                          <div key={idx} className="flex flex-wrap items-center gap-2">
                            <span className={clsx(
                              'rounded-md px-2 py-0.5 text-xs font-medium',
                              item.type === 'task'
                                ? 'bg-theme-accent-primary/20 text-theme-accent-primary'
                                : 'bg-theme-accent-secondary/20 text-theme-accent-secondary'
                            )}>
                              {item.type}
                            </span>
                            <span className="text-sm text-theme-text-secondary">
                              → {item.title}
                            </span>
                            {item.due_date && (
                              <span className="text-xs text-theme-text-muted">
                                (due: {item.due_date})
                              </span>
                            )}
                            {item.start_time && (
                              <span className="text-xs text-theme-text-muted">
                                (at: {new Date(item.start_time).toLocaleString()})
                              </span>
                            )}
                            {item.category_hint && (
                              <span className="rounded-md bg-theme-bg-tertiary px-2 py-0.5 text-xs text-theme-text-muted">
                                {item.category_hint}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* No parsed items warning */}
                    {!hasItems && !log.error && (
                      <p className="mt-2 text-sm text-theme-text-muted italic">
                        No items parsed from this message
                      </p>
                    )}

                    {/* Error message */}
                    {log.error && (
                      <p className="mt-2 text-sm text-theme-accent-danger">
                        Error: {log.error}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-theme-text-muted">
                      <span>From: {log.from_number}</span>
                      <span>•</span>
                      <span>{formatDateTime(log.processed_at)}</span>
                      {itemsCreated > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-theme-accent-success">
                            {itemsCreated === 1 ? 'Item created' : `${itemsCreated} items created`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="shrink-0">
                    {log.error ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-theme-accent-danger/20">
                        <svg className="h-4 w-4 text-theme-accent-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    ) : itemsCreated > 0 ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-theme-accent-success/20">
                        <svg className="h-4 w-4 text-theme-accent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-theme-accent-warning/20">
                        <svg className="h-4 w-4 text-theme-accent-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="border-t border-theme-border-primary pt-4">
        <p className="text-xs text-theme-text-muted">
          Showing the last {logs.length} messages. SMS messages are processed by Claude AI and automatically converted to tasks or events.
        </p>
      </div>
    </div>
  )
}
