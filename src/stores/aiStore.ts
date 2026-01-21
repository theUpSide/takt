import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Anthropic from '@anthropic-ai/sdk'
import { useItemStore } from './itemStore'
import { useCategoryStore } from './categoryStore'
import { useToastStore } from './toastStore'
import { getTodayString } from '@/lib/dateUtils'
import type { Item } from '@/types'

interface ParsedAction {
  type: 'create_task' | 'create_event' | 'complete_task' | 'delete_task' | 'update_task' | 'unknown'
  data?: {
    title?: string
    description?: string
    due_date?: string
    start_time?: string
    end_time?: string
    category_name?: string
    task_identifier?: string
  }
  message?: string
}

interface ScheduleSuggestion {
  item_id: string
  scheduled_start: string
  duration_minutes: number
}

interface OptimizationResult {
  schedule: ScheduleSuggestion[]
  reasoning: string
}

interface AIState {
  apiKey: string | null
  isProcessing: boolean
  lastError: string | null
  commandBarOpen: boolean

  // Actions
  setApiKey: (key: string | null) => void
  openCommandBar: () => void
  closeCommandBar: () => void
  toggleCommandBar: () => void
  processNaturalLanguage: (input: string) => Promise<ParsedAction>
  executeAction: (action: ParsedAction) => Promise<boolean>
  // Schedule optimization
  optimizeSchedule: (date: string, scheduledItems: Item[], unscheduledTasks: Item[]) => Promise<OptimizationResult | null>
}

const SYSTEM_PROMPT = `You are an AI assistant for a task management app called Takt. Your job is to parse natural language input and convert it into structured actions.

Available actions:
1. create_task - Create a new task
2. create_event - Create a new event (has start/end time)
3. complete_task - Mark a task as complete
4. delete_task - Delete a task
5. update_task - Update an existing task

When parsing dates:
- "today" = current date
- "tomorrow" = next day
- "next week" = 7 days from now
- "next Monday/Tuesday/etc" = the next occurrence of that day
- Specific dates like "January 15" or "1/15" should be converted to ISO format

Response format (JSON only, no markdown):
{
  "type": "create_task" | "create_event" | "complete_task" | "delete_task" | "update_task" | "unknown",
  "data": {
    "title": "task title",
    "description": "optional description",
    "due_date": "YYYY-MM-DD" (for tasks),
    "start_time": "YYYY-MM-DDTHH:MM:SS" (for events),
    "end_time": "YYYY-MM-DDTHH:MM:SS" (for events),
    "category_name": "optional category name like Work, Personal, Home",
    "task_identifier": "for complete/delete/update - part of task title to identify it"
  },
  "message": "friendly confirmation message to show the user"
}

Examples:
- "remind me to call mom tomorrow" -> create_task with title "Call mom" and due_date tomorrow
- "meeting with John on Friday at 2pm" -> create_event with title "Meeting with John" and start_time
- "mark buy groceries as done" -> complete_task with task_identifier "buy groceries"
- "schedule dentist appointment next Tuesday 10am to 11am" -> create_event
- "add a work task: review quarterly report by end of week" -> create_task with category_name "Work"

Always respond with valid JSON only. No explanation text outside the JSON.`

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      apiKey: null,
      isProcessing: false,
      lastError: null,
      commandBarOpen: false,

      setApiKey: (key) => set({ apiKey: key }),

      openCommandBar: () => set({ commandBarOpen: true }),
      closeCommandBar: () => set({ commandBarOpen: false }),
      toggleCommandBar: () => set((state) => ({ commandBarOpen: !state.commandBarOpen })),

      processNaturalLanguage: async (input: string): Promise<ParsedAction> => {
        const { apiKey } = get()
        const toast = useToastStore.getState()

        if (!apiKey) {
          toast.error('Please set your Anthropic API key in Settings')
          return { type: 'unknown', message: 'API key not configured' }
        }

        set({ isProcessing: true, lastError: null })

        try {
          const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

          // Get current date context (using local time, not UTC)
          const now = new Date()
          const localDateStr = getTodayString()
          const localTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          const dateContext = `Current date: ${localDateStr} (${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}). Current local time: ${localTimeStr}.`

          // Get categories for context
          const categories = useCategoryStore.getState().categories
          const categoryList = categories.map((c) => c.name).join(', ')

          const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: [
              {
                role: 'user',
                content: `${dateContext}\n\nAvailable categories: ${categoryList}\n\nUser input: "${input}"`,
              },
            ],
          })

          const content = response.content[0]
          if (content.type !== 'text') {
            throw new Error('Unexpected response type')
          }

          // Parse the JSON response
          const parsed = JSON.parse(content.text) as ParsedAction
          set({ isProcessing: false })
          return parsed
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to process input'
          set({ isProcessing: false, lastError: errorMessage })
          toast.error('Failed to understand input')
          return { type: 'unknown', message: errorMessage }
        }
      },

      executeAction: async (action: ParsedAction): Promise<boolean> => {
        const itemStore = useItemStore.getState()
        const categoryStore = useCategoryStore.getState()
        const toast = useToastStore.getState()

        try {
          switch (action.type) {
            case 'create_task': {
              const categoryId = action.data?.category_name
                ? categoryStore.categories.find(
                    (c) => c.name.toLowerCase() === action.data!.category_name!.toLowerCase()
                  )?.id
                : undefined

              await itemStore.createItem({
                type: 'task',
                title: action.data?.title || 'New Task',
                description: action.data?.description,
                due_date: action.data?.due_date,
                category_id: categoryId,
              })
              return true
            }

            case 'create_event': {
              const categoryId = action.data?.category_name
                ? categoryStore.categories.find(
                    (c) => c.name.toLowerCase() === action.data!.category_name!.toLowerCase()
                  )?.id
                : undefined

              await itemStore.createItem({
                type: 'event',
                title: action.data?.title || 'New Event',
                description: action.data?.description,
                start_time: action.data?.start_time,
                end_time: action.data?.end_time,
                category_id: categoryId,
              })
              return true
            }

            case 'complete_task': {
              const identifier = action.data?.task_identifier?.toLowerCase()
              if (!identifier) {
                toast.error('Could not identify which task to complete')
                return false
              }

              const task = itemStore.items.find(
                (item) =>
                  item.type === 'task' &&
                  !item.completed &&
                  item.title.toLowerCase().includes(identifier)
              )

              if (task) {
                await itemStore.toggleComplete(task.id)
                return true
              } else {
                toast.error(`Could not find task matching "${identifier}"`)
                return false
              }
            }

            case 'delete_task': {
              const identifier = action.data?.task_identifier?.toLowerCase()
              if (!identifier) {
                toast.error('Could not identify which task to delete')
                return false
              }

              const task = itemStore.items.find((item) =>
                item.title.toLowerCase().includes(identifier)
              )

              if (task) {
                await itemStore.deleteItem(task.id)
                return true
              } else {
                toast.error(`Could not find task matching "${identifier}"`)
                return false
              }
            }

            case 'update_task': {
              const identifier = action.data?.task_identifier?.toLowerCase()
              if (!identifier) {
                toast.error('Could not identify which task to update')
                return false
              }

              const task = itemStore.items.find((item) =>
                item.title.toLowerCase().includes(identifier)
              )

              if (task) {
                const updates: Partial<typeof task> = {}
                if (action.data?.title) updates.title = action.data.title
                if (action.data?.description) updates.description = action.data.description
                if (action.data?.due_date) updates.due_date = action.data.due_date

                await itemStore.updateItem(task.id, updates)
                toast.success('Task updated')
                return true
              } else {
                toast.error(`Could not find task matching "${identifier}"`)
                return false
              }
            }

            case 'unknown':
            default:
              toast.info(action.message || "I didn't understand that. Try something like 'add task call mom tomorrow'")
              return false
          }
        } catch (error) {
          toast.error('Failed to execute action')
          return false
        }
      },

      optimizeSchedule: async (date: string, scheduledItems: Item[], unscheduledTasks: Item[]): Promise<OptimizationResult | null> => {
        const { apiKey } = get()
        const toast = useToastStore.getState()

        if (!apiKey) {
          toast.error('Please set your Anthropic API key in Settings')
          return null
        }

        set({ isProcessing: true, lastError: null })

        try {
          const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

          // Build context about existing schedule
          const existingEvents = scheduledItems
            .filter(item => item.type === 'event')
            .map(item => ({
              id: item.id,
              title: item.title,
              start: item.start_time?.split('T')[1]?.substring(0, 5) || '',
              duration: item.duration_minutes || 60,
              type: 'event (fixed)',
            }))

          const existingScheduledTasks = scheduledItems
            .filter(item => item.type === 'task')
            .map(item => ({
              id: item.id,
              title: item.title,
              start: item.scheduled_start || '',
              duration: item.duration_minutes || 30,
              type: 'task (scheduled)',
            }))

          const availableTasks = unscheduledTasks.map(item => ({
            id: item.id,
            title: item.title,
            category: item.category?.name || 'None',
            due_date: item.due_date,
            duration: item.duration_minutes || 30,
          }))

          const scheduleSystemPrompt = `You are a productivity assistant helping optimize a daily schedule for ${date}.

Your job is to suggest optimal time slots for unscheduled tasks, while respecting existing fixed events.

Guidelines:
- Events (meetings, appointments) are FIXED and cannot be moved
- Tasks can be placed in any available time slot between 6:00 AM and 10:00 PM
- Respect task duration estimates
- Place high-priority or time-sensitive tasks (those with due dates) earlier in the day
- Group similar category tasks together when possible
- Include 15-minute buffers between activities when reasonable
- Peak productivity hours are typically 9-11 AM and 2-4 PM - place important tasks there
- Avoid scheduling right before/after fixed events without buffer time

Response format (JSON only, no markdown):
{
  "schedule": [
    { "item_id": "task-uuid", "scheduled_start": "HH:MM", "duration_minutes": 30 },
    { "item_id": "task-uuid", "scheduled_start": "HH:MM", "duration_minutes": 45 }
  ],
  "reasoning": "Brief explanation of the scheduling decisions made"
}

Only include tasks that you're suggesting to schedule. Don't include already-scheduled items or events.
If no tasks need scheduling or there's no room, return an empty schedule array with an explanation.`

          const userContent = `
Existing Fixed Events (cannot be moved):
${existingEvents.length > 0 ? JSON.stringify(existingEvents, null, 2) : 'None'}

Already Scheduled Tasks:
${existingScheduledTasks.length > 0 ? JSON.stringify(existingScheduledTasks, null, 2) : 'None'}

Unscheduled Tasks (need scheduling):
${availableTasks.length > 0 ? JSON.stringify(availableTasks, null, 2) : 'None'}

Please suggest an optimal schedule for the unscheduled tasks.`

          const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: scheduleSystemPrompt,
            messages: [
              {
                role: 'user',
                content: userContent,
              },
            ],
          })

          const content = response.content[0]
          if (content.type !== 'text') {
            throw new Error('Unexpected response type')
          }

          // Parse the JSON response
          const parsed = JSON.parse(content.text) as OptimizationResult
          set({ isProcessing: false })
          toast.success('Schedule optimized! Review suggestions below.')
          return parsed
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to optimize schedule'
          set({ isProcessing: false, lastError: errorMessage })
          toast.error('Failed to optimize schedule')
          return null
        }
      },
    }),
    {
      name: 'takt-ai-store',
      partialize: (state) => ({ apiKey: state.apiKey }),
    }
  )
)
