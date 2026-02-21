import { useEffect, useRef, useMemo } from 'react'
import { format, addDays, isToday, isWeekend } from 'date-fns'
import { useTimekeepingStore } from '@/stores/timekeepingStore'

const DAYS_BACK = 365
const DAYS_FORWARD = 14
const COL_W = 60
const LABEL_W = 172
const TOTAL_W = 60

function fmt(h: number): string {
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

export default function TimeGrid() {
  const { timeEntries, chargeAccounts, fetchTimeEntries } = useTimekeepingStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const didScroll = useRef(false)

  useEffect(() => {
    fetchTimeEntries()
  }, [fetchTimeEntries])

  // Center today on first render (after layout)
  useEffect(() => {
    if (didScroll.current || !scrollRef.current) return
    const containerWidth = scrollRef.current.clientWidth
    if (containerWidth === 0) return
    didScroll.current = true
    const todayPx = LABEL_W + DAYS_BACK * COL_W
    scrollRef.current.scrollLeft = todayPx - containerWidth / 2 + COL_W / 2
  })

  const dates = useMemo(() => {
    const today = new Date()
    return Array.from({ length: DAYS_BACK + DAYS_FORWARD + 1 }, (_, i) =>
      addDays(today, i - DAYS_BACK)
    )
  }, [])

  // Build rows: charge accounts + catch-all
  const rows = useMemo(() => {
    const accountRows = chargeAccounts.map((a) => ({ id: a.id, label: a.name }))
    const hasUnmatched = timeEntries.some((entry) => {
      if (!entry.client_name) return true
      return !chargeAccounts.some(
        (a) => a.client_name?.toLowerCase() === entry.client_name!.toLowerCase()
      )
    })
    if (hasUnmatched || chargeAccounts.length === 0) {
      accountRows.push({
        id: '__other__',
        label: chargeAccounts.length === 0 ? 'All Hours' : 'Other / Internal',
      })
    }
    return accountRows
  }, [chargeAccounts, timeEntries])

  // date → rowId → hours
  const lookup = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const entry of timeEntries) {
      const d = entry.entry_date
      if (!map[d]) map[d] = {}
      let rowId = '__other__'
      if (entry.client_name) {
        const match = chargeAccounts.find(
          (a) => a.client_name?.toLowerCase() === entry.client_name!.toLowerCase()
        )
        if (match) rowId = match.id
      }
      map[d][rowId] = (map[d][rowId] || 0) + Number(entry.hours)
    }
    return map
  }, [timeEntries, chargeAccounts])

  const rowTotals = useMemo(() => {
    const t: Record<string, number> = {}
    for (const byRow of Object.values(lookup)) {
      for (const [rowId, h] of Object.entries(byRow)) {
        t[rowId] = (t[rowId] || 0) + h
      }
    }
    return t
  }, [lookup])

  const colTotals = useMemo(() => {
    const t: Record<string, number> = {}
    for (const [d, byRow] of Object.entries(lookup)) {
      t[d] = Object.values(byRow).reduce((s, h) => s + h, 0)
    }
    return t
  }, [lookup])

  const grandTotal = Object.values(rowTotals).reduce((s, h) => s + h, 0)

  const jumpToToday = () => {
    if (!scrollRef.current) return
    const containerWidth = scrollRef.current.clientWidth
    const todayPx = LABEL_W + DAYS_BACK * COL_W
    scrollRef.current.scrollLeft = todayPx - containerWidth / 2 + COL_W / 2
  }

  const tableWidth = LABEL_W + (DAYS_BACK + DAYS_FORWARD + 1) * COL_W + TOTAL_W

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-theme-text-muted">
          Scroll left for history · right for upcoming
        </p>
        <button
          type="button"
          onClick={jumpToToday}
          className="text-xs font-semibold text-theme-accent-primary hover:opacity-80 transition-all-fast"
        >
          Jump to Today
        </button>
      </div>

      {/* Grid */}
      <div
        ref={scrollRef}
        className="overflow-auto rounded-xl border border-theme-border-primary shadow-lg"
        style={{ maxHeight: 'calc(100vh - 230px)' }}
      >
        <table
          className="border-collapse text-xs"
          style={{ tableLayout: 'fixed', width: tableWidth, minWidth: tableWidth }}
        >
          {/* Colgroup for fixed widths */}
          <colgroup>
            <col style={{ width: LABEL_W }} />
            {dates.map((d) => (
              <col key={format(d, 'yyyy-MM-dd')} style={{ width: COL_W }} />
            ))}
            <col style={{ width: TOTAL_W }} />
          </colgroup>

          {/* ── Header ── */}
          <thead>
            <tr>
              {/* Account label corner */}
              <th
                className="sticky left-0 top-0 z-30 border-b-2 border-r border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-left font-semibold uppercase tracking-wider text-theme-text-muted"
              >
                Account
              </th>

              {/* Date columns */}
              {dates.map((d) => {
                const dateStr = format(d, 'yyyy-MM-dd')
                const today = isToday(d)
                const wknd = isWeekend(d)
                const isFirst = d.getDate() === 1
                return (
                  <th
                    key={dateStr}
                    className={`sticky top-0 z-20 border-b-2 border-theme-border-primary px-0 py-1.5 text-center font-medium ${
                      today
                        ? 'bg-theme-accent-primary/25 text-theme-accent-primary'
                        : wknd
                        ? 'bg-theme-bg-tertiary text-theme-text-muted/50'
                        : 'bg-theme-bg-secondary text-theme-text-muted'
                    }`}
                  >
                    <div className={`leading-tight ${today ? 'font-bold' : ''}`}>
                      {format(d, 'EEE')}
                    </div>
                    <div className={`leading-tight ${isFirst ? 'font-bold' : ''}`}>
                      {isFirst ? format(d, 'MMM 1') : format(d, 'M/d')}
                    </div>
                  </th>
                )
              })}

              {/* Total corner */}
              <th
                className="sticky right-0 top-0 z-30 border-b-2 border-l border-theme-border-primary bg-theme-bg-secondary px-2 py-2 text-center font-semibold uppercase tracking-wider text-theme-text-muted"
              >
                Total
              </th>
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {/* Row label */}
                <td
                  className="sticky left-0 z-10 border-b border-r border-theme-border-primary bg-theme-bg-card px-3 py-2 font-medium text-theme-text-primary truncate"
                >
                  {row.label}
                </td>

                {/* Cells */}
                {dates.map((d) => {
                  const dateStr = format(d, 'yyyy-MM-dd')
                  const hours = lookup[dateStr]?.[row.id]
                  const today = isToday(d)
                  const wknd = isWeekend(d)
                  return (
                    <td
                      key={dateStr}
                      className={`border-b border-theme-border-primary text-center tabular-nums ${
                        today
                          ? 'bg-theme-accent-primary/10'
                          : wknd
                          ? 'bg-theme-bg-tertiary/40'
                          : ''
                      } ${hours ? 'text-theme-text-primary font-semibold' : 'text-theme-text-muted/20'}`}
                      style={{ paddingTop: 7, paddingBottom: 7 }}
                    >
                      {hours ? fmt(hours) : '·'}
                    </td>
                  )
                })}

                {/* Row total */}
                <td
                  className="sticky right-0 z-10 border-b border-l border-theme-border-primary bg-theme-bg-card px-2 py-2 text-center font-semibold tabular-nums text-theme-text-secondary"
                >
                  {rowTotals[row.id] ? fmt(rowTotals[row.id]) : '—'}
                </td>
              </tr>
            ))}
          </tbody>

          {/* ── Footer totals ── */}
          <tfoot>
            <tr>
              <td
                className="sticky left-0 z-10 border-t-2 border-r border-theme-border-primary bg-theme-bg-tertiary px-3 py-2 font-bold uppercase tracking-wider text-theme-text-muted"
              >
                Total
              </td>
              {dates.map((d) => {
                const dateStr = format(d, 'yyyy-MM-dd')
                const total = colTotals[dateStr]
                const today = isToday(d)
                const wknd = isWeekend(d)
                return (
                  <td
                    key={dateStr}
                    className={`border-t-2 border-theme-border-primary text-center tabular-nums font-semibold ${
                      today
                        ? 'bg-theme-accent-primary/15 text-theme-accent-primary'
                        : wknd
                        ? 'bg-theme-bg-tertiary text-theme-text-muted/50'
                        : 'bg-theme-bg-tertiary text-theme-text-secondary'
                    }`}
                    style={{ paddingTop: 7, paddingBottom: 7 }}
                  >
                    {total ? fmt(total) : ''}
                  </td>
                )
              })}
              <td
                className="sticky right-0 z-10 border-t-2 border-l border-theme-border-primary bg-theme-bg-tertiary px-2 py-2 text-center font-bold tabular-nums text-theme-text-primary"
              >
                {grandTotal ? fmt(grandTotal) : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
