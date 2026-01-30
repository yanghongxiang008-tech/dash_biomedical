-- Create table for storing analysis results
CREATE TABLE public.deal_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  analysis_type text NOT NULL, -- 'interview_outline', 'investment_highlights', 'ic_memo', 'industry_mapping', 'notes_summary'
  title text NOT NULL,
  input_data jsonb, -- Store user inputs (interviewee info, section type, etc.)
  result_content text NOT NULL, -- Markdown result from AI
  notion_connected boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can read deal analyses"
ON public.deal_analyses
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert deal analyses"
ON public.deal_analyses
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update deal analyses"
ON public.deal_analyses
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete deal analyses"
ON public.deal_analyses
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_deal_analyses_updated_at
BEFORE UPDATE ON public.deal_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();