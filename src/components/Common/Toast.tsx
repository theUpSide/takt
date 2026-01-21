import { useToastStore, type ToastType } from '@/stores/toastStore'
import clsx from 'clsx'

const toastIcons: Record<ToastType, JSX.Element> = {
  success: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const toastStyles: Record<ToastType, string> = {
  success: 'bg-theme-accent-success/20 border-theme-accent-success text-theme-accent-success',
  error: 'bg-theme-accent-danger/20 border-theme-accent-danger text-theme-accent-danger',
  warning: 'bg-theme-accent-warning/20 border-theme-accent-warning text-theme-accent-warning',
  info: 'bg-theme-accent-primary/20 border-theme-accent-primary text-theme-accent-primary',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm',
            'animate-slide-in-left transition-all-fast',
            toastStyles[toast.type]
          )}
          style={{ minWidth: '280px', maxWidth: '400px' }}
        >
          <span className="shrink-0">{toastIcons[toast.type]}</span>
          <p className="flex-1 text-sm font-medium text-theme-text-primary">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 rounded p-1 hover:bg-theme-bg-hover transition-all-fast"
          >
            <svg className="h-4 w-4 text-theme-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
