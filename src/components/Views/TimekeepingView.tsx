import { useState } from 'react'
import clsx from 'clsx'
import QuickLogForm from '@/components/Timekeeping/QuickLogForm'
import ExpenseEntryForm from '@/components/Timekeeping/ExpenseEntryForm'
import TimekeepingDashboard from '@/components/Timekeeping/TimekeepingDashboard'

type SubView = 'log' | 'dashboard'
type LogMode = 'time' | 'expense'

export default function TimekeepingView() {
  const [subView, setSubView] = useState<SubView>('log')
  const [logMode, setLogMode] = useState<LogMode>('time')

  return (
    <div className="mx-auto max-w-2xl">
      {/* Sub-view toggle */}
      <div className="mb-6 flex items-center justify-center">
        <div className="flex rounded-lg bg-theme-bg-tertiary p-1 transition-theme">
          {(['log', 'dashboard'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setSubView(view)}
              className={clsx(
                'rounded-md px-4 py-2 text-sm font-medium transition-all-fast btn-press',
                subView === view
                  ? 'bg-theme-bg-card text-theme-text-primary shadow-md'
                  : 'text-theme-text-secondary hover:text-theme-text-primary'
              )}
            >
              {view === 'log' ? 'Log' : 'Dashboard'}
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
      ) : (
        <TimekeepingDashboard />
      )}
    </div>
  )
}
