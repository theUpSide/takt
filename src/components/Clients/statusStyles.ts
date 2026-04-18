import type { RelationshipStatus, EngagementStatus } from '@/types/engagement'

export const RELATIONSHIP_STATUS_CLASSES: Record<RelationshipStatus, string> = {
  active: 'bg-green-500/15 text-green-400',
  pursuit: 'bg-blue-500/15 text-blue-400',
  follow_up: 'bg-amber-500/15 text-amber-400',
  dormant: 'bg-gray-500/15 text-gray-400',
}

export const ENGAGEMENT_STATUS_CLASSES: Record<EngagementStatus, string> = {
  active: 'bg-green-500/15 text-green-400',
  paused: 'bg-amber-500/15 text-amber-400',
  complete: 'bg-blue-500/15 text-blue-400',
  lost: 'bg-red-500/15 text-red-400',
}
