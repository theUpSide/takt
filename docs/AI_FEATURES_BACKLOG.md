# Takt AI Features Backlog

## Priority Legend
- **P0** - Critical, high impact, implement now
- **P1** - High impact, implement soon
- **P2** - Medium impact, implement when time permits
- **P3** - Nice to have, future consideration

## Status Legend
- [ ] Not started
- [x] Complete
- [~] In progress

---

## P0 - Implement Now (Top 5) ✅ COMPLETE

### 1. Query Tasks via SMS & In-App ✅
**Impact:** High | **Effort:** Low-Medium

Allow users to ask questions about their tasks:
- "What's due today?"
- "What's on my plate this week?"
- "Show me overdue tasks"
- "What tasks are in the Work category?"
- "What depends on [task name]?"

**Implementation:**
- [x] Add `query` action type to SMS webhook
- [x] Add `query` action type to in-app AI store
- [x] Query types: due_today, due_this_week, overdue, by_category, by_dependency
- [x] Return formatted text response (not create items)

---

### 2. Batch Operations ✅
**Impact:** High | **Effort:** Medium

Power-user commands for bulk actions:
- "Reschedule all overdue tasks to tomorrow"
- "Move all tasks from today to Monday"
- "Complete all Home category tasks"
- "Delete all completed tasks"

**Implementation:**
- [x] Add `batch_reschedule` action type
- [x] Add `batch_complete` action type
- [x] Add `batch_delete` action type
- [x] Support both SMS and in-app

---

### 3. Task Decomposition ✅
**Impact:** High | **Effort:** Low

Let Claude break down complex tasks into subtasks:
- "Break down 'plan vacation' into subtasks"
- "Decompose 'launch product' into steps"

**Implementation:**
- [x] Add `decompose_task` action type
- [x] Claude generates 3-7 logical subtasks
- [x] Create as task chain with dependencies

---

### 4. Recurring Task Detection ✅
**Impact:** Medium | **Effort:** Low

Detect recurring patterns and suggest:
- Keywords: "weekly", "daily", "every Monday", "monthly"
- Response includes `suggested_recurring: { frequency: "weekly", day: "monday" }`
- In-app: Show prompt "This looks like a recurring task. Make it repeat weekly?"

**Implementation:**
- [x] Update prompts to detect recurring patterns
- [x] Add `suggested_recurring` field to parsed response
- [x] Database: Add `recurring_pattern` jsonb field to items table

---

### 5. Daily Briefing (SMS) ✅
**Impact:** High | **Effort:** Medium

Scheduled morning SMS with daily summary:
- Tasks due today
- Overdue tasks count
- Events scheduled
- Top 3 priorities

**Implementation:**
- [x] Create `daily-briefing` Supabase Edge Function
- [x] Add `user_preferences` table with phone, briefing_time, timezone
- [ ] Supabase cron job to trigger at user's preferred time (requires Supabase dashboard setup)
- [x] Twilio outbound SMS

---

## P1 - Implement Soon

### 6. End-of-Day Review (SMS)
**Impact:** Medium | **Effort:** Medium

Evening summary with rollover option:
- "You completed 5 tasks today!"
- "2 tasks are still pending. Reply MOVE to reschedule to tomorrow."

**Implementation:**
- [ ] Create `eod-review` Supabase Edge Function
- [ ] Track daily completions
- [ ] Simple reply handling for MOVE command

---

### 7. Multi-turn SMS Conversations
**Impact:** Medium | **Effort:** Medium

Session memory for follow-up messages:
- "Create a task to call John" → "What time?" → "3pm tomorrow"
- 5-minute session timeout keyed by phone number

**Implementation:**
- [ ] Add `sms_sessions` table (phone, context, expires_at)
- [ ] Check for active session before parsing
- [ ] Merge context into Claude prompt

---

### 8. Dependency Alerts
**Impact:** Medium | **Effort:** Medium

Proactive notifications when blockers are overdue:
- "Heads up: 'Submit proposal' is blocked by 'Get approval' which is 2 days overdue"

**Implementation:**
- [ ] Scheduled function to check dependency chains
- [ ] Identify blocked tasks with overdue predecessors
- [ ] Send SMS/push notification

---

### 9. Smart Duration Learning
**Impact:** Medium | **Effort:** Medium

Track actual vs estimated durations:
- When user completes task, record actual time
- Build per-user duration model
- Improve estimates over time

**Implementation:**
- [ ] Add `actual_duration_minutes` field
- [ ] Track completion time delta
- [ ] Category-based duration averages
- [ ] Feed into schedule optimization prompt

---

### 10. Priority Suggestions
**Impact:** Medium | **Effort:** Low

Claude suggests priority based on:
- Due date urgency
- Dependency chain position
- Category patterns

**Implementation:**
- [ ] Add `suggested_priority` to create responses
- [ ] Add priority field to items (high/medium/low)
- [ ] Visual priority indicators in UI

---

## P2 - Implement When Time Permits

### 11. Calendar Integration (Google/Outlook)
**Impact:** High | **Effort:** High

Sync external calendar events:
- See busy times in daily planner
- "Schedule around my meetings"
- Import events as Takt events

**Implementation:**
- [ ] OAuth flow for Google Calendar
- [ ] OAuth flow for Microsoft Graph
- [ ] Sync service (read-only initially)
- [ ] Display external events in time grid

---

### 12. Email-to-Task
**Impact:** Medium | **Effort:** High

Forward emails to create tasks:
- Dedicated email address per user
- Claude extracts action items
- Creates task(s) with email context in description

**Implementation:**
- [ ] Email receiving service (SendGrid/Mailgun inbound)
- [ ] Parse email body with Claude
- [ ] Link to original email

---

### 13. Voice Input (Whisper)
**Impact:** Medium | **Effort:** Medium

Hold-to-speak in mobile app:
- Record audio
- Transcribe with Whisper API
- Parse with existing Claude pipeline

**Implementation:**
- [ ] Audio recording component
- [ ] Whisper API integration
- [ ] Pipe transcript to processNaturalLanguage

---

### 14. Workload Balancing
**Impact:** Medium | **Effort:** Medium

Warn when days are overloaded:
- "Tuesday has 12 hours of tasks scheduled"
- "Want me to suggest what to move?"

**Implementation:**
- [ ] Calculate daily workload from durations
- [ ] Compare to working hours setting
- [ ] Proactive rebalancing suggestions

---

### 15. WhatsApp/Telegram Integration
**Impact:** Medium | **Effort:** Medium

Alternative messaging platforms:
- WhatsApp Business API
- Telegram Bot API
- Same parsing logic, different transport

**Implementation:**
- [ ] WhatsApp webhook handler
- [ ] Telegram bot handler
- [ ] Shared parsing module

---

## P3 - Future Consideration

### 16. Location-Based Reminders
- "Remind me to buy milk when near grocery store"
- Requires mobile app with location permissions

### 17. Browser Extension
- Highlight text → "Add as task"
- Quick capture from any webpage

### 18. Slack Integration
- Create tasks from Slack messages
- Daily briefing in Slack DM

### 19. Natural Language Filters
- "Show me tasks I created last week"
- "Find all tasks mentioning 'budget'"

### 20. Goal/Project Hierarchy
- Connect tasks to higher-level goals
- Progress tracking toward goals

---

## Database Schema Changes Needed

```sql
-- For recurring tasks
ALTER TABLE items ADD COLUMN recurring_pattern jsonb;
-- Example: {"frequency": "weekly", "day": "monday", "end_date": "2025-12-31"}

-- For priority
ALTER TABLE items ADD COLUMN priority text CHECK (priority IN ('high', 'medium', 'low'));

-- For duration tracking
ALTER TABLE items ADD COLUMN actual_duration_minutes integer;

-- For user preferences (briefings, timezone, etc.)
CREATE TABLE user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  phone text,
  timezone text DEFAULT 'America/New_York',
  daily_briefing_enabled boolean DEFAULT false,
  daily_briefing_time time DEFAULT '08:00',
  eod_review_enabled boolean DEFAULT false,
  eod_review_time time DEFAULT '18:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- For SMS session memory
CREATE TABLE sms_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  context jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_sms_sessions_phone ON sms_sessions(phone);
```

---

## Implementation Notes

### SMS Response Length
- Twilio SMS limit: 1600 characters (concatenated)
- Keep responses concise
- For long lists, summarize and offer "Reply MORE for details"

### Rate Limiting
- Claude API calls are expensive
- Consider caching common queries
- Rate limit per phone number

### Error Handling
- Always return friendly error messages
- Log all failures for debugging
- Graceful degradation if Claude is unavailable
