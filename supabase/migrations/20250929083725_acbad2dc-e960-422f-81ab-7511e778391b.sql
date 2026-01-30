-- Create table to store AI explanations
CREATE TABLE public.stock_explanations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  change_percent DECIMAL(8,4) NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(symbol, date)
);

-- Enable RLS
ALTER TABLE public.stock_explanations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (matching other tables)
CREATE POLICY "Anyone can read stock explanations" 
ON public.stock_explanations 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert stock explanations" 
ON public.stock_explanations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update stock explanations" 
ON public.stock_explanations 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete stock explanations" 
ON public.stock_explanations 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_stock_explanations_updated_at
BEFORE UPDATE ON public.stock_explanations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster queries
CREATE INDEX idx_stock_explanations_symbol_date ON public.stock_explanations(symbol, date);
CREATE INDEX idx_stock_explanations_date ON public.stock_explanations(date);