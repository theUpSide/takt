import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIME_CATEGORY_LABELS: Record<string, string> = {
  product_dev: 'Product Dev',
  bd_outreach: 'BD & Outreach',
  client_work: 'Client Work',
  content: 'Content',
  admin: 'Admin',
  professional_dev: 'Prof. Dev',
}

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  software_tools: 'Software & Tools',
  equipment: 'Equipment',
  professional_dev: 'Prof. Dev',
  travel: 'Travel',
  marketing: 'Marketing',
  insurance: 'Insurance',
  legal_professional: 'Legal & Prof.',
  office_supplies: 'Office Supplies',
  other: 'Other',
}

interface TimeEntry {
  id: string
  entry_date: string
  hours: number
  category: string
  description: string | null
  billable: boolean
  client_name: string | null
  rate_override: number | null
  created_at: string
}

interface Expense {
  id: string
  expense_date: string
  amount: number
  category: string
  vendor: string | null
  description: string | null
  is_recurring: boolean
  created_at: string
}

// Check if a created_at timestamp falls during business hours (9am-5pm weekdays)
function isDuringBusinessHours(createdAt: string): boolean {
  const d = new Date(createdAt)
  const day = d.getDay() // 0=Sun, 6=Sat
  const hour = d.getHours()
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17
}

function generateCSV(
  timeEntries: TimeEntry[],
  expenses: Expense[],
  includeExpenses: boolean,
): string {
  const lines: string[] = []

  // Time entries section
  lines.push('TIME ENTRIES')
  lines.push('Date,Hours,Category,Description,Billable,Client,Rate Override,Logged At,Business Hours*')
  for (const e of timeEntries) {
    const bh = isDuringBusinessHours(e.created_at) ? 'YES*' : ''
    lines.push([
      e.entry_date,
      e.hours,
      TIME_CATEGORY_LABELS[e.category] || e.category,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.billable ? 'Yes' : 'No',
      `"${(e.client_name || '').replace(/"/g, '""')}"`,
      e.rate_override ?? '',
      e.created_at,
      bh,
    ].join(','))
  }

  if (includeExpenses && expenses.length > 0) {
    lines.push('')
    lines.push('EXPENSES')
    lines.push('Date,Amount,Category (Schedule C),Vendor,Description,Recurring,Logged At')
    for (const e of expenses) {
      lines.push([
        e.expense_date,
        e.amount,
        EXPENSE_CATEGORY_LABELS[e.category] || e.category,
        `"${(e.vendor || '').replace(/"/g, '""')}"`,
        `"${(e.description || '').replace(/"/g, '""')}"`,
        e.is_recurring ? 'Yes' : 'No',
        e.created_at,
      ].join(','))
    }
  }

  // Summary
  const totalHours = timeEntries.reduce((s, e) => s + Number(e.hours), 0)
  lines.push('')
  lines.push('SUMMARY')
  lines.push(`Total Hours,${totalHours.toFixed(1)}`)

  // Hours by category
  const hoursByCategory: Record<string, number> = {}
  for (const e of timeEntries) {
    hoursByCategory[e.category] = (hoursByCategory[e.category] || 0) + Number(e.hours)
  }
  for (const [cat, hours] of Object.entries(hoursByCategory)) {
    lines.push(`${TIME_CATEGORY_LABELS[cat] || cat},${hours.toFixed(1)}`)
  }

  if (includeExpenses && expenses.length > 0) {
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
    lines.push(`Total Expenses,$${totalExpenses.toFixed(2)}`)

    // Expenses by category
    const expByCategory: Record<string, number> = {}
    for (const e of expenses) {
      expByCategory[e.category] = (expByCategory[e.category] || 0) + Number(e.amount)
    }
    for (const [cat, amt] of Object.entries(expByCategory)) {
      lines.push(`${EXPENSE_CATEGORY_LABELS[cat] || cat},$${amt.toFixed(2)}`)
    }
  }

  lines.push('')
  lines.push('* Entries marked YES* in Business Hours column were logged during 9am-5pm weekdays.')
  lines.push('  These should be reviewed for potential overlap with employer time.')

  return lines.join('\n')
}

function generatePdfHtml(
  timeEntries: TimeEntry[],
  expenses: Expense[],
  startDate: string,
  endDate: string,
  includeExpenses: boolean,
): string {
  const totalHours = timeEntries.reduce((s, e) => s + Number(e.hours), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)

  // Hours by category
  const hoursByCategory: Record<string, number> = {}
  for (const e of timeEntries) {
    hoursByCategory[e.category] = (hoursByCategory[e.category] || 0) + Number(e.hours)
  }

  // Expenses by Schedule C category
  const expByCategory: Record<string, number> = {}
  for (const e of expenses) {
    expByCategory[e.category] = (expByCategory[e.category] || 0) + Number(e.amount)
  }

  const timeRows = timeEntries.map((e) => {
    const bhFlag = isDuringBusinessHours(e.created_at) ? ' *' : ''
    return `<tr>
      <td>${e.entry_date}</td>
      <td>${e.hours}</td>
      <td>${TIME_CATEGORY_LABELS[e.category] || e.category}</td>
      <td>${escapeHtml(e.description || '')}</td>
      <td>${e.billable ? 'Yes' : ''}</td>
      <td>${escapeHtml(e.client_name || '')}</td>
      <td style="font-size:10px;color:#999">${e.created_at.split('T')[0]}${bhFlag}</td>
    </tr>`
  }).join('')

  const expenseRows = includeExpenses ? expenses.map((e) => `<tr>
      <td>${e.expense_date}</td>
      <td>$${Number(e.amount).toFixed(2)}</td>
      <td>${EXPENSE_CATEGORY_LABELS[e.category] || e.category}</td>
      <td>${escapeHtml(e.vendor || '')}</td>
      <td>${escapeHtml(e.description || '')}</td>
      <td>${e.is_recurring ? 'Yes' : ''}</td>
    </tr>`).join('') : ''

  const categorySummaryRows = Object.entries(hoursByCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, hours]) => `<tr><td>${TIME_CATEGORY_LABELS[cat] || cat}</td><td>${hours.toFixed(1)}h</td></tr>`)
    .join('')

  const expenseSummaryRows = includeExpenses ? Object.entries(expByCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => `<tr><td>${EXPENSE_CATEGORY_LABELS[cat] || cat}</td><td>$${amt.toFixed(2)}</td></tr>`)
    .join('') : ''

  return `<!DOCTYPE html>
<html>
<head>
  <title>Takt Timekeeping Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; color: #333; font-size: 13px; }
    h1 { font-size: 22px; margin-bottom: 2px; }
    h2 { font-size: 16px; margin-top: 28px; border-bottom: 2px solid #333; padding-bottom: 4px; }
    .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #ddd; padding: 5px 8px; text-align: left; font-size: 12px; }
    th { background: #f5f5f5; font-weight: 600; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .summary-box { background: #f9f9f9; padding: 12px; border-radius: 4px; border: 1px solid #e5e5e5; }
    .summary-box h3 { margin: 0 0 8px 0; font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-box .value { font-size: 28px; font-weight: 700; color: #333; }
    .note { font-size: 11px; color: #999; margin-top: 24px; }
    .bh-note { font-size: 11px; color: #c00; margin-top: 8px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Indy-Pendent Solutions &mdash; Timekeeping Report</h1>
  <p class="subtitle">Period: ${startDate} to ${endDate} &bull; Generated: ${new Date().toISOString().split('T')[0]}</p>

  <div class="summary-grid">
    <div class="summary-box">
      <h3>Total Hours</h3>
      <div class="value">${totalHours.toFixed(1)}</div>
    </div>
    ${includeExpenses ? `<div class="summary-box">
      <h3>Total Expenses</h3>
      <div class="value">$${totalExpenses.toFixed(2)}</div>
    </div>` : ''}
  </div>

  <h2>Hours by Category</h2>
  <table style="max-width:400px">
    <thead><tr><th>Category</th><th>Hours</th></tr></thead>
    <tbody>${categorySummaryRows || '<tr><td colspan="2">No entries</td></tr>'}</tbody>
  </table>

  ${includeExpenses && expenseSummaryRows ? `
  <h2>Expenses by Schedule C Category</h2>
  <table style="max-width:400px">
    <thead><tr><th>Category</th><th>Amount</th></tr></thead>
    <tbody>${expenseSummaryRows}</tbody>
  </table>
  ` : ''}

  <h2>Time Entry Detail</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Hours</th><th>Category</th><th>Description</th><th>Billable</th><th>Client</th><th>Logged</th></tr>
    </thead>
    <tbody>${timeRows || '<tr><td colspan="7">No entries</td></tr>'}</tbody>
  </table>

  ${includeExpenses && expenses.length > 0 ? `
  <h2>Expense Detail</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Amount</th><th>Category</th><th>Vendor</th><th>Description</th><th>Recurring</th></tr>
    </thead>
    <tbody>${expenseRows}</tbody>
  </table>
  ` : ''}

  <p class="bh-note">* Entries marked with an asterisk were logged during typical business hours (9am&ndash;5pm weekdays).
  These should be reviewed to confirm work was performed on personal time.</p>

  <p class="note">
    All &ldquo;Logged&rdquo; timestamps are server-generated (created_at) and cannot be modified by the client.
    They serve as contemporaneous evidence that entries were recorded in real-time.
    The &ldquo;Date&rdquo; column reflects when the work was performed (user-editable).
  </p>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Authenticate via the Authorization header (user's JWT)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create client with user's JWT to get their identity
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role client for data queries (bypasses RLS for reliability)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { start_date, end_date, format, include_expenses } = await req.json()

    if (!start_date || !end_date || !format) {
      return new Response(JSON.stringify({ error: 'Missing required fields: start_date, end_date, format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (format !== 'csv' && format !== 'pdf') {
      return new Response(JSON.stringify({ error: 'Format must be "csv" or "pdf"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch time entries for this user in the date range
    const { data: timeEntries, error: timeError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', start_date)
      .lte('entry_date', end_date)
      .order('entry_date', { ascending: true })

    if (timeError) {
      throw new Error(`Failed to fetch time entries: ${timeError.message}`)
    }

    // Fetch expenses if requested
    let expenses: Expense[] = []
    if (include_expenses !== false) {
      const { data: expData, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('expense_date', start_date)
        .lte('expense_date', end_date)
        .order('expense_date', { ascending: true })

      if (expError) {
        throw new Error(`Failed to fetch expenses: ${expError.message}`)
      }
      expenses = expData || []
    }

    const entries = (timeEntries || []) as TimeEntry[]
    const shouldIncludeExpenses = include_expenses !== false

    if (format === 'csv') {
      const csv = generateCSV(entries, expenses, shouldIncludeExpenses)
      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="takt-timekeeping-${start_date}-to-${end_date}.csv"`,
        },
      })
    } else {
      const html = generatePdfHtml(entries, expenses, start_date, end_date, shouldIncludeExpenses)
      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="takt-timekeeping-${start_date}-to-${end_date}.html"`,
        },
      })
    }
  } catch (error) {
    console.error('Export error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
