import clsx from 'clsx'

interface CategoryBadgeProps {
  color: string
  name?: string
  size?: 'sm' | 'md'
}

export default function CategoryBadge({ color, name, size = 'sm' }: CategoryBadgeProps) {
  if (name) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-full font-medium transition-all-fast',
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        )}
        style={{ backgroundColor: `${color}20`, color }}
      >
        <span
          className={clsx(
            'rounded-full category-dot',
            size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
          )}
          style={{ backgroundColor: color }}
        />
        {name}
      </span>
    )
  }

  return (
    <span
      className={clsx(
        'rounded-full category-dot shadow-sm',
        size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
      )}
      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}50` }}
    />
  )
}
