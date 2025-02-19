-- Create issues table
CREATE TABLE IF NOT EXISTS issues (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    resolved_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved'))
);

-- Create storage bucket for issue images if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('issue-images', 'issue-images')
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy to allow authenticated uploads
CREATE POLICY "Allow public uploads to issue-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'issue-images');

-- Set up storage policy to allow public reads of issue images
CREATE POLICY "Allow public reads of issue-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'issue-images');
