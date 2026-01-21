-- Performance indexes

-- Items indexes
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_due_date ON items(due_date) WHERE type = 'task';
CREATE INDEX idx_items_start_time ON items(start_time);
CREATE INDEX idx_items_external_id ON items(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_items_source ON items(source);
CREATE INDEX idx_items_completed ON items(completed) WHERE type = 'task';
CREATE INDEX idx_items_calendar_source ON items(calendar_source_id) WHERE calendar_source_id IS NOT NULL;

-- Dependencies indexes
CREATE INDEX idx_dependencies_predecessor ON dependencies(predecessor_id);
CREATE INDEX idx_dependencies_successor ON dependencies(successor_id);

-- People full-text search
CREATE INDEX idx_people_name ON people USING gin(to_tsvector('english', name));

-- SMS log
CREATE INDEX idx_sms_log_processed_at ON sms_log(processed_at DESC);
