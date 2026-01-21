-- Sample data for Takt
-- Run this in Supabase SQL Editor

-- Get category IDs (we'll use these for the inserts)
DO $$
DECLARE
    work_id UUID;
    consulting_id UUID;
    home_id UUID;
    kids_id UUID;
    personal_id UUID;
    task1_id UUID;
    task2_id UUID;
    task3_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO work_id FROM categories WHERE name = 'Work';
    SELECT id INTO consulting_id FROM categories WHERE name = 'Consulting';
    SELECT id INTO home_id FROM categories WHERE name = 'Home';
    SELECT id INTO kids_id FROM categories WHERE name = 'Kids';
    SELECT id INTO personal_id FROM categories WHERE name = 'Personal';

    -- WORK TASKS
    INSERT INTO items (id, type, title, description, category_id, due_date, source)
    VALUES (gen_random_uuid(), 'task', 'Review Q1 budget proposal', 'Need to review and provide feedback before Friday meeting', work_id, now() + interval '2 days', 'manual')
    RETURNING id INTO task1_id;

    INSERT INTO items (id, type, title, description, category_id, due_date, source)
    VALUES (gen_random_uuid(), 'task', 'Prepare presentation slides', 'Slides for the quarterly review', work_id, now() + interval '4 days', 'manual')
    RETURNING id INTO task2_id;

    INSERT INTO items (id, type, title, description, category_id, due_date, completed, completed_at, source)
    VALUES (gen_random_uuid(), 'task', 'Send meeting notes to team', NULL, work_id, now() - interval '1 day', true, now(), 'manual');

    -- Add dependency: Presentation depends on budget review
    INSERT INTO dependencies (predecessor_id, successor_id) VALUES (task1_id, task2_id);

    -- WORK EVENTS
    INSERT INTO items (type, title, description, category_id, start_time, end_time, source)
    VALUES ('event', 'Team standup', 'Daily sync with the team', work_id, now() + interval '1 day' + interval '9 hours', now() + interval '1 day' + interval '9 hours 30 minutes', 'manual');

    INSERT INTO items (type, title, description, category_id, start_time, end_time, source)
    VALUES ('event', 'Quarterly review meeting', 'Present Q1 results to leadership', work_id, now() + interval '5 days' + interval '14 hours', now() + interval '5 days' + interval '16 hours', 'manual');

    -- CONSULTING TASKS
    INSERT INTO items (id, type, title, description, category_id, due_date, source)
    VALUES (gen_random_uuid(), 'task', 'Draft proposal for Acme Corp', 'Initial scope and pricing for their new project', consulting_id, now() + interval '3 days', 'manual')
    RETURNING id INTO task3_id;

    INSERT INTO items (type, title, description, category_id, due_date, source)
    VALUES ('task', 'Follow up with Beta Inc', 'Check on contract status', consulting_id, now() + interval '1 day', 'manual');

    INSERT INTO items (type, title, description, category_id, due_date, completed, completed_at, source)
    VALUES ('task', 'Invoice client for December', NULL, consulting_id, now() - interval '3 days', true, now() - interval '2 days', 'manual');

    -- CONSULTING EVENTS
    INSERT INTO items (type, title, description, category_id, start_time, end_time, source)
    VALUES ('event', 'Client call - Acme Corp', 'Discuss project requirements', consulting_id, now() + interval '2 days' + interval '10 hours', now() + interval '2 days' + interval '11 hours', 'manual');

    -- HOME TASKS
    INSERT INTO items (type, title, description, category_id, due_date, source)
    VALUES ('task', 'Call plumber about leak', 'Kitchen sink has been dripping', home_id, now() + interval '1 day', 'sms');

    INSERT INTO items (type, title, description, category_id, due_date, source, raw_sms)
    VALUES ('task', 'Buy groceries', 'Milk, eggs, bread, vegetables', home_id, now(), 'sms', 'Buy groceries - milk eggs bread veggies');

    INSERT INTO items (type, title, description, category_id, due_date, source)
    VALUES ('task', 'Schedule HVAC maintenance', 'Annual checkup before summer', home_id, now() + interval '7 days', 'manual');

    INSERT INTO items (type, title, description, category_id, due_date, completed, completed_at, source)
    VALUES ('task', 'Pay electric bill', NULL, home_id, now() - interval '5 days', true, now() - interval '5 days', 'manual');

    -- KIDS TASKS & EVENTS
    INSERT INTO items (type, title, description, category_id, due_date, source, raw_sms)
    VALUES ('task', 'Sign permission slip for field trip', 'Zoo trip next week', kids_id, now() + interval '2 days', 'sms', 'Need to sign Elijah permission slip for zoo trip');

    INSERT INTO items (type, title, description, category_id, start_time, end_time, source, raw_sms)
    VALUES ('event', 'Elijah dentist appointment', 'Dr. Barrios - routine checkup', kids_id, now() + interval '4 days' + interval '14 hours', now() + interval '4 days' + interval '15 hours', 'sms', 'Elijah has dentist at 2pm Thursday with Dr Barrios');

    INSERT INTO items (type, title, description, category_id, start_time, end_time, source)
    VALUES ('event', 'Soccer practice', 'Bring water and snacks', kids_id, now() + interval '3 days' + interval '16 hours', now() + interval '3 days' + interval '17 hours 30 minutes', 'manual');

    INSERT INTO items (type, title, description, category_id, due_date, source)
    VALUES ('task', 'Order birthday cake', 'Chocolate cake for party', kids_id, now() + interval '10 days', 'manual');

    -- PERSONAL TASKS & EVENTS
    INSERT INTO items (type, title, description, category_id, due_date, source)
    VALUES ('task', 'Book flight for vacation', 'Looking at dates in March', personal_id, now() + interval '5 days', 'manual');

    INSERT INTO items (type, title, description, category_id, due_date, source)
    VALUES ('task', 'Renew gym membership', 'Expires end of month', personal_id, now() + interval '8 days', 'manual');

    INSERT INTO items (type, title, description, category_id, start_time, end_time, source)
    VALUES ('event', 'Dinner with friends', 'Italian place downtown', personal_id, now() + interval '6 days' + interval '19 hours', now() + interval '6 days' + interval '21 hours', 'manual');

    INSERT INTO items (type, title, description, category_id, due_date, completed, completed_at, source)
    VALUES ('task', 'Get haircut', NULL, personal_id, now() - interval '2 days', true, now() - interval '1 day', 'manual');

    -- UNCATEGORIZED (no category)
    INSERT INTO items (type, title, description, category_id, due_date, source)
    VALUES ('task', 'Research new laptop options', 'Current one is getting slow', NULL, now() + interval '14 days', 'manual');

    -- Add some people for SMS parsing demo
    INSERT INTO people (name, aliases, default_category_id)
    VALUES ('Elijah', ARRAY['Eli'], kids_id);

    INSERT INTO people (name, aliases, default_category_id)
    VALUES ('Dr. Barrios', ARRAY['Barrios', 'the dentist'], kids_id);

END $$;

-- Verify data was inserted
SELECT
    'Items' as table_name,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE type = 'task') as tasks,
    COUNT(*) FILTER (WHERE type = 'event') as events,
    COUNT(*) FILTER (WHERE completed = true) as completed
FROM items
UNION ALL
SELECT 'Dependencies', COUNT(*), NULL, NULL, NULL FROM dependencies
UNION ALL
SELECT 'People', COUNT(*), NULL, NULL, NULL FROM people;
