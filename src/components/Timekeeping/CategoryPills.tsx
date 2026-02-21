import clsx from 'clsx'

interface CategoryOption<T extends string> {
  value: T
  label: string
}

interface CategoryPillsProps<T extends string> {
  options: CategoryOption<T>[]
  value: T | null
  onChange: (value: T) => void
  columns?: 2 | 3
}

export default function CategoryPills<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: CategoryPillsProps<T>) {
  return (
    <div
      className={clsx(
        'grid gap-2',
        columns === 2 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-3'
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            'rounded-lg px-3 py-2.5 text-sm font-medium transition-all-fast btn-press text-center',
            value === option.value
              ? 'bg-theme-accent-primary text-white shadow-md'
              : 'bg-theme-bg-tertiary text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary border border-theme-border-primary'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
