-- Create table for saving stock notes by date
CREATE TABLE public.stock_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(symbol, date)
);

-- Enable RLS
ALTER TABLE public.stock_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (matching other tables)
CREATE POLICY "Anyone can read stock notes" 
ON public.stock_notes 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert stock notes" 
ON public.stock_notes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update stock notes" 
ON public.stock_notes 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete stock notes" 
ON public.stock_notes 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_stock_notes_updated_at
BEFORE UPDATE ON public.stock_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_stock_notes_symbol_date ON public.stock_notes(symbol, date);