// Time entry categories
export type TimeCategory =
  | 'product_dev'      // Building IPS software, tools, IP
  | 'bd_outreach'      // Business development, prospecting, calls
  | 'client_work'      // Billable consulting hours
  | 'content'          // Articles, presentations, marketing material
  | 'admin'            // Invoicing, filing, bookkeeping
  | 'professional_dev' // Certs, courses, conferences

// Expense categories (Schedule C aligned)
export type ExpenseCategory =
  | 'software_tools'      // Claude, hosting, SaaS subscriptions
  | 'equipment'           // Hardware, dev machines, peripherals
  | 'professional_dev'    // Certs, training, books
  | 'travel'              // Conferences, client meetings, mileage
  | 'marketing'           // LinkedIn premium, advertising, business cards
  | 'insurance'           // GL, E&O when applicable
  | 'legal_professional'  // CPA, legal, annual filings
  | 'office_supplies'     // Misc supplies, postage
  | 'other'               // Anything else

export interface TimeEntry {
  id: string
  user_id: string
  entry_date: string       // ISO date YYYY-MM-DD
  hours: number
  category: TimeCategory
  description: string | null
  task_id: string | null
  billable: boolean
  client_name: string | null
  rate_override: number | null
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  user_id: string
  expense_date: string     // ISO date YYYY-MM-DD
  amount: number
  category: ExpenseCategory
  vendor: string | null
  description: string | null
  receipt_path: string | null
  is_recurring: boolean
  created_at: string
  updated_at: string
}

// Form data types
export interface TimeEntryFormData {
  entry_date: string
  hours: number
  category: TimeCategory
  description: string
  task_id: string | null
  billable: boolean
  client_name: string
  rate_override: number | null
}

export interface ExpenseFormData {
  expense_date: string
  amount: number
  category: ExpenseCategory
  vendor: string
  description: string
  receipt_file: File | null
  is_recurring: boolean
}

export interface ChargeAccount {
  id: string
  user_id: string
  name: string
  billable: boolean
  investment_internal: boolean
  client_name: string | null
  hourly_rate: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ChargeAccountFormData {
  name: string
  billable: boolean
  investment_internal: boolean
  client_name: string
  hourly_rate: number | null
  notes: string
}

// Category display metadata
export const TIME_CATEGORIES: { value: TimeCategory; label: string }[] = [
  { value: 'product_dev', label: 'Product Dev' },
  { value: 'bd_outreach', label: 'BD & Outreach' },
  { value: 'client_work', label: 'Client Work' },
  { value: 'content', label: 'Content' },
  { value: 'admin', label: 'Admin' },
  { value: 'professional_dev', label: 'Prof. Dev' },
]

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'software_tools', label: 'Software & Tools' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'professional_dev', label: 'Prof. Dev' },
  { value: 'travel', label: 'Travel' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'legal_professional', label: 'Legal & Prof.' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'other', label: 'Other' },
]
