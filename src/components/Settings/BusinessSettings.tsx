import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Business info used on invoices and the timekeeping export header.
 * All fields persist to localStorage via settingsStore.
 */
export default function BusinessSettings() {
  const {
    businessName,
    businessAddress,
    businessEmail,
    invoiceNumberPrefix,
    monthlyRevenueTarget,
    setBusinessName,
    setBusinessAddress,
    setBusinessEmail,
    setInvoiceNumberPrefix,
    setMonthlyRevenueTarget,
  } = useSettingsStore()

  const inputClass =
    'w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none transition-all-fast'

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-theme-text-primary mb-1">Business Info</h2>
        <p className="text-sm text-theme-text-muted">
          Used as the header on generated invoices and on the timekeeping
          export. Saved to this device only.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
            Business Name
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
            Business Email
          </label>
          <input
            type="email"
            value={businessEmail}
            onChange={(e) => setBusinessEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Business Address
        </label>
        <textarea
          value={businessAddress}
          onChange={(e) => setBusinessAddress(e.target.value)}
          rows={3}
          placeholder="123 Main St&#10;Suite 100&#10;City, State ZIP"
          className={inputClass}
        />
      </div>

      <div className="border-t border-theme-border-primary pt-5">
        <h3 className="text-base font-semibold text-theme-text-primary mb-3">Invoicing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Invoice Number Prefix
            </label>
            <input
              type="text"
              value={invoiceNumberPrefix}
              onChange={(e) => setInvoiceNumberPrefix(e.target.value)}
              placeholder="INV"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-theme-text-muted">
              Generated invoice numbers look like{' '}
              <span className="font-mono">{invoiceNumberPrefix || 'INV'}-202601-ATC</span>.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Monthly Revenue Target
            </label>
            <input
              type="number"
              value={monthlyRevenueTarget ?? ''}
              onChange={(e) =>
                setMonthlyRevenueTarget(e.target.value ? Number(e.target.value) : null)
              }
              placeholder="e.g. 15000"
              step="100"
              min="0"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-theme-text-muted">
              Drives the pace-vs-target bar on the Revenue view.
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-theme-text-muted italic">
        Changes save automatically.
      </p>
    </div>
  )
}
