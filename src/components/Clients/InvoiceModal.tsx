import { useState, useMemo, useEffect } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import Modal from '@/components/Common/Modal'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { TIME_CATEGORIES } from '@/types/timekeeping'
import type { Engagement } from '@/types/engagement'
import type { Client } from '@/types/engagement'
import type { TimeEntry } from '@/types/timekeeping'

interface Props {
  isOpen: boolean
  onClose: () => void
  engagement: Engagement
  client: Client | null
}

/**
 * Generate a printable invoice for a single engagement. Filters time entries
 * by engagement + date range, multiplies hours × rate (entry.rate_override
 * falls back to engagement.billing_rate), groups by date, and renders a
 * clean printable view in a new window.
 */
export default function InvoiceModal({ isOpen, onClose, engagement, client }: Props) {
  const { timeEntries } = useTimekeepingStore()
  const {
    businessName,
    businessAddress,
    businessEmail,
    invoiceNumberPrefix,
  } = useSettingsStore()

  // Default to last complete month - typical invoicing cadence.
  const defaultStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
  const defaultEnd = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')

  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')

  // Auto-generate an invoice number when the modal opens or date range changes.
  useEffect(() => {
    if (!isOpen) return
    const rangeTag = format(parseISO(startDate), 'yyyyMM')
    const clientTag = (client?.name ?? 'CLT').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '')
    setInvoiceNumber(`${invoiceNumberPrefix}-${rangeTag}-${clientTag}`)
  }, [isOpen, startDate, client, invoiceNumberPrefix])

  const lineItems = useMemo(() => {
    return timeEntries
      .filter(
        (t) =>
          t.engagement_id === engagement.id &&
          t.entry_date >= startDate &&
          t.entry_date <= endDate
      )
      .sort((a, b) => (a.entry_date < b.entry_date ? -1 : 1))
  }, [timeEntries, engagement.id, startDate, endDate])

  const resolveRate = (entry: TimeEntry): number =>
    entry.rate_override ?? engagement.billing_rate ?? 0

  const totals = useMemo(() => {
    let hours = 0
    let amount = 0
    for (const e of lineItems) {
      hours += Number(e.hours)
      amount += Number(e.hours) * resolveRate(e)
    }
    return { hours, amount }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineItems, engagement.billing_rate])

  const handlePrint = () => {
    const html = buildInvoiceHtml({
      businessName,
      businessAddress,
      businessEmail,
      client,
      engagement,
      invoiceNumber,
      invoiceDate,
      periodStart: startDate,
      periodEnd: endDate,
      lineItems,
      resolveRate,
      totalHours: totals.hours,
      totalAmount: totals.amount,
      notes,
    })
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    // Give the new window a tick to render styles before printing.
    setTimeout(() => win.print(), 200)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Invoice" size="xl">
      <div className="flex flex-col gap-4">
        {/* Date range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Period Start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Period End
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Invoice Date
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Invoice Number
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm font-mono text-theme-text-primary focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Notes on Invoice (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, thank-you note, etc."
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Line-item preview */}
        <div className="rounded-lg border border-theme-border-primary bg-theme-bg-secondary overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-theme-text-muted border-b border-theme-border-primary">
            <div>Date</div>
            <div>Description</div>
            <div className="text-right">Hours</div>
            <div className="text-right">Rate</div>
            <div className="text-right">Amount</div>
          </div>

          {lineItems.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-theme-text-muted">
              No time entries linked to this engagement in this period.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {lineItems.map((e) => {
                const rate = resolveRate(e)
                const amount = Number(e.hours) * rate
                return (
                  <div
                    key={e.id}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 px-3 py-1.5 text-sm border-b border-theme-border-primary last:border-b-0"
                  >
                    <div className="text-theme-text-muted font-mono">{e.entry_date}</div>
                    <div className="text-theme-text-primary truncate">
                      {e.description ?? <em className="text-theme-text-muted">no note</em>}
                      <span className="ml-1.5 text-xs text-theme-text-muted">
                        ({TIME_CATEGORIES.find((c) => c.value === e.category)?.label})
                      </span>
                    </div>
                    <div className="text-right text-theme-text-primary">
                      {Number(e.hours).toFixed(2)}
                    </div>
                    <div className="text-right text-theme-text-muted">
                      ${rate}
                    </div>
                    <div className="text-right text-theme-text-primary font-medium">
                      ${amount.toFixed(2)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {lineItems.length > 0 && (
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 px-3 py-2 text-sm font-semibold bg-theme-bg-tertiary border-t border-theme-border-primary">
              <div />
              <div className="text-theme-text-primary">Total</div>
              <div className="text-right text-theme-text-primary">
                {totals.hours.toFixed(2)}
              </div>
              <div />
              <div className="text-right text-theme-text-primary">
                ${totals.amount.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            disabled={lineItems.length === 0}
            className="rounded-lg bg-theme-accent-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all-fast btn-press disabled:opacity-50"
          >
            Open Printable Invoice
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-theme-border-primary px-4 py-2 text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-tertiary transition-all-fast"
          >
            Close
          </button>
        </div>

        <p className="text-xs text-theme-text-muted">
          Invoice opens in a new window and triggers print-to-PDF. Edit your
          business name, address, and email in Settings → Business.
        </p>
      </div>
    </Modal>
  )
}

interface InvoiceHtmlArgs {
  businessName: string
  businessAddress: string
  businessEmail: string
  client: Client | null
  engagement: Engagement
  invoiceNumber: string
  invoiceDate: string
  periodStart: string
  periodEnd: string
  lineItems: TimeEntry[]
  resolveRate: (entry: TimeEntry) => number
  totalHours: number
  totalAmount: number
  notes: string
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildInvoiceHtml(a: InvoiceHtmlArgs): string {
  const rows = a.lineItems
    .map((e) => {
      const rate = a.resolveRate(e)
      const amount = Number(e.hours) * rate
      const category = TIME_CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category
      return `<tr>
        <td>${e.entry_date}</td>
        <td>${esc(e.description ?? '')} <span style="color:#999;font-size:11px">(${esc(category)})</span></td>
        <td class="num">${Number(e.hours).toFixed(2)}</td>
        <td class="num">$${rate.toFixed(2)}</td>
        <td class="num">$${amount.toFixed(2)}</td>
      </tr>`
    })
    .join('')

  const clientBlock = a.client
    ? `<div class="party">
        <h3>Bill To</h3>
        <div class="name">${esc(a.client.name)}</div>
        ${a.client.primary_contact_name ? `<div>${esc(a.client.primary_contact_name)}</div>` : ''}
        ${a.client.primary_contact_email ? `<div>${esc(a.client.primary_contact_email)}</div>` : ''}
        ${a.client.primary_contact_phone ? `<div>${esc(a.client.primary_contact_phone)}</div>` : ''}
      </div>`
    : `<div class="party"><h3>Bill To</h3><div class="name">—</div></div>`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${esc(a.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 32px;
      color: #1a1a1a;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .business h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .business .contact { color: #555; font-size: 12px; white-space: pre-line; }
    .invoice-meta { text-align: right; }
    .invoice-meta .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .invoice-meta .value { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
    .invoice-meta .number { font-family: monospace; font-size: 16px; }

    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    .party h3 {
      margin: 0 0 6px 0;
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .party .name { font-weight: 600; font-size: 15px; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th, td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid #e5e5e5;
    }
    th {
      background: #f6f6f6;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #555;
      border-bottom: 2px solid #1a1a1a;
    }
    td.num, th.num { text-align: right; }

    .totals {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }
    .totals table {
      width: auto;
      min-width: 280px;
      margin-bottom: 0;
    }
    .totals td { border: none; padding: 4px 10px; }
    .totals .total-row td {
      border-top: 2px solid #1a1a1a;
      padding-top: 8px;
      font-size: 16px;
      font-weight: 700;
    }

    .notes {
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px solid #e5e5e5;
      color: #555;
      font-size: 12px;
    }

    .footer {
      margin-top: 48px;
      text-align: center;
      color: #999;
      font-size: 11px;
    }

    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="business">
      <h1>${esc(a.businessName)}</h1>
      ${a.businessAddress || a.businessEmail
        ? `<div class="contact">${esc(a.businessAddress)}${a.businessAddress && a.businessEmail ? '\n' : ''}${esc(a.businessEmail)}</div>`
        : ''}
    </div>
    <div class="invoice-meta">
      <div class="label">Invoice</div>
      <div class="number">${esc(a.invoiceNumber)}</div>
      <div class="label" style="margin-top:8px">Invoice Date</div>
      <div class="value">${a.invoiceDate}</div>
    </div>
  </div>

  <div class="parties">
    ${clientBlock}
    <div class="party">
      <h3>Engagement</h3>
      <div class="name">${esc(a.engagement.title)}</div>
      <div style="color:#555;font-size:12px">Period: ${a.periodStart} to ${a.periodEnd}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:100px">Date</th>
        <th>Description</th>
        <th class="num" style="width:70px">Hours</th>
        <th class="num" style="width:80px">Rate</th>
        <th class="num" style="width:90px">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5" style="text-align:center;color:#888">No line items</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td style="color:#555">Total Hours</td>
        <td class="num">${a.totalHours.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td>Total Due</td>
        <td class="num">$${a.totalAmount.toFixed(2)}</td>
      </tr>
    </table>
  </div>

  ${a.notes ? `<div class="notes">${esc(a.notes)}</div>` : ''}

  <div class="footer">
    Generated ${format(new Date(), 'yyyy-MM-dd')} &middot; Thank you.
  </div>
</body>
</html>`
}
