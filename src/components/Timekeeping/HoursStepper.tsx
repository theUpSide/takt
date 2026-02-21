import clsx from 'clsx'

interface HoursStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

export default function HoursStepper({
  value,
  onChange,
  min = 0.25,
  max = 12,
  step = 0.25,
}: HoursStepperProps) {
  const decrement = () => {
    const next = Math.max(min, value - step)
    onChange(Math.round(next * 100) / 100)
  }

  const increment = () => {
    const next = Math.min(max, value + step)
    onChange(Math.round(next * 100) / 100)
  }

  const handleDirectInput = () => {
    const input = prompt('Enter hours:', String(value))
    if (input !== null) {
      const parsed = parseFloat(input)
      if (!isNaN(parsed) && parsed >= min && parsed <= max) {
        // Round to nearest quarter hour
        onChange(Math.round(parsed * 4) / 4)
      }
    }
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        className={clsx(
          'flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold transition-all-fast btn-press',
          value <= min
            ? 'bg-theme-bg-tertiary text-theme-text-muted cursor-not-allowed'
            : 'bg-theme-bg-tertiary text-theme-text-primary hover:bg-theme-accent-primary hover:text-white'
        )}
      >
        -
      </button>

      <button
        type="button"
        onClick={handleDirectInput}
        className="flex flex-col items-center gap-0.5 rounded-lg px-4 py-2 hover:bg-theme-bg-tertiary transition-all-fast"
      >
        <span className="text-4xl font-bold tabular-nums text-theme-text-primary">
          {value.toFixed(value % 1 === 0 ? 0 : 2)}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-theme-text-muted">
          hours
        </span>
      </button>

      <button
        type="button"
        onClick={increment}
        disabled={value >= max}
        className={clsx(
          'flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold transition-all-fast btn-press',
          value >= max
            ? 'bg-theme-bg-tertiary text-theme-text-muted cursor-not-allowed'
            : 'bg-theme-bg-tertiary text-theme-text-primary hover:bg-theme-accent-primary hover:text-white'
        )}
      >
        +
      </button>
    </div>
  )
}
