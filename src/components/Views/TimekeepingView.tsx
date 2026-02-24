import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import QuickLogForm from '@/components/Timekeeping/QuickLogForm'
import ExpenseEntryForm from '@/components/Timekeeping/ExpenseEntryForm'
import TimekeepingDashboard from '@/components/Timekeeping/TimekeepingDashboard'
import ChargeAccountsManager from '@/components/Timekeeping/ChargeAccountsManager'
import TimeGrid from '@/components/Timekeeping/TimeGrid'
import ExpenseReview from '@/components/Timekeeping/ExpenseReview'

type SubView = 'log' | 'dashboard' | 'grid' | 'expenses' | 'accounts'
type LogMode = 'time' | 'expense'

const SUB_VIEWS: { id: SubView; label: string }[] = [
  { id: 'log', label: 'Log' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'grid', label: 'Grid' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'accounts', label: 'Accounts' },
]

export default function TimekeepingView() {
  const [subView, setSubView] = useState<SubView>('log')
  const [logMode, setLogMode] = useState<LogMode>('time')
  const { fetchChargeAccounts, fetchTimeEntries } = useTimekeepingStore()

  useEffect(() => {
    fetchChargeAccounts()
    fetchTimeEntries()
  }, [fetchChargeAccounts, fetchTimeEntries])

  const isWide = subView === 'grid' || subView === 'expenses'

  return (
    <div className={isWide ? 'px-4 md:px-6' : 'mx-auto max-w-2xl'}>
      {/* Sub-view toggle */}
      <div className="mb-6 flex items-center justify-center">
        <div className="flex rounded-lg bg-theme-bg-tertiary p-1 transition-theme">
          {SUB_VIEWS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSubView(id)}
              className={clsx(
                'rounded-md px-3 py-2 text-sm font-medium transition-all-fast btn-press',
                subView === id
                  ? 'bg-theme-bg-card text-theme-text-primary shadow-md'
                  : 'text-theme-text-secondary hover:text-theme-text-primary'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {subView === 'log' ? (
        <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card p-4 md:p-6 shadow-lg animate-fade-in">
          <h2 className="mb-4 text-lg font-semibold text-theme-text-primary">
            {logMode === 'time' ? 'Log Time' : 'Log Expense'}
          </h2>
          {logMode === 'time' ? (
            <QuickLogForm onSwitchToExpense={() => setLogMode('expense')} />
          ) : (
            <ExpenseEntryForm onSwitchToTime={() => setLogMode('time')} />
          )}
        </div>
      ) : subView === 'dashboard' ? (
        <TimekeepingDashboard />
      ) : subView === 'grid' ? (
        <TimeGrid />
      ) : subView === 'expenses' ? (
        <ExpenseReview />
      ) : (
        <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card p-4 md:p-6 shadow-lg animate-fade-in">
          <h2 className="mb-1 text-lg font-semibold text-theme-text-primary">Charge Accounts</h2>
          <ChargeAccountsManager />
        </div>
      )}
    </div>
  )
}
