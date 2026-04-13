// Client/engagement tracking types.
// A client is an organization; an engagement is a discrete scope of work.

export type RelationshipStatus = 'active' | 'pursuit' | 'follow_up' | 'dormant'

export type EngagementType = 'hourly_1099' | 'retainer' | 'fixed_price' | 'pursuit'

export type EngagementStatus = 'active' | 'paused' | 'complete' | 'lost'

export interface Client {
  id: string
  user_id: string
  name: string
  primary_contact_name: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  cage_code: string | null
  relationship_status: RelationshipStatus
  relationship_started: string | null  // YYYY-MM-DD
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Engagement {
  id: string
  user_id: string
  client_id: string
  title: string
  engagement_type: EngagementType
  billing_rate: number | null
  retainer_hours: number | null
  fixed_price: number | null
  start_date: string | null
  end_date: string | null
  status: EngagementStatus
  scope_description: string | null
  charge_account_id: string | null
  created_at: string
  updated_at: string
  // Joined relations
  client?: Client | null
}

export interface ClientFormData {
  name: string
  primary_contact_name: string
  primary_contact_email: string
  primary_contact_phone: string
  cage_code: string
  relationship_status: RelationshipStatus
  relationship_started: string | null
  notes: string
}

export interface EngagementFormData {
  client_id: string
  title: string
  engagement_type: EngagementType
  billing_rate: number | null
  retainer_hours: number | null
  fixed_price: number | null
  start_date: string | null
  end_date: string | null
  status: EngagementStatus
  scope_description: string
  charge_account_id: string | null
}

export const RELATIONSHIP_STATUSES: { value: RelationshipStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'pursuit', label: 'Pursuit' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'dormant', label: 'Dormant' },
]

export const ENGAGEMENT_TYPES: { value: EngagementType; label: string }[] = [
  { value: 'hourly_1099', label: 'Hourly (1099)' },
  { value: 'retainer', label: 'Retainer' },
  { value: 'fixed_price', label: 'Fixed Price' },
  { value: 'pursuit', label: 'Pursuit / Pre-revenue' },
]

export const ENGAGEMENT_STATUSES: { value: EngagementStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'complete', label: 'Complete' },
  { value: 'lost', label: 'Lost' },
]
