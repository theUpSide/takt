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
- "remind me to call mom tomorrow" → 1 task
- "haircut tomorrow at 11am, pickup dry cleaning friday 7pm" → 2 events
- "I need to: 1) buy groceries 2) call dentist 3) meeting with John tuesday 2pm" → 2 tasks + 1 event

Always respond with valid JSON only. Always use the "items" array format even for single items.`

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

    // Handle both old single-item format and new multi-item format
    const items = parsed.items || [parsed]
    const createdItems: Array<{ type: string; title: string }> = []

    for (const item of items) {
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
        description: item.description,
        category_id: categoryId,
        source: 'sms',
        raw_sms: body,
      }

      if (item.type === 'task' && item.due_date) {
        itemData.due_date = item.due_date
      } else if (item.type === 'event') {
        itemData.start_time = item.start_time
        itemData.end_time = item.end_time
      }

      const { data: newItem, error: itemError } = await supabase
        .from('items')
        .insert(itemData)
        .select()
        .single()

      if (itemError) {
        console.error('Error creating item:', itemError)
        continue // Skip this item but try others
      }

      console.log('Created item:', newItem)
      createdItems.push({ type: item.type, title: item.title })
    }

    // Log the SMS with all parsed items
    await supabase.from('sms_log').insert({
      twilio_sid: messageSid,
      from_number: from,
      body: body,
      parsed_result: parsed,
      item_id: null, // Multiple items, so we don't link to a single one
      processed_at: new Date().toISOString(),
    })

    // Build confirmation message
    let confirmationMsg: string
    if (createdItems.length === 0) {
      confirmationMsg = "Sorry, I couldn't create any items from that message."
    } else if (createdItems.length === 1) {
      confirmationMsg = `Got it! Created ${createdItems[0].type}: "${createdItems[0].title}"`
    } else {
      confirmationMsg = `Got it! Created ${createdItems.length} items:\n` +
        createdItems.map(i => `• ${i.title}`).join('\n')
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
