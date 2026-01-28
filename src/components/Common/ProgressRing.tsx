import clsx from 'clsx'

interface ProgressRingProps {
  percentage: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export default function ProgressRing({
  percentage,
  size = 'md',
  showLabel = true,
  className,
}: ProgressRingProps) {
  const sizeConfig = {
    sm: { dimension: 24, strokeWidth: 3, fontSize: 'text-[8px]' },
    md: { dimension: 36, strokeWidth: 4, fontSize: 'text-[10px]' },
    lg: { dimension: 48, strokeWidth: 5, fontSize: 'text-xs' },
  }

  const { dimension, strokeWidth, fontSize } = sizeConfig[size]
  const radius = (dimension - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  // Color based on progress
  const getColor = () => {
    if (percentage === 100) return 'text-theme-accent-success'
    if (percentage >= 66) return 'text-theme-accent-primary'
    if (percentage >= 33) return 'text-theme-accent-warning'
    return 'text-theme-text-muted'
  }

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg
        width={dimension}
        height={dimension}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-theme-border-secondary opacity-30"
        />
        {/* Progress circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={clsx(
            'transition-all duration-500 ease-out',
            getColor()
          )}
        />
      </svg>
      {showLabel && (
        <span
          className={clsx(
            'absolute font-semibold',
            fontSize,
            getColor()
          )}
        >
          {percentage}%
        </span>
      )}
    </div>
  )
}
