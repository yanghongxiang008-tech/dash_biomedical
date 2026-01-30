-- Create deals table for VC Deal Flow Tracker
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  hq_location TEXT,
  sector TEXT,
  funding_round TEXT,
  funding_amount TEXT,
  valuation_terms TEXT,
  source TEXT,
  bu_category TEXT,
  description TEXT,
  benchmark_companies TEXT,
  followers TEXT,
  status TEXT DEFAULT 'Follow',
  feedback_notes TEXT,
  financials TEXT,
  deal_date DATE,
  leads TEXT,
  folder_link TEXT,
  key_contacts TEXT,
  pre_investors TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can read deals"
ON public.deals
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert deals"
ON public.deals
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update deals"
ON public.deals
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete deals"
ON public.deals
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_deals_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_deals_status ON public.deals(status);
CREATE INDEX idx_deals_sector ON public.deals(sector);
CREATE INDEX idx_deals_funding_round ON public.deals(funding_round);
CREATE INDEX idx_deals_deal_date ON public.deals(deal_date DESC);