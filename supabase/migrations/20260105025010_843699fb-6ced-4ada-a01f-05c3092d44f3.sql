-- Create research_sources table to store information sources
CREATE TABLE public.research_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  feed_url TEXT, -- RSS/Atom feed URL (null for crawl/manual types)
  category TEXT NOT NULL DEFAULT 'news', -- news, research, podcast, report
  favicon_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'rss', -- rss, crawl, manual
  description TEXT,
  last_checked_at TIMESTAMPTZ,
  last_content_hash TEXT, -- For detecting changes in crawled content
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create research_items table to store articles/updates
CREATE TABLE public.research_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.research_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  summary TEXT,
  content TEXT, -- Full content for display/comparison
  published_at TIMESTAMPTZ,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for research_sources (user-specific)
CREATE POLICY "Users can view own sources" 
ON public.research_sources 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sources" 
ON public.research_sources 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sources" 
ON public.research_sources 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sources" 
ON public.research_sources 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for research_items (via source ownership)
CREATE POLICY "Users can view items from own sources" 
ON public.research_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.research_sources 
  WHERE research_sources.id = research_items.source_id 
  AND research_sources.user_id = auth.uid()
));

CREATE POLICY "Users can insert items to own sources" 
ON public.research_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.research_sources 
  WHERE research_sources.id = research_items.source_id 
  AND research_sources.user_id = auth.uid()
));

CREATE POLICY "Users can update items from own sources" 
ON public.research_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.research_sources 
  WHERE research_sources.id = research_items.source_id 
  AND research_sources.user_id = auth.uid()
));

CREATE POLICY "Users can delete items from own sources" 
ON public.research_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.research_sources 
  WHERE research_sources.id = research_items.source_id 
  AND research_sources.user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_research_sources_user_id ON public.research_sources(user_id);
CREATE INDEX idx_research_sources_category ON public.research_sources(category);
CREATE INDEX idx_research_items_source_id ON public.research_items(source_id);
CREATE INDEX idx_research_items_is_read ON public.research_items(is_read);
CREATE INDEX idx_research_items_published_at ON public.research_items(published_at DESC);

-- Add updated_at triggers
CREATE TRIGGER update_research_sources_updated_at
BEFORE UPDATE ON public.research_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_research_items_updated_at
BEFORE UPDATE ON public.research_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();