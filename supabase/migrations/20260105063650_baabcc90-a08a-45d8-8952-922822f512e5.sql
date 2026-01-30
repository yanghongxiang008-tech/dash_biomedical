-- Add new columns to research_sources
ALTER TABLE public.research_sources 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority integer DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
ADD COLUMN IF NOT EXISTS logo_url text;

-- Create storage bucket for research logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('research-logos', 'research-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for research-logos bucket
CREATE POLICY "Anyone can view research logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'research-logos');

CREATE POLICY "Authenticated users can upload research logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'research-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own research logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'research-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own research logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'research-logos' AND auth.uid() IS NOT NULL);