import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/dateUtils'
import clsx from 'clsx'

interface SMSLogEntry {
  id: string
  twilio_sid: string
  from_number: string
  body: string
  parsed_result: {
    type: string
    title: string
    due_date?: string
    start_time?: string
    category_hint?: string
    confidence?: number
  } | null
  item_id: string | null
  error: string | null
  processed_at: string
}

export default function SMSLogViewer() {
  const [logs, setLogs] = useState<SMSLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          {logs.map((log) => (
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
                  <p className="text-theme-text-primary font-medium truncate">
                    "{log.body}"
                  </p>

                  {/* Parsed result */}
                  {log.parsed_result && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={clsx(
                        'rounded-md px-2 py-0.5 text-xs font-medium',
                        log.parsed_result.type === 'task'
                          ? 'bg-theme-accent-primary/20 text-theme-accent-primary'
                          : 'bg-theme-accent-secondary/20 text-theme-accent-secondary'
                      )}>
                        {log.parsed_result.type}
                      </span>
                      <span className="text-sm text-theme-text-secondary">
                        → {log.parsed_result.title}
                      </span>
                      {log.parsed_result.due_date && (
                        <span className="text-xs text-theme-text-muted">
                          (due: {log.parsed_result.due_date})
                        </span>
                      )}
                      {log.parsed_result.category_hint && (
                        <span className="rounded-md bg-theme-bg-tertiary px-2 py-0.5 text-xs text-theme-text-muted">
                          {log.parsed_result.category_hint}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Error message */}
                  {log.error && (
                    <p className="mt-2 text-sm text-theme-accent-danger">
                      Error: {log.error}
                    </p>
                  )}

                  {/* Meta info */}
                  <div className="mt-2 flex items-center gap-3 text-xs text-theme-text-muted">
                    <span>From: {log.from_number}</span>
                    <span>•</span>
                    <span>{formatDateTime(log.processed_at)}</span>
                    {log.item_id && (
                      <>
                        <span>•</span>
                        <span className="text-theme-accent-success">Item created</span>
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
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-theme-accent-success/20">
                      <svg className="h-4 w-4 text-theme-accent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
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
