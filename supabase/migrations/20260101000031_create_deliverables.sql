-- Deliverables: documents, briefs, proposals, etc. attached to an engagement.
-- Not every action produces a deliverable, but some do. This builds the
-- institutional record so "what have you done for us" is a filtered list.
CREATE TABLE IF NOT EXISTS deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  engagement_id uuid REFERENCES engagements(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  delivered_on date,
  file_path text,              -- path inside the 'deliverables' storage bucket
  external_url text,           -- alternative: link to an external doc (Google Docs, etc.)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_deliverables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deliverables_updated_at
  BEFORE UPDATE ON deliverables
  FOR EACH ROW
  EXECUTE FUNCTION update_deliverables_updated_at();

-- Indexes
CREATE INDEX idx_deliverables_user_id ON deliverables(user_id);
CREATE INDEX idx_deliverables_engagement_id ON deliverables(engagement_id);

-- Enable RLS
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own deliverables"
  ON deliverables FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket for deliverable files
INSERT INTO storage.buckets (id, name, public)
VALUES ('deliverables', 'deliverables', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload deliverables"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'deliverables'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can view deliverables"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'deliverables'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can delete deliverables"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'deliverables'
    AND auth.uid() IS NOT NULL
  );
