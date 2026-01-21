// Item types
export type ItemType = 'task' | 'event'
export type ItemSource = 'manual' | 'sms' | 'ics'

export interface Item {
  id: string
  type: ItemType
  title: string
  description: string | null
  category_id: string | null
  start_time: string | null
  end_time: string | null
  due_date: string | null
  completed: boolean
  completed_at: string | null
  source: ItemSource
  external_id: string | null
  calendar_source_id: string | null
  raw_sms: string | null
  created_at: string
  updated_at: string
  // Joined relations
  category?: Category | null
}

export interface Task extends Item {
  type: 'task'
  due_date: string | null
}

export interface Event extends Item {
  type: 'event'
  start_time: string
  end_time: string
}

// Category
export interface Category {
  id: string
  name: string
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

// Dependency
export interface Dependency {
  id: string
  predecessor_id: string
  successor_id: string
  created_at: string
  // Joined relations
  predecessor?: Item
  successor?: Item
}

// Calendar Source
export interface CalendarSource {
  id: string
  name: string
  ics_url: string
  default_category_id: string | null
  sync_enabled: boolean
  last_synced_at: string | null
  last_error: string | null
  created_at: string
}

// Person (for NLP category mapping)
export interface Person {
  id: string
  name: string
  aliases: string[]
  default_category_id: string | null
  created_at: string
  // Joined relations
  default_category?: Category | null
}

// SMS Log
export interface SmsLog {
  id: string
  twilio_sid: string
  from_number: string
  body: string
  parsed_result: ParsedSmsResult | null
  item_id: string | null
  error: string | null
  processed_at: string
  // Joined relations
  item?: Item | null
}

// Claude parsed result from SMS
export interface ParsedSmsResult {
  type: ItemType
  title: string
  description: string | null
  start_time: string | null
  end_time: string | null
  due_date: string | null
  category_hint: string | null
  people_mentioned: string[]
  confidence: number
}

// View types
export type ViewType = 'kanban' | 'list' | 'gantt'

// Form types
export interface TaskFormData {
  title: string
  description: string
  category_id: string | null
  due_date: string | null
  dependency_ids: string[]
}

export interface EventFormData {
  title: string
  description: string
  category_id: string | null
  start_time: string
  end_time: string
  all_day: boolean
}

// Filter types
export interface ItemFilters {
  search: string
  types: ItemType[]
  category_ids: string[]
  sources: ItemSource[]
  status: 'all' | 'completed' | 'pending' | 'overdue'
  date_range: {
    start: string | null
    end: string | null
  }
}
