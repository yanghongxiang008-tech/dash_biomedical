-- Create industries table for custom industry management
CREATE TABLE public.industries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read industries" 
ON public.industries 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert industries" 
ON public.industries 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update industries" 
ON public.industries 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete industries" 
ON public.industries 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Add industry_id to stock_discussions for industry-level discussions
ALTER TABLE public.stock_discussions 
ADD COLUMN industry_id UUID REFERENCES public.industries(id) ON DELETE CASCADE;

-- Make stock_symbol nullable since we can now have industry-only discussions
ALTER TABLE public.stock_discussions 
ALTER COLUMN stock_symbol DROP NOT NULL;

-- Add check constraint to ensure either stock_symbol or industry_id is provided
ALTER TABLE public.stock_discussions 
ADD CONSTRAINT check_discussion_target 
CHECK (
  (stock_symbol IS NOT NULL AND industry_id IS NULL) OR 
  (stock_symbol IS NULL AND industry_id IS NOT NULL)
);