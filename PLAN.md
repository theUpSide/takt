# Takt Timekeeping & Expense Tracking - Implementation Plan

## Key Architecture Notes (SDD vs. Actual Codebase)

The SDD describes the stack as Next.js App Router, but the actual codebase is:
- **Vite + React 18 + React Router 6** (not Next.js)
- **Zustand stores** for state management (not server components)
- **Direct Supabase SDK calls** from client (no API routes)
- **Top header nav with view tabs** (Kanban, List, Gantt, Planner) — not a bottom navigation bar
- **No Supabase Storage** usage yet

The plan below adapts the SDD to match the actual architecture.

---

## Phase 1: Database & Types

### Step 1.1 — Supabase Migration: `time_entries` table
- File: `supabase/migrations/20260101000018_create_time_entries.sql`
- Create `time_entries` table per SDD Section 3.1
- Include all columns: id, user_id, entry_date, hours, category, description, task_id (FK to items), billable, client_name, rate_override, created_at, updated_at
- Add CHECK constraints: hours > 0 AND hours <= 24, category IN (...) enum values
- Add entry_date <= CURRENT_DATE constraint (no future dates)
- Create `updated_at` auto-update trigger (reuse pattern from existing migrations)
- Enable RLS with user_id = auth.uid() policy (matching projects table pattern)
- Add indexes: user_id, entry_date, category

### Step 1.2 — Supabase Migration: `expenses` table
- File: `supabase/migrations/20260101000019_create_expenses.sql`
- Create `expenses` table per SDD Section 3.2
- All columns: id, user_id, expense_date, amount, category, vendor, description, receipt_path, is_recurring, created_at, updated_at
- CHECK constraints: amount > 0, category IN (...) enum values
- expense_date <= CURRENT_DATE constraint
- RLS policy matching time_entries pattern
- Auto-update trigger for updated_at
- Indexes: user_id, expense_date, category

### Step 1.3 — Supabase Storage: `receipts` bucket
- File: `supabase/migrations/20260101000020_create_receipts_bucket.sql`
- Create storage bucket `receipts`
- Storage policy: authenticated users only, matching auth.uid()
- Max file size enforced client-side (10MB limit, compress to <2MB)

### Step 1.4 — TypeScript Types
- File: `src/types/timekeeping.ts`
- Define `TimeEntry`, `TimeCategory`, `Expense`, `ExpenseCategory` interfaces per SDD Section 3.3
- Define form data types: `TimeEntryFormData`, `ExpenseFormData`
- Export from `src/types/index.ts`

### Step 1.5 — Update ViewType
- File: `src/types/index.ts`
- Add `'time'` to the `ViewType` union type

---

## Phase 2: Data Layer (Zustand Store)

### Step 2.1 — Timekeeping Store
- File: `src/stores/timekeepingStore.ts`
- Follow exact patterns from `itemStore.ts` (Zustand + Supabase SDK + toast notifications)
- **State**: `timeEntries: TimeEntry[]`, `expenses: Expense[]`, `loading`, `error`
- **Time Entry CRUD**:
  - `fetchTimeEntries(startDate?, endDate?)` — SELECT with date range filter, ordered by entry_date DESC
  - `createTimeEntry(data: TimeEntryFormData)` — INSERT, return created entry, show toast
  - `updateTimeEntry(id, data)` — UPDATE, show toast
  - `deleteTimeEntry(id)` — DELETE with toast confirmation
- **Expense CRUD**:
  - `fetchExpenses(startDate?, endDate?)` — SELECT with date range filter
  - `createExpense(data: ExpenseFormData)` — INSERT
  - `updateExpense(id, data)` — UPDATE
  - `deleteExpense(id)` — DELETE
- **Receipt Upload**:
  - `uploadReceipt(expenseId, file)` — Supabase Storage upload to `receipts/{id}.{ext}`, then update expense.receipt_path
  - `getReceiptUrl(path)` — Get signed URL from Supabase Storage
- **Dashboard Selectors** (computed from state):
  - `getWeekSummary(weekStart)` — total hours, hours by category, total expenses
  - `getMonthSummary(monthStart)` — same structure, month-to-date
  - `getCategoryBreakdown(startDate, endDate)` — hours per category for charts
  - `getRecentEntries(limit)` — last N time entries + expenses combined, sorted by date
  - `getSweatEquityTotal(rate)` — cumulative hours * rate
- **Realtime Subscriptions**:
  - `subscribeToChanges()` — subscribe to postgres_changes on time_entries and expenses tables

---

## Phase 3: Navigation & Routing

### Step 3.1 — Add "Time" View to Header Navigation
- File: `src/components/Layout/Header.tsx`
- Add `'time'` entry to `viewOptions` array with clock icon
- This gives it the same tab treatment as Kanban, List, Gantt, Planner

### Step 3.2 — Add Route
- File: `src/App.tsx`
- Add `<Route path="time" element={<TimekeepingView />} />` under `/app`
- Import new `TimekeepingView` component

### Step 3.3 — Initialize Store in Layout
- File: `src/components/Layout/Layout.tsx`
- Import `useTimekeepingStore`
- Call `fetchTimeEntries()` and `fetchExpenses()` on mount
- Subscribe to realtime changes (same pattern as items/categories)

---

## Phase 4: Quick Log View (Time Entry UI)

### Step 4.1 — TimekeepingView Container
- File: `src/components/Views/TimekeepingView.tsx`
- Container component with toggle between "Log" and "Dashboard" sub-views
- Toggle rendered as segmented control at top (matching existing UI patterns)
- Default sub-view: "Log"

### Step 4.2 — QuickLogForm Component
- File: `src/components/Timekeeping/QuickLogForm.tsx`
- Optimized for fast entry (<10 seconds target)
- Layout (vertical, mobile-first):
  1. **Date selector**: defaults to today, tappable date input, constrained to past/today
  2. **Hours stepper**: large +/- buttons with 0.25 increments, default 1.0, direct numeric input, range 0.25–12
  3. **Category buttons**: 2x3 grid of pill buttons for TimeCategory values, pre-select most recent category (stored in localStorage or store)
  4. **Description field**: single-line input, placeholder "What did you work on?"
  5. **Billable toggle**: off by default. When on, reveals client_name (autocomplete from previous entries) and rate_override fields
  6. **Task link** (optional): dropdown to link to existing Takt task from items table
  7. **Save button**: full-width, calls `createTimeEntry()`, shows toast, resets form
  8. **"+ Expense" link**: switches to ExpenseEntryForm
- Use `react-hook-form` + `zod` for validation (matching existing form patterns in TaskForm.tsx / EventForm.tsx)
- Pre-populate last-used category from previous entries

### Step 4.3 — ExpenseEntryForm Component
- File: `src/components/Timekeeping/ExpenseEntryForm.tsx`
- Similar vertical layout:
  1. **Date selector**: defaults to today
  2. **Amount input**: numeric, dollar prefix
  3. **Category buttons**: 3x3 grid for ExpenseCategory values
  4. **Vendor field**: autocomplete from previous expense vendors
  5. **Description field**
  6. **Receipt photo button**: opens file picker, client-side compression to <2MB, uploads to Supabase Storage, shows thumbnail
  7. **Recurring toggle**: marks as subscription
  8. **Save button**
- Client-side image compression using canvas API (no new dependency needed)
- Accepted file types: JPEG, PNG, PDF, HEIC

### Step 4.4 — HoursStepper Component
- File: `src/components/Timekeeping/HoursStepper.tsx`
- Reusable component with large +/- buttons
- 0.25 increment/decrement
- Direct numeric input on tap
- Min: 0.25, Max: 12
- Visual display: large centered number with "hrs" label

### Step 4.5 — CategoryPills Component
- File: `src/components/Timekeeping/CategoryPills.tsx`
- Reusable grid of selectable pill buttons
- Props: categories array, selected value, onChange callback
- 2x3 or 3x3 grid layout depending on count
- Each pill has label + optional icon
- Themed with existing CSS variables

---

## Phase 5: Dashboard View

### Step 5.1 — TimekeepingDashboard Component
- File: `src/components/Timekeeping/TimekeepingDashboard.tsx`
- Renders when "Dashboard" toggle is selected in TimekeepingView
- Components:
  1. **WeeklySummaryCard**: total hours this week, stacked bar by category, total expenses
  2. **MonthlySummaryCard**: same structure, month-to-date
  3. **CategoryBreakdown**: donut/pie chart showing time allocation (use simple SVG — no new chart library to keep bundle small)
  4. **RecentEntriesList**: last 10 time entries + expenses, inline editable, swipe-to-delete on mobile
  5. **SweatEquityCard**: cumulative hours * rate displayed as dollar figure
  6. **ExportButton**: opens date range picker + format selector

### Step 5.2 — SummaryCard Component
- File: `src/components/Timekeeping/SummaryCard.tsx`
- Reusable card showing total hours, category breakdown bar, expense total
- Props: title, hours by category, expenses total, period label

### Step 5.3 — CategoryChart Component
- File: `src/components/Timekeeping/CategoryChart.tsx`
- Simple SVG donut chart (no external dependency)
- Color-coded segments matching category colors
- Legend with category names and hours

### Step 5.4 — RecentEntriesList Component
- File: `src/components/Timekeeping/RecentEntriesList.tsx`
- Combined list of time entries and expenses, sorted by date DESC
- Each row shows: date, type icon (clock/dollar), category badge, description, hours/amount
- Tap to edit inline (expand row with form fields)
- Swipe-to-delete on mobile (or delete button on desktop)
- Confirmation dialog before delete

### Step 5.5 — Weekly Hours Warning
- When weekly total exceeds 60 hours, show amber warning badge on the weekly summary card
- Pure UI logic in the dashboard component, driven by store selectors

---

## Phase 6: Export (Edge Function)

### Step 6.1 — Export Edge Function
- File: `supabase/functions/export-timekeeping/index.ts`
- Deno-based Edge Function (matching existing sms-webhook pattern)
- Endpoint: POST with body `{ start_date, end_date, format: "csv" | "pdf", include_expenses: boolean }`
- Authenticates via Supabase JWT from request header
- Queries time_entries and expenses for the user within date range
- **CSV generation**: comma-separated with headers matching Schedule C categories, includes both entry_date and created_at (for IRS audit trail)
- **PDF generation**: formatted tables using a simple Deno PDF library or HTML-to-PDF approach. Sections: Time Summary, Expense Summary by Schedule C category, Detail tables
- Flag entries logged during 9am-5pm weekdays with asterisk (IP ownership CYA feature from SDD Section 6.4)
- Return file with Content-Disposition: attachment header

### Step 6.2 — Export UI
- File: `src/components/Timekeeping/ExportDialog.tsx`
- Modal dialog (reuse existing Modal component)
- Date range picker (start/end date inputs)
- Format selector: CSV or PDF radio buttons
- Include expenses checkbox
- Download button — calls Edge Function, triggers browser download
- Loading state during generation

---

## Phase 7: Integration & Polish

### Step 7.1 — Realtime Subscriptions
- Enable realtime publication for `time_entries` and `expenses` tables
- File: `supabase/migrations/20260101000021_enable_timekeeping_realtime.sql`
- Add to Layout.tsx initialization alongside existing subscriptions

### Step 7.2 — Mobile Optimization
- Ensure QuickLogForm works without scrolling on iPhone 14 screen (390px width)
- Large tap targets (minimum 44px)
- Touch-friendly stepper buttons
- Responsive category grid (2x3 on mobile, horizontal on desktop)

### Step 7.3 — Vendor Autocomplete
- In ExpenseEntryForm, fetch distinct vendor names from previous expenses
- Simple dropdown suggestion list, no external autocomplete library

### Step 7.4 — Client Name Autocomplete
- In QuickLogForm billable section, fetch distinct client_name values from previous entries
- Same pattern as vendor autocomplete

---

## File Summary

### New Files (17 total)
| File | Purpose |
|------|---------|
| `supabase/migrations/20260101000018_create_time_entries.sql` | time_entries table + RLS |
| `supabase/migrations/20260101000019_create_expenses.sql` | expenses table + RLS |
| `supabase/migrations/20260101000020_create_receipts_bucket.sql` | Storage bucket for receipts |
| `supabase/migrations/20260101000021_enable_timekeeping_realtime.sql` | Realtime for new tables |
| `src/types/timekeeping.ts` | TypeScript interfaces |
| `src/stores/timekeepingStore.ts` | Zustand store for time/expense data |
| `src/components/Views/TimekeepingView.tsx` | Container with Log/Dashboard toggle |
| `src/components/Timekeeping/QuickLogForm.tsx` | Time entry form |
| `src/components/Timekeeping/ExpenseEntryForm.tsx` | Expense entry form |
| `src/components/Timekeeping/HoursStepper.tsx` | Hours +/- stepper component |
| `src/components/Timekeeping/CategoryPills.tsx` | Category selection grid |
| `src/components/Timekeeping/TimekeepingDashboard.tsx` | Dashboard view |
| `src/components/Timekeeping/SummaryCard.tsx` | Weekly/Monthly summary card |
| `src/components/Timekeeping/CategoryChart.tsx` | SVG donut chart |
| `src/components/Timekeeping/RecentEntriesList.tsx` | Recent entries with edit/delete |
| `src/components/Timekeeping/ExportDialog.tsx` | Export modal |
| `supabase/functions/export-timekeeping/index.ts` | Edge Function for CSV/PDF export |

### Modified Files (4 total)
| File | Change |
|------|--------|
| `src/types/index.ts` | Add `'time'` to ViewType, re-export timekeeping types |
| `src/App.tsx` | Add `/app/time` route |
| `src/components/Layout/Header.tsx` | Add "Time" tab to viewOptions |
| `src/components/Layout/Layout.tsx` | Initialize timekeeping store, subscribe to realtime |

### No New Dependencies
All functionality is achievable with existing packages (react-hook-form, zod, date-fns, zustand, @supabase/supabase-js). SVG chart is hand-built. Image compression uses native canvas API.

---

## Implementation Order

The phases should be implemented sequentially since each builds on the previous:

1. **Phase 1** (Database & Types) — foundation, no UI dependency
2. **Phase 2** (Data Layer) — depends on types from Phase 1
3. **Phase 3** (Navigation & Routing) — wires up the view, needs store from Phase 2
4. **Phase 4** (Quick Log View) — the core UI, needs everything above
5. **Phase 5** (Dashboard) — reads data created by Phase 4
6. **Phase 6** (Export) — independent Edge Function, but needs data to exist
7. **Phase 7** (Polish) — refinement after core features work

Phase 5 (SMS time entry from SDD) is explicitly deferred — the SDD marks it as Phase 5/Future and the SMS webhook extension is not part of this implementation.
