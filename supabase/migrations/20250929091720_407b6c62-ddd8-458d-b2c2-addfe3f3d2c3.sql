-- Create table for daily market notes
CREATE TABLE public.daily_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  content TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is market news)
CREATE POLICY "Anyone can read daily notes" 
ON public.daily_notes 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert daily notes" 
ON public.daily_notes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update daily notes" 
ON public.daily_notes 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete daily notes" 
ON public.daily_notes 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_notes_updated_at
BEFORE UPDATE ON public.daily_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();