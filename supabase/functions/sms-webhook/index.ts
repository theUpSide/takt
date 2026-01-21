import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SMS parsing prompt for Claude
const SMS_SYSTEM_PROMPT = `You are an AI assistant that parses SMS messages into structured task/event data for a task management app called Takt.

The message may contain ONE or MULTIPLE tasks/events. Extract ALL of them.

For each item, determine:
1. Whether it's a task (to-do item) or event (has specific start/end time)
2. The title/subject
3. Any description details
4. Due date for tasks OR start/end time for events
5. Category hint (Work, Personal, Home, Health, etc.)

Response format (JSON only, no markdown) - ALWAYS return an array:
{
  "items": [
    {
      "type": "task" | "event",
      "title": "concise title",
      "description": "additional details or null",
      "due_date": "YYYY-MM-DD" (for tasks, or null),
      "start_time": "YYYY-MM-DDTHH:MM:SS" (for events, or null),
      "end_time": "YYYY-MM-DDTHH:MM:SS" (for events, or null),
      "category_hint": "suggested category name or null"
    }
  ]
}

Examples:
- "remind me to call mom tomorrow" → 1 task with due_date
- "haircut tomorrow at 11am" → 1 event with start_time
- "pickup dry cleaning friday 7pm" → 1 event with start_time
- "I need to: 1) buy groceries 2) call dentist 3) meeting with John tuesday 2pm" → 2 tasks + 1 event
- "Can you please add a task to get a haircut tomorrow at 11 AM, pick up the dry cleaning on Friday at 7 PM, and pick up a home furnace filter today on the way home" → 3 events

IMPORTANT:
- If someone says "at [time]", it's an EVENT with start_time, not a task
- If someone says "by [date]" or just a day with no time, it's a TASK with due_date
- Always respond with valid JSON only, no extra text
- Always use the "items" array format even for single items`

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
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      )
    }

    if (!anthropicApiKey) {
      console.error('Missing Anthropic API key')
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Server configuration error</Message></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
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
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
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
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      )
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey: anthropicApiKey })

    // Get current date context for Claude (use local date calculation)
    const now = new Date()
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
    const dateStr = localDate.toISOString().split('T')[0]
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
    const fullDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const dateContext = `Current date: ${dateStr} (${dayName}). Full date: ${fullDate}. Current time: ${now.toLocaleTimeString()}.`

    // Get existing categories for context
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
    const categoryList = categories?.map(c => c.name).join(', ') || 'Work, Personal, Home'

    // Parse SMS with Claude
    console.log('Calling Claude to parse SMS...')
    let response
    try {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SMS_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${dateContext}\n\nAvailable categories: ${categoryList}\n\nSMS message: "${body}"`,
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
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
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
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
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
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
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
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
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
        confirmationMsg += ` Errors: ${failedItems[0]}`
      }
    } else if (createdItems.length === 1) {
      const item = createdItems[0]
      confirmationMsg = `Got it! Created ${item.type}: "${item.title}"`
    } else {
      confirmationMsg = `Got it! Created ${createdItems.length} items:\n` +
        createdItems.map(i => `• ${i.title}`).join('\n')
    }

    // Return TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(confirmationMsg)}</Message>
</Response>`

    return new Response(twiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
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

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I couldn't process that. Try again or add manually in the app.</Message>
</Response>`

    return new Response(twiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
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
