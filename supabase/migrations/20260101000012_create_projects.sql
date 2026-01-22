-- Create projects table for grouping related tasks
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  description text,
  color text DEFAULT '#6366f1', -- Default indigo
  target_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for querying user's projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status) WHERE status = 'active';

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own projects
CREATE POLICY "Users can manage own projects"
ON projects
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add project_id to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for querying items by project
CREATE INDEX IF NOT EXISTS idx_items_project_id ON items(project_id) WHERE project_id IS NOT NULL;
