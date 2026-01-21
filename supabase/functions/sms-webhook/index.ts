import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SMS parsing prompt for Claude
const SMS_SYSTEM_PROMPT = `You are an AI assistant that parses SMS messages into structured task/event data for a task management app called Takt.

Analyze the incoming SMS and extract:
1. Whether it's a task (to-do item) or event (has specific start/end time)
2. The title/subject
3. Any description details
4. Due date for tasks OR start/end time for events
5. Category hint (Work, Personal, Home, Health, etc.)
6. Any people mentioned

Response format (JSON only, no markdown):
{
  "type": "task" | "event",
  "title": "concise title",
  "description": "additional details or null",
  "due_date": "YYYY-MM-DD" (for tasks, or null),
  "start_time": "YYYY-MM-DDTHH:MM:SS" (for events, or null),
  "end_time": "YYYY-MM-DDTHH:MM:SS" (for events, or null),
  "category_hint": "suggested category name or null",
  "people_mentioned": ["name1", "name2"],
  "confidence": 0.0-1.0
}

Examples:
- "remind me to call mom tomorrow" → task, title "Call mom", due_date tomorrow
- "meeting with John Friday 2pm" → event, title "Meeting with John", start_time Friday 2pm
- "buy groceries" → task, title "Buy groceries", category_hint "Home"
- "dentist tuesday 10-11am" → event, title "Dentist appointment", start/end times

Always respond with valid JSON only.`

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!

    // Parse the incoming Twilio webhook (form-urlencoded)
    const formData = await req.formData()
    const from = formData.get('From') as string
    const body = formData.get('Body') as string
    const messageSid = formData.get('MessageSid') as string

    console.log(`Received SMS from ${from}: ${body}`)

    if (!body || !from) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error: Missing message data</Message></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      )
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const anthropic = new Anthropic({ apiKey: anthropicApiKey })

    // Get current date context for Claude
    const now = new Date()
    const dateContext = `Current date/time: ${now.toISOString()}. Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`

    // Get existing categories for context
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
    const categoryList = categories?.map(c => c.name).join(', ') || 'Work, Personal, Home'

    // Parse SMS with Claude
    const response = await anthropic.messages.create({
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

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const parsed = JSON.parse(content.text)
    console.log('Parsed result:', parsed)

    // Find matching category
    let categoryId = null
    if (parsed.category_hint && categories) {
      const matchedCategory = categories.find(
        c => c.name.toLowerCase() === parsed.category_hint.toLowerCase()
      )
      categoryId = matchedCategory?.id || null
    }

    // Create the item in the database
    const itemData: Record<string, unknown> = {
      type: parsed.type,
      title: parsed.title,
      description: parsed.description,
      category_id: categoryId,
      source: 'sms',
      raw_sms: body,
    }

    if (parsed.type === 'task' && parsed.due_date) {
      itemData.due_date = parsed.due_date
    } else if (parsed.type === 'event') {
      itemData.start_time = parsed.start_time
      itemData.end_time = parsed.end_time
    }

    const { data: newItem, error: itemError } = await supabase
      .from('items')
      .insert(itemData)
      .select()
      .single()

    if (itemError) {
      console.error('Error creating item:', itemError)
      throw itemError
    }

    console.log('Created item:', newItem)

    // Log the SMS
    await supabase.from('sms_log').insert({
      twilio_sid: messageSid,
      from_number: from,
      body: body,
      parsed_result: parsed,
      item_id: newItem.id,
      processed_at: new Date().toISOString(),
    })

    // Build confirmation message
    let confirmationMsg = `Got it! Created ${parsed.type}: "${parsed.title}"`
    if (parsed.type === 'task' && parsed.due_date) {
      const dueDate = new Date(parsed.due_date)
      confirmationMsg += ` (due ${dueDate.toLocaleDateString()})`
    } else if (parsed.type === 'event' && parsed.start_time) {
      const startTime = new Date(parsed.start_time)
      confirmationMsg += ` (${startTime.toLocaleString()})`
    }

    // Return TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${confirmationMsg}</Message>
</Response>`

    return new Response(twiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    })

  } catch (error) {
    console.error('Error processing SMS:', error)

    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I couldn't process that. Try again or add manually in the app.</Message>
</Response>`

    return new Response(twiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    })
  }
})
