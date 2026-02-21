import { useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import { getTodayString } from '@/lib/dateUtils'
import { EXPENSE_CATEGORIES } from '@/types/timekeeping'
import type { ExpenseFormData } from '@/types/timekeeping'
import CategoryPills from './CategoryPills'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf']

const schema = z.object({
  expense_date: z.string().min(1, 'Date is required'),
  amount: z.number().min(0.01, 'Amount must be positive'),
  category: z.enum([
    'software_tools', 'equipment', 'professional_dev',
    'travel', 'marketing', 'insurance',
    'legal_professional', 'office_supplies', 'other',
  ] as const),
  vendor: z.string(),
  description: z.string(),
  receipt_file: z.any().nullable(),
  is_recurring: z.boolean(),
})

interface ExpenseEntryFormProps {
  onSwitchToTime: () => void
}

export default function ExpenseEntryForm({ onSwitchToTime }: ExpenseEntryFormProps) {
  const { createExpense, getDistinctVendors } = useTimekeepingStore()
  const [saving, setSaving] = useState(false)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { control, handleSubmit, reset, setValue } = useForm<ExpenseFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      expense_date: getTodayString(),
      amount: 0,
      category: 'software_tools',
      vendor: '',
      description: '',
      receipt_file: null,
      is_recurring: false,
    },
  })

  const vendors = getDistinctVendors()

  const compressImage = async (file: File): Promise<File> => {
    // Skip compression for PDFs
    if (file.type === 'application/pdf') return file
    // Skip if already under 2MB
    if (file.size <= 2 * 1024 * 1024) return file

    return new Promise((resolve) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      img.onload = () => {
        // Scale down if very large
        const maxDim = 2000
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }))
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          0.8
        )
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      alert('File must be under 10MB')
      return
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert('Accepted formats: JPEG, PNG, PDF, HEIC')
      return
    }

    const compressed = await compressImage(file)
    setValue('receipt_file', compressed)

    // Show preview for images
    if (compressed.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setReceiptPreview(ev.target?.result as string)
      reader.readAsDataURL(compressed)
    } else {
      setReceiptPreview(null)
    }
  }

  const onSubmit = async (data: ExpenseFormData) => {
    setSaving(true)
    const result = await createExpense(data)
    setSaving(false)

    if (result) {
      setReceiptPreview(null)
      reset({
        expense_date: getTodayString(),
        amount: 0,
        category: data.category,
        vendor: '',
        description: '',
        receipt_file: null,
        is_recurring: false,
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Date selector */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Date
        </label>
        <Controller
          name="expense_date"
          control={control}
          render={({ field }) => (
            <input
              type="date"
              {...field}
              max={getTodayString()}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-3 py-2.5 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none focus-glow transition-all-fast"
            />
          )}
        />
      </div>

      {/* Amount */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Amount
        </label>
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-theme-text-muted">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                placeholder="0.00"
                className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-tertiary py-2.5 pl-7 pr-3 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none focus-glow transition-all-fast"
              />
            </div>
          )}
        />
      </div>

      {/* Category pills */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Category
        </label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <CategoryPills
              options={EXPENSE_CATEGORIES}
              value={field.value}
              onChange={field.onChange}
              columns={3}
            />
          )}
        />
      </div>

      {/* Vendor */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Vendor
        </label>
        <Controller
          name="vendor"
          control={control}
          render={({ field }) => (
            <>
              <input
                type="text"
                {...field}
                list="vendor-names"
                placeholder="Vendor or merchant"
                className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-3 py-2.5 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none focus-glow transition-all-fast"
              />
              <datalist id="vendor-names">
                {vendors.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </>
          )}
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Description
        </label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <input
              type="text"
              {...field}
              placeholder="What was purchased and why?"
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-3 py-2.5 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none focus-glow transition-all-fast"
            />
          )}
        />
      </div>

      {/* Receipt photo */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Receipt
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,application/pdf"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          id="receipt-upload"
        />
        <label
          htmlFor="receipt-upload"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-theme-border-primary bg-theme-bg-tertiary px-4 py-3 text-sm font-medium text-theme-text-secondary hover:border-theme-accent-primary hover:text-theme-accent-primary transition-all-fast"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {receiptPreview ? 'Change Receipt' : 'Add Receipt Photo'}
        </label>
        {receiptPreview && (
          <div className="mt-2 flex items-center gap-2">
            <img
              src={receiptPreview}
              alt="Receipt preview"
              className="h-16 w-16 rounded-lg object-cover border border-theme-border-primary"
            />
            <button
              type="button"
              onClick={() => {
                setReceiptPreview(null)
                setValue('receipt_file', null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="text-xs text-theme-accent-danger hover:underline"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Recurring toggle */}
      <div>
        <Controller
          name="is_recurring"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`relative h-6 w-11 rounded-full transition-all-fast ${
                  field.value ? 'bg-theme-accent-primary' : 'bg-theme-bg-tertiary border border-theme-border-primary'
                }`}
                onClick={() => field.onChange(!field.value)}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    field.value ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-theme-text-secondary">Recurring (subscription)</span>
            </label>
          )}
        />
      </div>

      {/* Save button */}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-theme-accent-primary py-3 text-sm font-semibold text-white hover:opacity-90 shadow-md hover:shadow-glow-primary transition-all-fast btn-press disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Expense'}
      </button>

      {/* Switch to time entry */}
      <button
        type="button"
        onClick={onSwitchToTime}
        className="text-sm font-medium text-theme-accent-primary hover:text-theme-accent-secondary transition-all-fast"
      >
        Back to Time Entry
      </button>
    </form>
  )
}
