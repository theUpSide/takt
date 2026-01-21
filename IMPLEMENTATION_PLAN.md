# Takt Implementation Plan

Personal Task and Calendar Management System

## Overview

Takt is a single-user task/calendar app with:
- Task management (dependencies, due dates, categories)
- Calendar sync from external ICS feeds
- SMS-based task creation via Claude NLP
- Multiple views: Kanban, Gantt, List
- Real-time updates via Supabase subscriptions

**Tech Stack:** React 18 + Vite, Tailwind CSS, Zustand, Supabase, Twilio, Claude API, Vercel

---

## Phase 1: Project Foundation & Database

### 1.1 Initialize Project Structure
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS
- [ ] Set up ESLint + Prettier
- [ ] Create folder structure per SDD:
  ```
  src/
    components/
      Layout/
      Views/
      Items/
      Settings/
      Common/
    stores/
    hooks/
    lib/
    types/
  ```
- [ ] Install core dependencies:
  - `@supabase/supabase-js`
  - `zustand`
  - `react-router-dom`
  - `date-fns`

### 1.2 Supabase Project Setup
- [ ] Create Supabase project
- [ ] Set up environment variables (`.env.local`)
- [ ] Create Supabase client configuration (`src/lib/supabase.ts`)

### 1.3 Database Migrations
Create migrations in `/supabase/migrations/`:

- [ ] `20260101000000_create_categories.sql` - categories table
- [ ] `20260101000001_create_items.sql` - items table (tasks + events)
- [ ] `20260101000002_create_dependencies.sql` - task dependencies
- [ ] `20260101000003_create_calendar_sources.sql` - ICS feed configs
- [ ] `20260101000004_create_people.sql` - people for NLP category mapping
- [ ] `20260101000005_create_sms_log.sql` - SMS processing audit log
- [ ] `20260101000006_create_indexes.sql` - performance indexes
- [ ] `20260101000007_enable_rls.sql` - Row Level Security policies
- [ ] `20260101000008_seed_categories.sql` - default categories (Work, Consulting, Home, Kids, Personal)

### 1.4 Authentication
- [ ] Configure Supabase Auth (email/password or magic link)
- [ ] Create auth context/hook (`useAuth`)
- [ ] Build login page component
- [ ] Add protected route wrapper

---

## Phase 2: Core Data Layer

### 2.1 TypeScript Types
- [ ] Define all types in `src/types/`:
  - `Item` (task/event discriminated union)
  - `Category`
  - `Dependency`
  - `CalendarSource`
  - `Person`
  - `SmsLog`

### 2.2 Zustand Stores
- [ ] `itemStore.ts` - items CRUD, filtering, sorting
- [ ] `categoryStore.ts` - categories management
- [ ] `viewStore.ts` - current view state, filters, UI preferences

### 2.3 Supabase Hooks
- [ ] `useSupabaseSubscription.ts` - real-time subscription wrapper
- [ ] `useItems.ts` - items queries with real-time updates
- [ ] `useCategories.ts` - categories queries
- [ ] `useDependencies.ts` - dependency management

### 2.4 Utility Functions
- [ ] `dateUtils.ts` - date formatting, relative dates, timezone handling
- [ ] `dependencyUtils.ts` - cycle detection algorithm

---

## Phase 3: Layout & Navigation

### 3.1 Layout Components
- [ ] `Header.tsx` - app title, user menu, view switcher
- [ ] `Sidebar.tsx` - category list, filters, quick actions
- [ ] `MainContent.tsx` - content area wrapper

### 3.2 Routing
- [ ] Set up React Router with routes:
  - `/` - redirect to `/app`
  - `/login` - authentication
  - `/app` - main app (default to Kanban)
  - `/app/kanban` - Kanban view
  - `/app/gantt` - Gantt view
  - `/app/list` - List view
  - `/app/settings` - Settings page

### 3.3 Common Components
- [ ] `Modal.tsx` - reusable modal wrapper
- [ ] `DatePicker.tsx` - date/time picker component
- [ ] `CategoryBadge.tsx` - colored category indicator
- [ ] `LoadingSpinner.tsx`
- [ ] `EmptyState.tsx`

---

## Phase 4: Kanban View

### 4.1 Install Dependencies
- [ ] `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd)

### 4.2 Components
- [ ] `KanbanBoard.tsx` - main board with DragDropContext
- [ ] `KanbanColumn.tsx` - category column with Droppable
- [ ] `KanbanCard.tsx` - item card with Draggable
  - Title (truncated)
  - Due date (color-coded)
  - Source icon (manual/SMS/ICS)
  - Dependency badge
  - Completion checkbox

### 4.3 Functionality
- [ ] Drag between columns (updates category_id)
- [ ] Drag within column (reorder)
- [ ] Click card to open detail modal
- [ ] Quick complete checkbox
- [ ] Add item button per column

---

## Phase 5: Item Forms & Detail View

### 5.1 Install Dependencies
- [ ] `zod` - schema validation
- [ ] `react-hook-form` - form handling
- [ ] `@hookform/resolvers` - zod integration

### 5.2 Form Components
- [ ] `TaskForm.tsx` - create/edit task form
  - Title, Description, Category, Due Date, Dependencies
- [ ] `EventForm.tsx` - create/edit event form
  - Title, Description, Category, Start Time, End Time, All Day toggle
- [ ] `DependencyPicker.tsx` - multi-select predecessor tasks
  - Search/filter
  - Cycle detection (disable invalid options)
  - Show existing with remove

### 5.3 Detail View
- [ ] `ItemDetail.tsx` - full item view modal
  - Display all fields
  - Edit mode toggle
  - Delete with confirmation
  - Show source info (SMS text, ICS source)

---

## Phase 6: List View

### 6.1 Install Dependencies
- [ ] `@tanstack/react-table` - table management

### 6.2 Components
- [ ] `ListView.tsx` - main table wrapper
- [ ] `ListRow.tsx` - table row component

### 6.3 Features
- [ ] Columns: Title, Type, Category, Due/Start, Status, Source, Dependencies
- [ ] Sorting (all sortable columns)
- [ ] Filtering:
  - Text search (title)
  - Type dropdown
  - Category multi-select
  - Date range
  - Status dropdown
  - Source multi-select
- [ ] Bulk actions:
  - Mark complete
  - Change category
  - Set due date
  - Delete

---

## Phase 7: Gantt Chart View

### 7.1 Install Dependencies
- [ ] `frappe-gantt` - Gantt chart library

### 7.2 Components
- [ ] `GanttChart.tsx` - main Gantt wrapper
- [ ] `GanttBar.tsx` - custom task bar (if needed)
- [ ] `DependencyArrow.tsx` - custom arrow styling (if needed)

### 7.3 Features
- [ ] Display tasks/events on timeline
- [ ] Dependency arrows between tasks
- [ ] View modes: Day, Week, Month
- [ ] Date picker for navigation
- [ ] Click task to open detail
- [ ] Drag to change dates
- [ ] Color by category

---

## Phase 8: Settings UI

### 8.1 Components
- [ ] `SettingsPage.tsx` - settings container
- [ ] `CategoryManager.tsx` - CRUD categories
  - Name, color picker, sort order
  - Drag to reorder
- [ ] `CalendarSources.tsx` - manage ICS feeds
  - Add/edit/remove feeds
  - Name, URL, default category
  - Enable/disable sync
  - Manual sync button
  - Last sync status
- [ ] `PeopleManager.tsx` - manage people for NLP
  - Name, aliases, default category

---

## Phase 9: Supabase Edge Functions

### 9.1 Project Structure
```
supabase/
  functions/
    sms-webhook/
      index.ts
    sync-calendars/
      index.ts
    _shared/
      claude.ts
      twilio.ts
      supabase.ts
```

### 9.2 SMS Webhook Function
- [ ] Create `sms-webhook/index.ts`
  - Validate Twilio signature
  - Parse form data (Body, From, MessageSid)
  - Idempotency check (twilio_sid)
  - Fetch user context (categories, people)
  - Call Claude API for NLP parsing
  - Resolve category from people/hint
  - Insert item into database
  - Log to sms_log
  - Return TwiML response

### 9.3 Claude Integration
- [ ] Create `_shared/claude.ts`
  - Build system prompt with context
  - Make Claude API call
  - Parse JSON response
  - Retry logic with exponential backoff

### 9.4 Calendar Sync Function
- [ ] Create `sync-calendars/index.ts`
  - Fetch all enabled calendar_sources
  - For each source:
    - Fetch ICS URL
    - Parse with ical.js
    - Upsert events (by external_id)
    - Delete removed events
    - Update last_synced_at
  - Return sync stats

### 9.5 Install Function Dependencies
- [ ] `ical.js` for ICS parsing
- [ ] Twilio SDK for signature validation

### 9.6 Secrets Configuration
- [ ] Set Supabase secrets:
  - `ANTHROPIC_API_KEY`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_ACCOUNT_SID`

### 9.7 Cron Job
- [ ] Configure pg_cron for calendar sync (every 15 minutes)

---

## Phase 10: Twilio Integration

### 10.1 Twilio Setup
- [ ] Create Twilio account
- [ ] Purchase phone number
- [ ] Configure webhook URL to Edge Function
- [ ] Test SMS receiving

### 10.2 SMS Log UI
- [ ] Add SMS log view in settings
  - Show recent messages
  - Parsed result preview
  - Error messages
  - Link to created item

---

## Phase 11: Polish & UX

### 11.1 Loading States
- [ ] Skeleton loaders for views
- [ ] Optimistic updates for mutations
- [ ] Error boundaries

### 11.2 Responsive Design
- [ ] Mobile-friendly Kanban (horizontal scroll or stacked)
- [ ] Mobile-friendly List (card layout on small screens)
- [ ] Mobile-friendly Gantt (limited view modes)
- [ ] Touch-friendly drag and drop

### 11.3 Notifications
- [ ] Toast notifications for actions
- [ ] Error notifications

### 11.4 Keyboard Shortcuts
- [ ] `n` - new task
- [ ] `e` - new event
- [ ] `1/2/3` - switch views
- [ ] `Esc` - close modals

### 11.5 Accessibility
- [ ] ARIA labels
- [ ] Focus management
- [ ] Screen reader support

---

## Phase 12: Testing

### 12.1 Unit Tests
- [ ] Dependency cycle detection algorithm
- [ ] Date utility functions
- [ ] Store actions

### 12.2 Component Tests
- [ ] Form validation
- [ ] Kanban drag/drop behavior
- [ ] List filtering/sorting

### 12.3 Integration Tests
- [ ] SMS webhook flow (mocked Claude)
- [ ] Calendar sync flow (mocked ICS)
- [ ] Real-time subscription updates

### 12.4 E2E Tests (Playwright)
- [ ] Create task via UI
- [ ] Create event via UI
- [ ] Drag task between columns
- [ ] Add dependency
- [ ] Switch views
- [ ] Filter list view

---

## Phase 13: Deployment

### 13.1 Vercel Setup
- [ ] Connect GitHub repo
- [ ] Configure build settings
- [ ] Set environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Configure rewrites for SPA

### 13.2 Supabase Production
- [ ] Run all migrations
- [ ] Deploy Edge Functions
- [ ] Configure pg_cron
- [ ] Verify RLS policies

### 13.3 Domain & SSL
- [ ] Configure custom domain (if desired)
- [ ] SSL handled automatically

### 13.4 Monitoring
- [ ] Set up error tracking (Sentry or similar)
- [ ] Monitor Edge Function logs
- [ ] Monitor calendar sync success rate

---

## Recommended Implementation Order

**Week 1: Foundation**
1. Phase 1 (Project Foundation & Database)
2. Phase 2 (Core Data Layer)

**Week 2: Basic UI**
3. Phase 3 (Layout & Navigation)
4. Phase 5 (Item Forms) - basic version

**Week 3: Views**
5. Phase 4 (Kanban View)
6. Phase 6 (List View)

**Week 4: Advanced Features**
7. Phase 7 (Gantt Chart)
8. Phase 8 (Settings UI)

**Week 5: Backend Integration**
9. Phase 9 (Edge Functions)
10. Phase 10 (Twilio Integration)

**Week 6: Finish**
11. Phase 11 (Polish & UX)
12. Phase 12 (Testing)
13. Phase 13 (Deployment)

---

## Dependencies Summary

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "@supabase/supabase-js": "^2.x",
    "zustand": "^4.x",
    "@hello-pangea/dnd": "^16.x",
    "@tanstack/react-table": "^8.x",
    "frappe-gantt": "^0.6.x",
    "date-fns": "^3.x",
    "zod": "^3.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "tailwindcss": "^3.x",
    "@types/react": "^18.x",
    "vitest": "^1.x",
    "@playwright/test": "^1.x",
    "eslint": "^8.x",
    "prettier": "^3.x"
  }
}
```

## Supabase Edge Function Dependencies

```json
{
  "ical.js": "^1.5.x"
}
```

---

## Key Technical Decisions

1. **State Management**: Zustand for simplicity and TypeScript support
2. **Drag & Drop**: @hello-pangea/dnd (active fork of react-beautiful-dnd)
3. **Tables**: TanStack Table for sorting/filtering/pagination
4. **Forms**: React Hook Form + Zod for validation
5. **Dates**: date-fns for manipulation, native Intl for formatting
6. **Gantt**: Frappe Gantt (open source, dependency support)

## Risk Areas

1. **Frappe Gantt Integration**: May need custom React wrapper; consider alternatives if integration is difficult
2. **ICS Parsing Edge Cases**: Recurring events, timezones, malformed feeds
3. **Claude Response Parsing**: Need robust error handling for unexpected formats
4. **Mobile Drag/Drop**: May need touch-specific handling

---

## Getting Started

```bash
# Create Vite project
npm create vite@latest takt -- --template react-ts

# Install dependencies
cd takt
npm install

# Set up Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Initialize Supabase
npx supabase init
npx supabase link --project-ref YOUR_PROJECT_REF
```
