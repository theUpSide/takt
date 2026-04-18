export interface Deliverable {
  id: string
  user_id: string
  engagement_id: string
  title: string
  description: string | null
  delivered_on: string | null  // YYYY-MM-DD
  file_path: string | null
  external_url: string | null
  created_at: string
  updated_at: string
}

export interface DeliverableFormData {
  title: string
  description: string
  delivered_on: string | null
  external_url: string
  file: File | null
}
