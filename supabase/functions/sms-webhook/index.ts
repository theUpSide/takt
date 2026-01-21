import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Comprehensive SMS parsing prompt for Claude
const SMS_SYSTEM_PROMPT = `You are an expert assistant that parses natural language SMS messages into structured task and event data for a task management app called Takt.

## YOUR ROLE
Parse the user's SMS message and extract ALL tasks and/or events mentioned. Be thorough - users often mention multiple items in a single message.

## UNDERSTANDING TASKS vs EVENTS

**EVENTS** - Have a specific scheduled time:
- Keywords: "at", "from...to", "meeting", "appointment", "call with", "lunch with", "dinner at"
- Examples: "haircut at 3pm", "meeting with John at 2", "dentist appointment tomorrow 10am"
- Events have start_time (required) and optionally end_time

**TASKS** - To-do items without a specific time:
- Keywords: "need to", "have to", "remind me to", "don't forget", "pick up", "buy", "call", "email"
- Examples: "buy groceries", "call mom", "finish report by Friday"
- Tasks have due_date (optional) but NO specific time

## PARSING RULES

1. **Multiple items**: Look for conjunctions (and, also, plus), commas, numbered lists, or separate sentences
2. **Relative dates**: Convert "today", "tomorrow", "next Monday", "this Friday" to actual YYYY-MM-DD dates
3. **Relative times**: Convert "at 3", "at 3pm", "3 o'clock" to full ISO datetime
4. **Implied items**: "pickup X on the way home" = event (implies going somewhere at a time)
5. **Category hints**: Infer from context - "dentist" = Health, "meeting" = Work, "groceries" = Home
6. **Ambiguous times**: If someone says "tomorrow at 11", that's 11:00 AM unless they say PM
7. **Duration**: Events typically last 30-60 min unless specified ("1 hour meeting")

## TITLE FORMATTING
- Keep titles concise (2-6 words)
- Use action verbs: "Get haircut", "Pick up dry cleaning", "Call dentist"
- Don't include dates/times in the title - those go in the date fields

## RESPONSE FORMAT
Return ONLY valid JSON, no markdown, no explanation:

{
  "items": [
    {
      "type": "task" or "event",
      "title": "Concise action title",
      "description": "Additional context or null",
      "due_date": "YYYY-MM-DD or null (tasks only)",
      "start_time": "YYYY-MM-DDTHH:MM:SS or null (events only)",
      "end_time": "YYYY-MM-DDTHH:MM:SS or null (events, optional)",
      "category_hint": "Work/Personal/Home/Health/Finance or null"
    }
  ]
}

## EXAMPLES

Input: "remind me to call mom tomorrow"
Output: {"items":[{"type":"task","title":"Call mom","description":null,"due_date":"[tomorrow's date]","start_time":null,"end_time":null,"category_hint":"Personal"}]}

Input: "haircut tomorrow at 11am, pickup dry cleaning friday 7pm"
Output: {"items":[
  {"type":"event","title":"Get haircut","description":null,"due_date":null,"start_time":"[tomorrow]T11:00:00","end_time":"[tomorrow]T11:30:00","category_hint":"Personal"},
  {"type":"event","title":"Pick up dry cleaning","description":null,"due_date":null,"start_time":"[friday]T19:00:00","end_time":"[friday]T19:15:00","category_hint":"Home"}
]}

Input: "I have a few things: 1) buy groceries 2) call dentist to schedule 3) team meeting tuesday 2pm"
Output: {"items":[
  {"type":"task","title":"Buy groceries","description":null,"due_date":null,"start_time":null,"end_time":null,"category_hint":"Home"},
  {"type":"task","title":"Call dentist to schedule","description":null,"due_date":null,"start_time":null,"end_time":null,"category_hint":"Health"},
  {"type":"event","title":"Team meeting","description":null,"due_date":null,"start_time":"[tuesday]T14:00:00","end_time":"[tuesday]T15:00:00","category_hint":"Work"}
]}

Input: "Can you add a task to get a haircut tomorrow at 11 AM, pick up the dry cleaning on Friday at 7 PM, and pick up a home furnace filter today on the way home"
Output: {"items":[
  {"type":"event","title":"Get haircut","description":null,"due_date":null,"start_time":"[tomorrow]T11:00:00","end_time":"[tomorrow]T11:30:00","category_hint":"Personal"},
  {"type":"event","title":"Pick up dry cleaning","description":null,"due_date":null,"start_time":"[friday]T19:00:00","end_time":"[friday]T19:15:00","category_hint":"Home"},
  {"type":"task","title":"Pick up furnace filter","description":"On the way home","due_date":"[today]","start_time":null,"end_time":null,"category_hint":"Home"}
]}

Input: "meeting with sarah at 3, also need to review the Q4 budget by end of week"
Output: {"items":[
  {"type":"event","title":"Meeting with Sarah","description":null,"due_date":null,"start_time":"[today]T15:00:00","end_time":"[today]T16:00:00","category_hint":"Work"},
  {"type":"task","title":"Review Q4 budget","description":null,"due_date":"[friday]","start_time":null,"end_time":null,"category_hint":"Work"}
]}

## CRITICAL RULES
- ALWAYS return the "items" array format, even for single items
- ALWAYS use actual dates calculated from the current date provided
- NEVER include markdown formatting or code blocks
- If unsure whether task or event, prefer TASK unless there's a specific time
- Extract EVERY item mentioned, don't skip any`

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

    // Handle both old single-item format and new multi-item format
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
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, I couldn\'t find any tasks or events in your message.</Message></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' }, status: 200 }
      )
    }

    const createdItems: Array<{ type: string; title: string }> = []
    const failedItems: string[] = []

    for (const item of items) {
      // Validate item has required fields
      if (!item.type || !item.title) {
        console.warn('Skipping invalid item:', item)
        failedItems.push(`Invalid item: missing type or title`)
        continue
      }

      // Find matching category
      let categoryId = null
      if (item.category_hint && categories) {
        const matchedCategory = categories.find(
          (c: { id: string; name: string }) => c.name.toLowerCase() === item.category_hint.toLowerCase()
        )
        categoryId = matchedCategory?.id || null
      }

      // Create the item in the database
      const itemData: Record<string, unknown> = {
        type: item.type,
        title: item.title,
        description: item.description || null,
        category_id: categoryId,
        source: 'sms',
        raw_sms: body,
      }

      if (item.type === 'task' && item.due_date) {
        itemData.due_date = item.due_date
      } else if (item.type === 'event') {
        if (item.start_time) itemData.start_time = item.start_time
        if (item.end_time) itemData.end_time = item.end_time
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
      createdItems.push({ type: item.type, title: item.title })
    }

    // Log the SMS with results
    await logSMS(supabase, {
      twilio_sid: messageSid,
      from_number: from,
      body: body,
      parsed_result: parsed,
      items_created: createdItems.length,
      error: failedItems.length > 0 ? failedItems.join('; ') : undefined,
    })

    // Build confirmation message
    let confirmationMsg: string
    if (createdItems.length === 0) {
      confirmationMsg = "Sorry, I couldn't create any items from that message."
      if (failedItems.length > 0) {
        confirmationMsg += ` Error: ${failedItems[0]}`
      }
    } else if (createdItems.length === 1) {
      const item = createdItems[0]
      confirmationMsg = `Got it! Created ${item.type}: "${item.title}"`
    } else {
      confirmationMsg = `Got it! Created ${createdItems.length} items: ` +
        createdItems.map(i => i.title).join(', ')
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
