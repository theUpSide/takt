import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Comprehensive SMS parsing prompt for Claude - supports queries, creation, batch ops, and more
const SMS_SYSTEM_PROMPT = `You are an expert assistant for a task management app called Takt. You handle SMS messages for:
1. Creating tasks and events
2. Querying existing tasks
3. Batch operations (reschedule, complete, delete multiple)
4. Task decomposition (breaking down complex tasks)
5. Completing or updating specific tasks

## DETERMINE THE ACTION TYPE

First, identify what the user wants:

**QUERY** - User is asking about their tasks:
- "what's due today", "what do I have today", "today's tasks"
- "what's overdue", "show overdue", "late tasks"
- "what's due this week", "this week's tasks"
- "show my tasks", "what's on my plate", "my todo list"
- "what's in [category]", "show work tasks"

**CREATE** - User wants to add new tasks/events:
- "remind me to", "add task", "create", "schedule", "need to"
- Any mention of specific tasks without query words

**BATCH** - User wants bulk operations:
- "reschedule all overdue to tomorrow"
- "move everything from today to monday"
- "complete all home tasks"
- "delete completed tasks"

**DECOMPOSE** - User wants to break down a task:
- "break down [task]", "decompose [task]", "split [task] into subtasks"
- "what steps for [task]", "help me plan [task]"

**TASK_GRAPH** - User provides a structured task list with dependencies:
- Tables with columns like ID, Task, Predecessor(s)
- Project plans with explicit dependency notation (e.g., "depends on 1, 3")
- WBS (Work Breakdown Structure) with predecessor columns
- Any multi-task list where tasks reference other tasks by ID/number

**COMPLETE** - User wants to mark task(s) done:
- "mark [task] done", "complete [task]", "finished [task]", "done with [task]"

**DELETE** - User wants to remove task(s):
- "delete [task]", "remove [task]", "cancel [task]"

## RESPONSE FORMAT

Return ONLY valid JSON based on action type:

### For QUERY:
{
  "action": "query",
  "query_type": "due_today" | "due_this_week" | "overdue" | "all_pending" | "by_category",
  "category_filter": "Work" (optional, for by_category),
  "message": "Let me check your tasks..."
}

### For CREATE (single or multiple items):
{
  "action": "create",
  "is_chain": false,
  "items": [
    {
      "type": "task" | "event",
      "title": "Concise title",
      "description": "Optional context" | null,
      "due_date": "YYYY-MM-DD" | null,
      "start_time": "YYYY-MM-DDTHH:MM:SS" | null,
      "end_time": "YYYY-MM-DDTHH:MM:SS" | null,
      "category_hint": "Work/Personal/Home/Health/Finance" | null,
      "suggested_recurring": { "frequency": "daily|weekly|monthly", "day": "monday" } | null
    }
  ]
}

### For BATCH operations:
{
  "action": "batch",
  "operation": "reschedule" | "complete" | "delete",
  "filter": {
    "status": "overdue" | "due_today" | "completed" | "all_pending",
    "category": "Work" | null,
    "date": "YYYY-MM-DD" | null
  },
  "reschedule_to": "YYYY-MM-DD" (required for reschedule),
  "message": "Description of what will happen"
}

### For DECOMPOSE:
{
  "action": "decompose",
  "original_task": "The task to break down",
  "subtasks": [
    { "title": "Step 1", "description": null },
    { "title": "Step 2", "description": null },
    { "title": "Step 3", "description": null }
  ],
  "category_hint": "Work" | null,
  "message": "Here's how I'd break that down..."
}

### For COMPLETE:
{
  "action": "complete",
  "task_identifier": "partial title to match",
  "message": "Marking task as complete..."
}

### For DELETE:
{
  "action": "delete",
  "task_identifier": "partial title to match",
  "message": "Removing task..."
}

### For TASK_GRAPH (complex dependencies):
{
  "action": "task_graph",
  "project_title": "Project Name" | null,
  "project_description": "Brief project description" | null,
  "tasks": [
    {
      "temp_id": "1",
      "title": "First task",
      "description": "Optional notes" | null,
      "predecessors": []
    },
    {
      "temp_id": "2",
      "title": "Second task depends on first",
      "description": null,
      "predecessors": ["1"]
    },
    {
      "temp_id": "3",
      "title": "Third task depends on multiple",
      "description": null,
      "predecessors": ["1", "2"]
    }
  ],
  "category_hint": "Work" | null,
  "message": "Created X tasks with dependencies"
}

IMPORTANT for task_graph:
- If the input looks like a project plan (has a title, multiple related tasks), extract project_title
- project_title groups all tasks under a project with its own Gantt section
- temp_id is a string identifier used ONLY for linking predecessors
- predecessors is an array of temp_ids that this task depends on
- Tasks with no predecessors have an empty array: "predecessors": []
- Extract temp_ids from table ID columns, row numbers, or explicit references
- Parse "depends on 1, 3" as predecessors: ["1", "3"]
- Parse "1, 2" in a Predecessor column as predecessors: ["1", "2"]
- Parse "—" or empty predecessor cells as predecessors: []

## RECURRING TASK DETECTION
When creating tasks, detect recurring patterns:
- "weekly standup" -> suggested_recurring: { frequency: "weekly" }
- "daily medication" -> suggested_recurring: { frequency: "daily" }
- "monthly review" -> suggested_recurring: { frequency: "monthly" }
- "every monday" -> suggested_recurring: { frequency: "weekly", day: "monday" }

## TASK DECOMPOSITION GUIDELINES
When decomposing, create 3-7 logical subtasks:
- "Plan vacation" -> Research destinations, Set budget, Book flights, Book hotel, Plan activities, Pack
- "Launch product" -> Finalize features, QA testing, Prepare marketing, Set up analytics, Deploy, Announce
- Make subtasks actionable and specific

## DATE PARSING
- "today" = current date
- "tomorrow" = next day
- "next week" = 7 days from now
- "next Monday" = coming Monday
- "end of week" = Friday

## CRITICAL: ALWAYS SET DATES
**EVERY task MUST have a due_date. EVERY event MUST have start_time and end_time.**
- If the user doesn't specify a date, default to TODAY's date
- If the user says "sometime" or is vague, use TODAY
- Never leave due_date as null for tasks
- Never leave start_time as null for events (default to a reasonable time like 09:00)

## EXAMPLES

Input: "what's due today"
Output: {"action":"query","query_type":"due_today","message":"Let me check what's due today..."}

Input: "show my overdue tasks"
Output: {"action":"query","query_type":"overdue","message":"Checking for overdue tasks..."}

Input: "reschedule all overdue tasks to tomorrow"
Output: {"action":"batch","operation":"reschedule","filter":{"status":"overdue"},"reschedule_to":"[tomorrow's date]","message":"I'll move all overdue tasks to tomorrow"}

Input: "complete all home tasks"
Output: {"action":"batch","operation":"complete","filter":{"status":"all_pending","category":"Home"},"message":"Marking all Home tasks as complete"}

Input: "break down plan vacation into steps"
Output: {"action":"decompose","original_task":"Plan vacation","subtasks":[{"title":"Research destinations","description":null},{"title":"Set budget","description":null},{"title":"Book flights","description":null},{"title":"Book accommodations","description":null},{"title":"Plan activities","description":null}],"category_hint":"Personal","message":"Here's how to break down planning your vacation"}

Input: "remind me to call mom tomorrow"
Output: {"action":"create","is_chain":false,"items":[{"type":"task","title":"Call mom","description":null,"due_date":"[tomorrow]","start_time":null,"end_time":null,"category_hint":"Personal","suggested_recurring":null}]}

Input: "weekly team standup every monday at 10am"
Output: {"action":"create","is_chain":false,"items":[{"type":"event","title":"Team standup","description":null,"due_date":null,"start_time":"[next monday]T10:00:00","end_time":"[next monday]T10:30:00","category_hint":"Work","suggested_recurring":{"frequency":"weekly","day":"monday"}}]}

Input: "mark buy groceries as done"
Output: {"action":"complete","task_identifier":"buy groceries","message":"Marking 'buy groceries' as complete"}

Input: "create connected tasks: design mockups, get feedback, implement changes"
Output: {"action":"create","is_chain":true,"items":[{"type":"task","title":"Design mockups","description":null,"due_date":null,"start_time":null,"end_time":null,"category_hint":"Work","suggested_recurring":null},{"type":"task","title":"Get feedback","description":null,"due_date":null,"start_time":null,"end_time":null,"category_hint":"Work","suggested_recurring":null},{"type":"task","title":"Implement changes","description":null,"due_date":null,"start_time":null,"end_time":null,"category_hint":"Work","suggested_recurring":null}]}

Input: "| ID | Task | Predecessor(s) |\n| 1 | Design | — |\n| 2 | Review | 1 |\n| 3 | Implement | 1, 2 |"
Output: {"action":"task_graph","tasks":[{"temp_id":"1","title":"Design","description":null,"predecessors":[]},{"temp_id":"2","title":"Review","description":null,"predecessors":["1"]},{"temp_id":"3","title":"Implement","description":null,"predecessors":["1","2"]}],"category_hint":"Work","message":"Created 3 tasks with dependencies"}

## CRITICAL RULES
- ALWAYS determine the correct action type first
- ALWAYS return valid JSON, no markdown
- Use EXACT dates from the provided date context
- For queries, don't create items - just return query parameters
- For decompose, generate realistic subtasks based on the task
- Detect recurring patterns and include suggested_recurring when appropriate`

// Helper to log to SMS log table
async function logSMS(
  supabase: ReturnType<typeof createClient>,
  data: {
    twilio_sid?: string
    from_number: string
    body: string
    parsed_result?: unknown
    items_created?: number
    error?: string
  }
) {
  try {
    await supabase.from('sms_log').insert({
      twilio_sid: data.twilio_sid || null,
      from_number: data.from_number,
      body: data.body,
      parsed_result: data.parsed_result || null,
      items_created: data.items_created || 0,
      error: data.error || null,
      processed_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Failed to log SMS:', err)
  }
}

// Helper to get timezone-aware date string
function getLocalDateInfo() {
  const now = new Date()

  // Get dates for context
  const today = new Date(now)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const formatDate = (d: Date) => d.toISOString().split('T')[0]
  const formatDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long' })

  // Calculate this week's days
  const daysOfWeek: Record<string, string> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const dayName = formatDay(d).toLowerCase()
    daysOfWeek[dayName] = formatDate(d)
  }

  return {
    today: formatDate(today),
    todayName: formatDay(today),
    tomorrow: formatDate(tomorrow),
    tomorrowName: formatDay(tomorrow),
    currentTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    daysOfWeek,
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let from = ''
  let body = ''
  let messageSid = ''

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    // Validate required env vars
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration')
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Server configuration error</Message></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' }, status: 200 }
      )
    }

    if (!anthropicApiKey) {
      console.error('Missing Anthropic API key')
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Server configuration error</Message></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' }, status: 200 }
      )
    }

    // Initialize Supabase client early for logging
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the incoming Twilio webhook (form-urlencoded)
    let formData: FormData
    try {
      formData = await req.formData()
    } catch (parseError) {
      console.error('Failed to parse form data:', parseError)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Invalid request format</Message></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' }, status: 200 }
      )
    }

    from = formData.get('From') as string || ''
    body = formData.get('Body') as string || ''
    messageSid = formData.get('MessageSid') as string || ''

    console.log(`Received SMS from ${from}: ${body}`)

    if (!body || !from) {
      await logSMS(supabase, {
        twilio_sid: messageSid,
        from_number: from || 'unknown',
        body: body || '(empty)',
        error: 'Missing message body or sender',
      })
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error: Missing message data</Message></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' }, status: 200 }
      )
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey: anthropicApiKey })

    // Get detailed date context for Claude
    const dateInfo = getLocalDateInfo()
    const dateContext = `
CURRENT DATE/TIME CONTEXT:
- Today: ${dateInfo.today} (${dateInfo.todayName})
- Tomorrow: ${dateInfo.tomorrow} (${dateInfo.tomorrowName})
- Current time: ${dateInfo.currentTime}
- This week's dates:
${Object.entries(dateInfo.daysOfWeek).map(([day, date]) => `  - ${day}: ${date}`).join('\n')}

Use these EXACT dates when the user mentions relative days.`

    // Get existing categories for context
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
    const categoryList = categories?.map(c => c.name).join(', ') || 'Work, Personal, Home'

    // Parse SMS with Claude
    console.log('Calling Claude to parse SMS...')
    console.log('Date context:', dateContext)

    let response
    try {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SMS_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${dateContext}\n\nAvailable categories in the app: ${categoryList}\n\nParse this SMS message and extract all tasks/events:\n"${body}"`,
          },
        ],
      })
    } catch (claudeError) {
      console.error('Claude API error:', claudeError)
      await logSMS(supabase, {
        twilio_sid: messageSid,
        from_number: from,
        body: body,
        error: `Claude API error: ${claudeError instanceof Error ? claudeError.message : 'Unknown error'}`,
      })
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, I had trouble understanding that. Please try again.</Message></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' }, status: 200 }
      )
    }

    const content = response.content[0]
    if (content.type !== 'text') {
      console.error('Unexpected Claude response type:', content.type)
      await logSMS(supabase, {
        twilio_sid: messageSid,
        from_number: from,
        body: body,
        error: 'Unexpected Claude response type',
      })
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, something went wrong. Please try again.</Message></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' }, status: 200 }
      )
    }

    console.log('Claude raw response:', content.text)

    // Parse Claude's JSON response
    let parsed
    try {
      // Clean potential markdown code blocks
      let jsonText = content.text.trim()
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7)
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3)
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3)
      }
      parsed = JSON.parse(jsonText.trim())
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError, 'Raw:', content.text)
      await logSMS(supabase, {
        twilio_sid: messageSid,
        from_number: from,
        body: body,
        error: `Failed to parse AI response: ${content.text.substring(0, 200)}`,
      })
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, I had trouble parsing that. Please try a simpler message.</Message></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' }, status: 200 }
      )
    }

    console.log('Parsed result:', JSON.stringify(parsed, null, 2))

    // Determine action type and handle accordingly
    const action = parsed.action || 'create' // Default to create for backwards compatibility
    let confirmationMsg: string

    switch (action) {
      // ============ QUERY ACTION ============
      case 'query': {
        const queryType = parsed.query_type
        let queryResults: Array<{ id: string; title: string; due_date?: string; type: string }> = []

        if (queryType === 'due_today') {
          const { data } = await supabase
            .from('items')
            .select('id, title, due_date, type, start_time')
            .eq('completed', false)
            .or(`due_date.eq.${dateInfo.today},start_time.gte.${dateInfo.today}T00:00:00,start_time.lt.${dateInfo.tomorrow}T00:00:00`)
            .order('due_date', { ascending: true })
            .limit(10)
          queryResults = data || []
        } else if (queryType === 'due_this_week') {
          const weekEnd = new Date()
          weekEnd.setDate(weekEnd.getDate() + 7)
          const weekEndStr = weekEnd.toISOString().split('T')[0]
          const { data } = await supabase
            .from('items')
            .select('id, title, due_date, type')
            .eq('completed', false)
            .gte('due_date', dateInfo.today)
            .lte('due_date', weekEndStr)
            .order('due_date', { ascending: true })
            .limit(15)
          queryResults = data || []
        } else if (queryType === 'overdue') {
          const { data } = await supabase
            .from('items')
            .select('id, title, due_date, type')
            .eq('completed', false)
            .eq('type', 'task')
            .lt('due_date', dateInfo.today)
            .order('due_date', { ascending: true })
            .limit(10)
          queryResults = data || []
        } else if (queryType === 'all_pending') {
          const { data } = await supabase
            .from('items')
            .select('id, title, due_date, type')
            .eq('completed', false)
            .order('due_date', { ascending: true, nullsFirst: false })
            .limit(15)
          queryResults = data || []
        } else if (queryType === 'by_category' && parsed.category_filter) {
          const categoryMatch = categories?.find(
            (c: { id: string; name: string }) => c.name.toLowerCase() === parsed.category_filter.toLowerCase()
          )
          if (categoryMatch) {
            const { data } = await supabase
              .from('items')
              .select('id, title, due_date, type')
              .eq('completed', false)
              .eq('category_id', categoryMatch.id)
              .order('due_date', { ascending: true, nullsFirst: false })
              .limit(15)
            queryResults = data || []
          }
        }

        // Format response
        if (queryResults.length === 0) {
          confirmationMsg = queryType === 'overdue'
            ? "Great news! You have no overdue tasks."
            : queryType === 'due_today'
            ? "You have nothing due today. Enjoy your free time!"
            : "No tasks found matching that query."
        } else {
          const taskList = queryResults
            .slice(0, 8) // Keep SMS concise
            .map((t, i) => `${i + 1}. ${t.title}${t.due_date ? ` (${t.due_date})` : ''}`)
            .join('\n')

          const header = queryType === 'overdue'
            ? `You have ${queryResults.length} overdue task${queryResults.length > 1 ? 's' : ''}:`
            : queryType === 'due_today'
            ? `Today's tasks (${queryResults.length}):`
            : queryType === 'due_this_week'
            ? `This week (${queryResults.length}):`
            : `Tasks (${queryResults.length}):`

          confirmationMsg = `${header}\n${taskList}`
          if (queryResults.length > 8) {
            confirmationMsg += `\n...and ${queryResults.length - 8} more`
          }
        }

        await logSMS(supabase, {
          twilio_sid: messageSid,
          from_number: from,
          body: body,
          parsed_result: parsed,
          items_created: 0,
        })
        break
      }

      // ============ BATCH ACTION ============
      case 'batch': {
        const operation = parsed.operation
        const filter = parsed.filter || {}
        let affectedItems: Array<{ id: string; title: string }> = []

        // Build query based on filter
        let query = supabase.from('items').select('id, title, due_date')

        if (filter.status === 'overdue') {
          query = query.eq('completed', false).eq('type', 'task').lt('due_date', dateInfo.today)
        } else if (filter.status === 'due_today') {
          query = query.eq('completed', false).eq('due_date', dateInfo.today)
        } else if (filter.status === 'completed') {
          query = query.eq('completed', true)
        } else if (filter.status === 'all_pending') {
          query = query.eq('completed', false)
        }

        if (filter.category && categories) {
          const cat = categories.find(
            (c: { id: string; name: string }) => c.name.toLowerCase() === filter.category.toLowerCase()
          )
          if (cat) {
            query = query.eq('category_id', cat.id)
          }
        }

        if (filter.date) {
          query = query.eq('due_date', filter.date)
        }

        const { data: itemsToUpdate } = await query.limit(50)
        affectedItems = itemsToUpdate || []

        if (affectedItems.length === 0) {
          confirmationMsg = "No tasks match that criteria."
        } else if (operation === 'reschedule' && parsed.reschedule_to) {
          // Reschedule all matching items
          const ids = affectedItems.map(i => i.id)
          const { error } = await supabase
            .from('items')
            .update({ due_date: parsed.reschedule_to, updated_at: new Date().toISOString() })
            .in('id', ids)

          if (error) {
            confirmationMsg = `Failed to reschedule: ${error.message}`
          } else {
            confirmationMsg = `Rescheduled ${affectedItems.length} task${affectedItems.length > 1 ? 's' : ''} to ${parsed.reschedule_to}`
          }
        } else if (operation === 'complete') {
          // Complete all matching items
          const ids = affectedItems.map(i => i.id)
          const { error } = await supabase
            .from('items')
            .update({ completed: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .in('id', ids)

          if (error) {
            confirmationMsg = `Failed to complete: ${error.message}`
          } else {
            confirmationMsg = `Completed ${affectedItems.length} task${affectedItems.length > 1 ? 's' : ''}! Nice work!`
          }
        } else if (operation === 'delete') {
          // Delete all matching items
          const ids = affectedItems.map(i => i.id)
          const { error } = await supabase
            .from('items')
            .delete()
            .in('id', ids)

          if (error) {
            confirmationMsg = `Failed to delete: ${error.message}`
          } else {
            confirmationMsg = `Deleted ${affectedItems.length} item${affectedItems.length > 1 ? 's' : ''}`
          }
        } else {
          confirmationMsg = "Unknown batch operation."
        }

        await logSMS(supabase, {
          twilio_sid: messageSid,
          from_number: from,
          body: body,
          parsed_result: parsed,
          items_created: 0,
        })
        break
      }

      // ============ DECOMPOSE ACTION ============
      case 'decompose': {
        const subtasks = parsed.subtasks || []
        if (subtasks.length === 0) {
          confirmationMsg = "I couldn't break that task down. Try being more specific."
          break
        }

        const createdSubtasks: Array<{ id: string; title: string }> = []

        // Find category
        let categoryId = null
        if (parsed.category_hint && categories) {
          const cat = categories.find(
            (c: { id: string; name: string }) => c.name.toLowerCase() === parsed.category_hint.toLowerCase()
          )
          categoryId = cat?.id || null
        }

        // Create subtasks as a chain - all due today for Gantt visibility
        for (const subtask of subtasks) {
          const { data: newItem, error } = await supabase
            .from('items')
            .insert({
              type: 'task',
              title: subtask.title,
              description: subtask.description || `Part of: ${parsed.original_task}`,
              due_date: dateInfo.today, // Default to today for Gantt visibility
              category_id: categoryId,
              source: 'sms',
              raw_sms: body,
            })
            .select()
            .single()

          if (!error && newItem) {
            createdSubtasks.push({ id: newItem.id, title: subtask.title })

            // Create dependency chain
            if (createdSubtasks.length > 1) {
              await supabase.from('dependencies').insert({
                predecessor_id: createdSubtasks[createdSubtasks.length - 2].id,
                successor_id: newItem.id,
              })
            }
          }
        }

        if (createdSubtasks.length > 0) {
          confirmationMsg = `Broke down "${parsed.original_task}" into ${createdSubtasks.length} connected subtasks:\n` +
            createdSubtasks.map((t, i) => `${i + 1}. ${t.title}`).join('\n')
        } else {
          confirmationMsg = "Failed to create subtasks."
        }

        await logSMS(supabase, {
          twilio_sid: messageSid,
          from_number: from,
          body: body,
          parsed_result: parsed,
          items_created: createdSubtasks.length,
        })
        break
      }

      // ============ COMPLETE ACTION ============
      case 'complete': {
        const identifier = parsed.task_identifier?.toLowerCase()
        if (!identifier) {
          confirmationMsg = "I couldn't identify which task to complete."
          break
        }

        const { data: matchingTasks } = await supabase
          .from('items')
          .select('id, title')
          .eq('completed', false)
          .ilike('title', `%${identifier}%`)
          .limit(1)

        if (!matchingTasks || matchingTasks.length === 0) {
          confirmationMsg = `Couldn't find an open task matching "${identifier}"`
        } else {
          const task = matchingTasks[0]
          const { error } = await supabase
            .from('items')
            .update({ completed: true, completed_at: new Date().toISOString() })
            .eq('id', task.id)

          if (error) {
            confirmationMsg = `Failed to complete task: ${error.message}`
          } else {
            confirmationMsg = `Done! Completed "${task.title}"`
          }
        }

        await logSMS(supabase, {
          twilio_sid: messageSid,
          from_number: from,
          body: body,
          parsed_result: parsed,
          items_created: 0,
        })
        break
      }

      // ============ DELETE ACTION ============
      case 'delete': {
        const identifier = parsed.task_identifier?.toLowerCase()
        if (!identifier) {
          confirmationMsg = "I couldn't identify which task to delete."
          break
        }

        const { data: matchingTasks } = await supabase
          .from('items')
          .select('id, title')
          .ilike('title', `%${identifier}%`)
          .limit(1)

        if (!matchingTasks || matchingTasks.length === 0) {
          confirmationMsg = `Couldn't find a task matching "${identifier}"`
        } else {
          const task = matchingTasks[0]
          const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', task.id)

          if (error) {
            confirmationMsg = `Failed to delete task: ${error.message}`
          } else {
            confirmationMsg = `Deleted "${task.title}"`
          }
        }

        await logSMS(supabase, {
          twilio_sid: messageSid,
          from_number: from,
          body: body,
          parsed_result: parsed,
          items_created: 0,
        })
        break
      }

      // ============ TASK_GRAPH ACTION ============
      case 'task_graph': {
        const tasks = parsed.tasks || []
        if (tasks.length === 0) {
          confirmationMsg = "I couldn't parse any tasks from that input."
          break
        }

        // Find category
        let categoryId = null
        if (parsed.category_hint && categories) {
          const cat = categories.find(
            (c: { id: string; name: string }) => c.name.toLowerCase() === parsed.category_hint.toLowerCase()
          )
          categoryId = cat?.id || null
        }

        // Create project if project_title provided
        let projectId: string | null = null
        let projectTitle: string | null = null
        if (parsed.project_title) {
          projectTitle = parsed.project_title
          // We need to get the user from their phone number
          const { data: userPrefs } = await supabase
            .from('user_preferences')
            .select('user_id')
            .eq('phone', from)
            .single()

          if (userPrefs?.user_id) {
            const { data: project, error: projectError } = await supabase
              .from('projects')
              .insert({
                user_id: userPrefs.user_id,
                title: parsed.project_title,
                description: parsed.project_description || null,
                status: 'active',
              })
              .select()
              .single()

            if (!projectError && project) {
              projectId = project.id
              console.log(`Created project: ${project.title} (${project.id})`)
            } else {
              console.error('Failed to create project:', projectError)
            }
          } else {
            console.warn('Could not find user for phone number:', from)
          }
        }

        // Map of temp_id -> actual UUID for dependency linking
        const tempIdToUuid: Record<string, string> = {}
        const createdTasks: Array<{ temp_id: string; uuid: string; title: string }> = []
        const failedTasks: string[] = []

        // First pass: Create all tasks
        for (const task of tasks) {
          if (!task.title || !task.temp_id) {
            console.warn('Skipping task without title or temp_id:', task)
            failedTasks.push(`Invalid task: ${JSON.stringify(task).substring(0, 50)}`)
            continue
          }

          const { data: newItem, error } = await supabase
            .from('items')
            .insert({
              type: 'task',
              title: task.title,
              description: task.description || null,
              due_date: dateInfo.today, // Default to today for Gantt visibility
              category_id: categoryId,
              project_id: projectId, // Assign to project if created
              source: 'sms',
              raw_sms: body,
            })
            .select()
            .single()

          if (error) {
            console.error('Error creating task:', error)
            failedTasks.push(`Failed to create "${task.title}"`)
            continue
          }

          tempIdToUuid[task.temp_id] = newItem.id
          createdTasks.push({ temp_id: task.temp_id, uuid: newItem.id, title: task.title })
          console.log(`Created task ${task.temp_id} -> ${newItem.id}: ${task.title}`)
        }

        // Second pass: Create dependencies
        let dependenciesCreated = 0
        for (const task of tasks) {
          if (!task.predecessors || task.predecessors.length === 0) continue

          const successorId = tempIdToUuid[task.temp_id]
          if (!successorId) continue

          for (const predTempId of task.predecessors) {
            const predecessorId = tempIdToUuid[predTempId]
            if (!predecessorId) {
              console.warn(`Predecessor ${predTempId} not found for task ${task.temp_id}`)
              continue
            }

            const { error: depError } = await supabase
              .from('dependencies')
              .insert({
                predecessor_id: predecessorId,
                successor_id: successorId,
              })

            if (depError) {
              console.error('Error creating dependency:', depError)
            } else {
              dependenciesCreated++
              console.log(`Created dependency: ${predTempId} -> ${task.temp_id}`)
            }
          }
        }

        // Build confirmation message
        if (createdTasks.length === 0) {
          confirmationMsg = "Failed to create any tasks from that input."
        } else {
          const projectInfo = projectTitle ? `Project "${projectTitle}": ` : ''
          confirmationMsg = `${projectInfo}Created ${createdTasks.length} tasks with ${dependenciesCreated} dependencies:\n` +
            createdTasks.slice(0, 8).map((t, i) => `${i + 1}. ${t.title}`).join('\n')
          if (createdTasks.length > 8) {
            confirmationMsg += `\n...and ${createdTasks.length - 8} more`
          }
        }

        await logSMS(supabase, {
          twilio_sid: messageSid,
          from_number: from,
          body: body,
          parsed_result: parsed,
          items_created: createdTasks.length,
        })
        break
      }

      // ============ CREATE ACTION (default) ============
      case 'create':
      default: {
        const items = parsed.items || [parsed]

        if (!Array.isArray(items) || items.length === 0) {
          console.error('No items in parsed result:', parsed)
          await logSMS(supabase, {
            twilio_sid: messageSid,
            from_number: from,
            body: body,
            parsed_result: parsed,
            error: 'No items found in parsed result',
          })
          confirmationMsg = "Sorry, I couldn't find any tasks or events in your message."
          break
        }

        const createdItems: Array<{ id: string; type: string; title: string }> = []
        const failedItems: string[] = []
        const isChain = parsed.is_chain === true
        let hasRecurringSuggestion = false

        for (const item of items) {
          if (!item.type || !item.title) {
            console.warn('Skipping invalid item:', item)
            failedItems.push(`Invalid item: missing type or title`)
            continue
          }

          let categoryId = null
          if (item.category_hint && categories) {
            const matchedCategory = categories.find(
              (c: { id: string; name: string }) => c.name.toLowerCase() === item.category_hint.toLowerCase()
            )
            categoryId = matchedCategory?.id || null
          }

          const itemData: Record<string, unknown> = {
            type: item.type,
            title: item.title,
            description: item.description || null,
            category_id: categoryId,
            source: 'sms',
            raw_sms: body,
          }

          // CRITICAL: Always set dates for Gantt chart visibility
          if (item.type === 'task') {
            // Default to today if no due_date provided
            itemData.due_date = item.due_date || dateInfo.today
          } else if (item.type === 'event') {
            // Default to today at 9am if no times provided
            if (item.start_time) {
              itemData.start_time = item.start_time
            } else {
              itemData.start_time = `${dateInfo.today}T09:00:00`
            }
            if (item.end_time) {
              itemData.end_time = item.end_time
            } else {
              // Default to 1 hour after start
              const startTime = itemData.start_time as string
              const startDate = new Date(startTime)
              startDate.setHours(startDate.getHours() + 1)
              itemData.end_time = startDate.toISOString().replace(/\.\d{3}Z$/, '')
            }
          }

          // Check for recurring suggestion
          if (item.suggested_recurring) {
            hasRecurringSuggestion = true
            // Store recurring pattern (will be used when we add recurring support)
            itemData.recurring_pattern = item.suggested_recurring
          }

          console.log('Creating item:', itemData)

          const { data: newItem, error: itemError } = await supabase
            .from('items')
            .insert(itemData)
            .select()
            .single()

          if (itemError) {
            console.error('Error creating item:', itemError)
            failedItems.push(`Failed to create "${item.title}": ${itemError.message}`)
            continue
          }

          console.log('Created item:', newItem.id, newItem.title)
          createdItems.push({ id: newItem.id, type: item.type, title: item.title })
        }

        // Create task chain dependencies if needed
        if (isChain && createdItems.length > 1) {
          console.log('Creating dependencies for task chain...')
          for (let i = 1; i < createdItems.length; i++) {
            const predecessorId = createdItems[i - 1].id
            const successorId = createdItems[i].id

            const { error: depError } = await supabase
              .from('dependencies')
              .insert({
                predecessor_id: predecessorId,
                successor_id: successorId,
              })

            if (depError) {
              console.error('Failed to create dependency:', depError)
            } else {
              console.log(`Created dependency: ${createdItems[i - 1].title} -> ${createdItems[i].title}`)
            }
          }
        }

        await logSMS(supabase, {
          twilio_sid: messageSid,
          from_number: from,
          body: body,
          parsed_result: parsed,
          items_created: createdItems.length,
          error: failedItems.length > 0 ? failedItems.join('; ') : undefined,
        })

        // Build confirmation message
        if (createdItems.length === 0) {
          confirmationMsg = "Sorry, I couldn't create any items from that message."
          if (failedItems.length > 0) {
            confirmationMsg += ` Error: ${failedItems[0]}`
          }
        } else if (createdItems.length === 1) {
          const item = createdItems[0]
          confirmationMsg = `Got it! Created ${item.type}: "${item.title}"`
          if (hasRecurringSuggestion) {
            confirmationMsg += " (Tip: This looks recurring - set it up in the app!)"
          }
        } else if (isChain) {
          confirmationMsg = `Got it! Created ${createdItems.length} connected tasks:\n` +
            createdItems.map((i, idx) => `${idx + 1}. ${i.title}`).join('\n')
        } else {
          confirmationMsg = `Got it! Created ${createdItems.length} items:\n` +
            createdItems.map(i => `- ${i.title}`).join('\n')
        }
        break
      }
    }

    console.log('Sending TwiML response:', confirmationMsg)

    // Return TwiML response - Twilio requires exactly this format
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(confirmationMsg)}</Message></Response>`

    return new Response(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
      },
    })

  } catch (error) {
    console.error('Unhandled error processing SMS:', error)

    // Try to log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await logSMS(supabase, {
          from_number: from || 'unknown',
          body: body || '(unknown)',
          error: `Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, I couldn't process that. Try again or add manually in the app.</Message></Response>`

    return new Response(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
      },
    })
  }
})

// Helper to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
