import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserPreference {
  id: string
  user_id: string
  phone: string
  timezone: string
  daily_briefing_enabled: boolean
  daily_briefing_time: string
}

interface TaskSummary {
  dueToday: Array<{ title: string; due_date: string | null }>
  overdue: Array<{ title: string; due_date: string | null }>
  eventsToday: Array<{ title: string; start_time: string }>
}

// Get today's date in a specific timezone
function getTodayInTimezone(timezone: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(now)
  } catch {
    // Fallback to UTC
    return new Date().toISOString().split('T')[0]
  }
}

// Format time for display
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return ''
  }
}

// Send SMS via Twilio
async function sendSMS(to: string, body: string): Promise<boolean> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

  if (!accountSid || !authToken || !fromNumber) {
    console.error('Missing Twilio credentials')
    return false
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: body,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Twilio API error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to send SMS:', error)
    return false
  }
}

// Build the briefing message
function buildBriefingMessage(summary: TaskSummary, userName?: string): string {
  const greeting = userName ? `Good morning, ${userName}!` : 'Good morning!'
  const lines: string[] = [greeting, '']

  // Overdue tasks (urgent)
  if (summary.overdue.length > 0) {
    lines.push(`⚠️ ${summary.overdue.length} OVERDUE:`)
    summary.overdue.slice(0, 3).forEach((t) => {
      lines.push(`  • ${t.title}`)
    })
    if (summary.overdue.length > 3) {
      lines.push(`  ...and ${summary.overdue.length - 3} more`)
    }
    lines.push('')
  }

  // Today's events
  if (summary.eventsToday.length > 0) {
    lines.push(`📅 TODAY'S SCHEDULE:`)
    summary.eventsToday.slice(0, 4).forEach((e) => {
      const time = formatTime(e.start_time)
      lines.push(`  • ${time}: ${e.title}`)
    })
    if (summary.eventsToday.length > 4) {
      lines.push(`  ...and ${summary.eventsToday.length - 4} more`)
    }
    lines.push('')
  }

  // Tasks due today
  if (summary.dueToday.length > 0) {
    lines.push(`✅ ${summary.dueToday.length} TASK${summary.dueToday.length > 1 ? 'S' : ''} DUE TODAY:`)
    summary.dueToday.slice(0, 4).forEach((t) => {
      lines.push(`  • ${t.title}`)
    })
    if (summary.dueToday.length > 4) {
      lines.push(`  ...and ${summary.dueToday.length - 4} more`)
    }
    lines.push('')
  }

  // If nothing to report
  if (summary.overdue.length === 0 && summary.eventsToday.length === 0 && summary.dueToday.length === 0) {
    lines.push("You're all clear today! No tasks due or overdue.")
    lines.push('')
  }

  lines.push('Reply with "what\'s due today" anytime for updates.')

  return lines.join('\n')
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all users with daily briefing enabled
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('daily_briefing_enabled', true)
      .not('phone', 'is', null)

    if (prefError) {
      console.error('Error fetching preferences:', prefError)
      throw prefError
    }

    if (!preferences || preferences.length === 0) {
      console.log('No users have daily briefing enabled')
      return new Response(JSON.stringify({ sent: 0, message: 'No users have daily briefing enabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Processing ${preferences.length} users with daily briefing enabled`)

    let sentCount = 0
    const errors: string[] = []

    for (const pref of preferences as UserPreference[]) {
      try {
        const timezone = pref.timezone || 'America/New_York'
        const today = getTodayInTimezone(timezone)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]

        console.log(`Processing user ${pref.user_id}, timezone: ${timezone}, today: ${today}`)

        // Get tasks due today
        const { data: dueTodayTasks } = await supabase
          .from('items')
          .select('title, due_date')
          .eq('type', 'task')
          .eq('completed', false)
          .eq('due_date', today)
          .order('title')
          .limit(10)

        // Get overdue tasks
        const { data: overdueTasks } = await supabase
          .from('items')
          .select('title, due_date')
          .eq('type', 'task')
          .eq('completed', false)
          .lt('due_date', today)
          .order('due_date', { ascending: true })
          .limit(10)

        // Get today's events
        const { data: todayEvents } = await supabase
          .from('items')
          .select('title, start_time')
          .eq('type', 'event')
          .gte('start_time', `${today}T00:00:00`)
          .lt('start_time', `${tomorrowStr}T00:00:00`)
          .order('start_time', { ascending: true })
          .limit(10)

        const summary: TaskSummary = {
          dueToday: dueTodayTasks || [],
          overdue: overdueTasks || [],
          eventsToday: todayEvents || [],
        }

        // Build and send the message
        const message = buildBriefingMessage(summary)
        console.log(`Sending briefing to ${pref.phone}:\n${message}`)

        const sent = await sendSMS(pref.phone, message)
        if (sent) {
          sentCount++
          console.log(`Successfully sent briefing to ${pref.phone}`)
        } else {
          errors.push(`Failed to send to ${pref.phone}`)
        }
      } catch (userError) {
        console.error(`Error processing user ${pref.user_id}:`, userError)
        errors.push(`Error for user ${pref.user_id}: ${userError}`)
      }
    }

    return new Response(
      JSON.stringify({
        sent: sentCount,
        total: preferences.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Daily briefing error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
