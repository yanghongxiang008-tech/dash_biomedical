-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  role TEXT,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('investor', 'fa', 'portco', 'expert')),
  email TEXT,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interactions table
CREATE TABLE public.interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  interaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for contacts (authenticated users only)
CREATE POLICY "Authenticated users can read contacts" 
ON public.contacts FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert contacts" 
ON public.contacts FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update contacts" 
ON public.contacts FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete contacts" 
ON public.contacts FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- RLS policies for interactions
CREATE POLICY "Authenticated users can read interactions" 
ON public.interactions FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert interactions" 
ON public.interactions FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update interactions" 
ON public.interactions FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete interactions" 
ON public.interactions FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interactions_updated_at
BEFORE UPDATE ON public.interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for better query performance
CREATE INDEX idx_contacts_type ON public.contacts(contact_type);
CREATE INDEX idx_contacts_company ON public.contacts(company);
CREATE INDEX idx_contacts_tags ON public.contacts USING GIN(tags);
CREATE INDEX idx_interactions_contact_id ON public.interactions(contact_id);
CREATE INDEX idx_interactions_deal_id ON public.interactions(deal_id);
CREATE INDEX idx_interactions_date ON public.interactions(interaction_date);