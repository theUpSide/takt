import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Anthropic from '@anthropic-ai/sdk'
import { useItemStore } from './itemStore'
import { useCategoryStore } from './categoryStore'
import { useToastStore } from './toastStore'
import { getTodayString } from '@/lib/dateUtils'
import type { Item } from '@/types'

interface TaskInChain {
  title: string
  description?: string
  due_date?: string
  category_name?: string
}

interface SubtaskData {
  title: string
  description?: string
}

interface BatchFilter {
  status?: 'overdue' | 'due_today' | 'completed' | 'all_pending'
  category?: string
  date?: string
}

interface SuggestedRecurring {
  frequency: 'daily' | 'weekly' | 'monthly'
  day?: string
}

interface ParsedAction {
  type: 'create_task' | 'create_event' | 'complete_task' | 'delete_task' | 'update_task' | 'create_task_chain' | 'query' | 'batch' | 'decompose' | 'unknown'
  data?: {
    title?: string
    description?: string
    due_date?: string
    start_time?: string
    end_time?: string
    category_name?: string
    task_identifier?: string
    // For task chains
    tasks?: TaskInChain[]
    // For queries
    query_type?: 'due_today' | 'due_this_week' | 'overdue' | 'all_pending' | 'by_category'
    category_filter?: string
    // For batch operations
    operation?: 'reschedule' | 'complete' | 'delete'
    filter?: BatchFilter
    reschedule_to?: string
    // For decomposition
    original_task?: string
    subtasks?: SubtaskData[]
    // For recurring detection
    suggested_recurring?: SuggestedRecurring
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

const SYSTEM_PROMPT = `You are an AI assistant for a task management app called Takt. You handle:
1. Creating tasks and events
2. Querying existing tasks
3. Batch operations (reschedule, complete, delete multiple)
4. Task decomposition (breaking down complex tasks)
5. Completing, updating, or deleting specific tasks

## DETERMINE THE ACTION TYPE

**QUERY** - User is asking about their tasks:
- "what's due today", "show today's tasks", "what do I have today"
- "what's overdue", "show overdue tasks"
- "what's due this week", "this week's schedule"
- "show my tasks", "what's on my plate"
- "what's in Work category", "show personal tasks"

**CREATE** - User wants to add tasks/events:
- "remind me to", "add task", "create", "schedule", "need to"
- Use create_task for tasks, create_event for time-specific items

**BATCH** - User wants bulk operations:
- "reschedule all overdue to tomorrow"
- "move everything from today to monday"
- "complete all home tasks"
- "delete all completed tasks"

**DECOMPOSE** - User wants to break down a task:
- "break down [task]", "decompose [task]", "split [task] into subtasks"
- "what steps for [task]", "help me plan [task]"

**COMPLETE/DELETE/UPDATE** - Single task operations:
- "mark [task] done", "complete [task]"
- "delete [task]", "remove [task]"
- "change [task] to...", "update [task]"

## RESPONSE FORMAT (JSON only, no markdown)

### For QUERY:
{
  "type": "query",
  "data": {
    "query_type": "due_today" | "due_this_week" | "overdue" | "all_pending" | "by_category",
    "category_filter": "Work" (optional, for by_category)
  },
  "message": "Let me check your tasks..."
}

### For CREATE (task or event):
{
  "type": "create_task" | "create_event",
  "data": {
    "title": "Task title",
    "description": "Optional description",
    "due_date": "YYYY-MM-DD" (tasks only),
    "start_time": "YYYY-MM-DDTHH:MM:SS" (events only),
    "end_time": "YYYY-MM-DDTHH:MM:SS" (events only),
    "category_name": "Work/Personal/Home/Health/Finance",
    "suggested_recurring": { "frequency": "weekly", "day": "monday" } | null
  },
  "message": "Creating task..."
}

### For TASK CHAINS:
{
  "type": "create_task_chain",
  "data": {
    "tasks": [
      { "title": "First task" },
      { "title": "Second task" },
      { "title": "Third task" }
    ],
    "category_name": "optional"
  },
  "message": "Created X connected tasks"
}

### For BATCH:
{
  "type": "batch",
  "data": {
    "operation": "reschedule" | "complete" | "delete",
    "filter": {
      "status": "overdue" | "due_today" | "completed" | "all_pending",
      "category": "Work" | null
    },
    "reschedule_to": "YYYY-MM-DD" (for reschedule only)
  },
  "message": "I'll move all overdue tasks to tomorrow"
}

### For DECOMPOSE:
{
  "type": "decompose",
  "data": {
    "original_task": "The task to break down",
    "subtasks": [
      { "title": "Step 1" },
      { "title": "Step 2" },
      { "title": "Step 3" }
    ],
    "category_name": "Work"
  },
  "message": "Here's how I'd break that down..."
}

### For COMPLETE/DELETE/UPDATE:
{
  "type": "complete_task" | "delete_task" | "update_task",
  "data": {
    "task_identifier": "partial title to match",
    "title": "new title (for update)",
    "due_date": "new date (for update)"
  },
  "message": "Completing task..."
}

## RECURRING DETECTION
When creating, detect recurring patterns:
- "weekly standup" -> suggested_recurring: { frequency: "weekly" }
- "daily medication" -> suggested_recurring: { frequency: "daily" }
- "every monday" -> suggested_recurring: { frequency: "weekly", day: "monday" }

## DECOMPOSITION GUIDELINES
When decomposing, create 3-7 actionable subtasks:
- "Plan vacation" -> Research destinations, Set budget, Book flights, Book hotel, Plan activities
- "Launch product" -> Finalize features, QA testing, Marketing prep, Deploy, Announce

## DATE PARSING
- "today" = current date
- "tomorrow" = next day
- "next week" = 7 days from now
- "next Monday" = coming Monday

## EXAMPLES

"what's due today" -> query with query_type: "due_today"
"show overdue tasks" -> query with query_type: "overdue"
"reschedule all overdue to tomorrow" -> batch with operation: "reschedule", filter: { status: "overdue" }
"break down plan vacation" -> decompose with subtasks
"weekly team standup mondays at 10am" -> create_event with suggested_recurring
"remind me to call mom tomorrow" -> create_task
"mark grocery shopping done" -> complete_task

Always respond with valid JSON only.`

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
            // ============ QUERY ACTION ============
            case 'query': {
              const queryType = action.data?.query_type
              const items = itemStore.items
              const today = getTodayString()
              let results: Item[] = []

              if (queryType === 'due_today') {
                results = items.filter(
                  (item) => !item.completed && (item.due_date === today || item.start_time?.startsWith(today))
                )
              } else if (queryType === 'due_this_week') {
                const weekEnd = new Date()
                weekEnd.setDate(weekEnd.getDate() + 7)
                const weekEndStr = weekEnd.toISOString().split('T')[0]
                results = items.filter(
                  (item) => !item.completed && item.due_date && item.due_date >= today && item.due_date <= weekEndStr
                )
              } else if (queryType === 'overdue') {
                results = items.filter(
                  (item) => !item.completed && item.type === 'task' && item.due_date && item.due_date < today
                )
              } else if (queryType === 'all_pending') {
                results = items.filter((item) => !item.completed)
              } else if (queryType === 'by_category' && action.data?.category_filter) {
                const cat = categoryStore.categories.find(
                  (c) => c.name.toLowerCase() === action.data!.category_filter!.toLowerCase()
                )
                if (cat) {
                  results = items.filter((item) => !item.completed && item.category_id === cat.id)
                }
              }

              // Display results
              if (results.length === 0) {
                const msg =
                  queryType === 'overdue'
                    ? 'Great news! You have no overdue tasks.'
                    : queryType === 'due_today'
                      ? 'You have nothing due today!'
                      : 'No tasks found matching that query.'
                toast.info(msg)
              } else {
                const header =
                  queryType === 'overdue'
                    ? `${results.length} overdue task${results.length > 1 ? 's' : ''}`
                    : queryType === 'due_today'
                      ? `${results.length} due today`
                      : queryType === 'due_this_week'
                        ? `${results.length} this week`
                        : `${results.length} task${results.length > 1 ? 's' : ''}`
                const taskList = results
                  .slice(0, 5)
                  .map((t) => t.title)
                  .join(', ')
                toast.info(`${header}: ${taskList}${results.length > 5 ? '...' : ''}`)
              }
              return true
            }

            // ============ BATCH ACTION ============
            case 'batch': {
              const operation = action.data?.operation
              const filter = action.data?.filter
              const today = getTodayString()
              let matchingItems: Item[] = itemStore.items

              // Apply filters
              if (filter?.status === 'overdue') {
                matchingItems = matchingItems.filter(
                  (item) => !item.completed && item.type === 'task' && item.due_date && item.due_date < today
                )
              } else if (filter?.status === 'due_today') {
                matchingItems = matchingItems.filter((item) => !item.completed && item.due_date === today)
              } else if (filter?.status === 'completed') {
                matchingItems = matchingItems.filter((item) => item.completed)
              } else if (filter?.status === 'all_pending') {
                matchingItems = matchingItems.filter((item) => !item.completed)
              }

              if (filter?.category) {
                const cat = categoryStore.categories.find(
                  (c) => c.name.toLowerCase() === filter.category!.toLowerCase()
                )
                if (cat) {
                  matchingItems = matchingItems.filter((item) => item.category_id === cat.id)
                }
              }

              if (matchingItems.length === 0) {
                toast.info('No tasks match that criteria')
                return false
              }

              if (operation === 'reschedule' && action.data?.reschedule_to) {
                for (const item of matchingItems) {
                  await itemStore.updateItem(item.id, { due_date: action.data.reschedule_to })
                }
                toast.success(`Rescheduled ${matchingItems.length} task${matchingItems.length > 1 ? 's' : ''} to ${action.data.reschedule_to}`)
              } else if (operation === 'complete') {
                for (const item of matchingItems) {
                  if (!item.completed) {
                    await itemStore.toggleComplete(item.id)
                  }
                }
                toast.success(`Completed ${matchingItems.length} task${matchingItems.length > 1 ? 's' : ''}!`)
              } else if (operation === 'delete') {
                for (const item of matchingItems) {
                  await itemStore.deleteItem(item.id)
                }
                toast.success(`Deleted ${matchingItems.length} item${matchingItems.length > 1 ? 's' : ''}`)
              }
              return true
            }

            // ============ DECOMPOSE ACTION ============
            case 'decompose': {
              const subtasks = action.data?.subtasks
              if (!subtasks || subtasks.length === 0) {
                toast.error("Couldn't break that task down. Try being more specific.")
                return false
              }

              const categoryId = action.data?.category_name
                ? categoryStore.categories.find(
                    (c) => c.name.toLowerCase() === action.data!.category_name!.toLowerCase()
                  )?.id
                : undefined

              const createdIds: string[] = []

              for (const subtask of subtasks) {
                const newItem = await itemStore.createItem({
                  type: 'task',
                  title: subtask.title,
                  description: subtask.description || `Part of: ${action.data?.original_task}`,
                  category_id: categoryId,
                })

                if (newItem) {
                  createdIds.push(newItem.id)
                  // Create dependency chain
                  if (createdIds.length > 1) {
                    await itemStore.addDependency(createdIds[createdIds.length - 2], newItem.id)
                  }
                }
              }

              toast.success(`Broke "${action.data?.original_task}" into ${createdIds.length} connected subtasks`)
              return true
            }

            // ============ CREATE TASK ============
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

              // Notify about recurring suggestion
              if (action.data?.suggested_recurring) {
                toast.info(`Tip: "${action.data.title}" looks recurring. Set up recurrence in task details!`)
              }
              return true
            }

            // ============ CREATE EVENT ============
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

              if (action.data?.suggested_recurring) {
                toast.info(`Tip: "${action.data.title}" looks recurring. Set up recurrence in event details!`)
              }
              return true
            }

            // ============ COMPLETE TASK ============
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

            // ============ DELETE TASK ============
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

            // ============ UPDATE TASK ============
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

            // ============ CREATE TASK CHAIN ============
            case 'create_task_chain': {
              const tasks = action.data?.tasks
              if (!tasks || tasks.length === 0) {
                toast.error('No tasks provided for the chain')
                return false
              }

              const categoryId = action.data?.category_name
                ? categoryStore.categories.find(
                    (c) => c.name.toLowerCase() === action.data!.category_name!.toLowerCase()
                  )?.id
                : undefined

              const createdTaskIds: string[] = []

              for (const taskData of tasks) {
                const newItem = await itemStore.createItem({
                  type: 'task',
                  title: taskData.title,
                  description: taskData.description,
                  due_date: taskData.due_date,
                  category_id: taskData.category_name
                    ? categoryStore.categories.find(
                        (c) => c.name.toLowerCase() === taskData.category_name!.toLowerCase()
                      )?.id
                    : categoryId,
                })

                if (newItem) {
                  createdTaskIds.push(newItem.id)

                  if (createdTaskIds.length > 1) {
                    const predecessorId = createdTaskIds[createdTaskIds.length - 2]
                    await itemStore.addDependency(predecessorId, newItem.id)
                  }
                }
              }

              toast.success(`Created ${createdTaskIds.length} connected tasks`)
              return true
            }

            case 'unknown':
            default:
              toast.info(action.message || "I didn't understand that. Try 'add task', 'what's due today', or 'break down [task]'")
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
            description: item.description || null,
            category: item.category?.name || 'None',
            due_date: item.due_date,
            user_estimated_duration: item.duration_minutes || null,
          }))

          const scheduleSystemPrompt = `You are a productivity assistant helping optimize a daily schedule for ${date}.

Your job is to suggest optimal time slots for unscheduled tasks, while respecting existing fixed events.

IMPORTANT - Duration Estimation:
- You have extensive world knowledge about how long typical tasks take
- Use the task title and description to intelligently estimate realistic durations
- If a user provided an estimate, consider it but use your judgment if it seems unrealistic
- Common duration guidelines:
  * Quick tasks (emails, calls, simple updates): 15-30 min
  * Medium tasks (meetings, focused work sessions): 30-60 min
  * Deep work (coding, writing, analysis): 60-120 min
  * Errands, appointments: 30-90 min depending on type
- When in doubt, estimate slightly longer to build in buffer

Scheduling Guidelines:
- Events (meetings, appointments) are FIXED and cannot be moved
- Tasks can be placed in any available time slot between 6:00 AM and 10:00 PM
- Place high-priority or time-sensitive tasks (those with due dates today) earlier
- Group similar category tasks together when possible
- Include 15-minute buffers between activities
- Peak productivity hours: 9-11 AM and 2-4 PM for complex work
- Schedule routine/simple tasks during low-energy times (early morning, after lunch)
- Avoid back-to-back intensive tasks

Response format (JSON only, no markdown):
{
  "schedule": [
    { "item_id": "task-uuid", "scheduled_start": "HH:MM", "duration_minutes": 30 },
    { "item_id": "task-uuid", "scheduled_start": "HH:MM", "duration_minutes": 45 }
  ],
  "reasoning": "Brief explanation of your scheduling decisions and duration estimates"
}

Schedule ALL provided unscheduled tasks unless there's genuinely no room.
Be proactive and helpful - make intelligent decisions about timing and duration.`

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
