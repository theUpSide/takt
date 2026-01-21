import { useState, useEffect } from 'react'
import clsx from 'clsx'

interface CheckboxProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export default function Checkbox({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className,
}: CheckboxProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [wasChecked, setWasChecked] = useState(checked)

  useEffect(() => {
    if (checked && !wasChecked) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
    setWasChecked(checked)
  }, [checked, wasChecked])

  const sizeClasses = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const checkSize = size === 'sm' ? 12 : 14

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onChange()
      }}
      disabled={disabled}
      className={clsx(
        'shrink-0 rounded border-2 flex items-center justify-center transition-all-fast',
        sizeClasses,
        checked
          ? 'bg-theme-accent-success border-theme-accent-success'
          : 'border-theme-border-secondary bg-transparent hover:border-theme-accent-primary',
        isAnimating && 'animate-checkbox-pop',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && (
        <svg
          className={clsx('text-white', isAnimating && 'animate-checkmark')}
          width={checkSize}
          height={checkSize}
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M2.5 7.5L5.5 10.5L11.5 3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: isAnimating ? 24 : 0,
            }}
          />
        </svg>
      )}
    </button>
  )
}
