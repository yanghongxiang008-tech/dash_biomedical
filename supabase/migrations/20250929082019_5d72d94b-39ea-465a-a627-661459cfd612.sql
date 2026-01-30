-- Create table to cache stock price data
CREATE TABLE public.stock_price_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  current_price DECIMAL(10,2) NOT NULL,
  previous_close DECIMAL(10,2) NOT NULL,
  change_amount DECIMAL(10,2) NOT NULL,
  change_percent DECIMAL(8,4) NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(symbol, date)
);

-- Enable RLS
ALTER TABLE public.stock_price_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (matching other tables)
CREATE POLICY "Anyone can read stock price cache" 
ON public.stock_price_cache 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert stock price cache" 
ON public.stock_price_cache 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update stock price cache" 
ON public.stock_price_cache 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete stock price cache" 
ON public.stock_price_cache 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_stock_price_cache_updated_at
BEFORE UPDATE ON public.stock_price_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster queries
CREATE INDEX idx_stock_price_cache_symbol_date ON public.stock_price_cache(symbol, date);
CREATE INDEX idx_stock_price_cache_date ON public.stock_price_cache(date);
CREATE INDEX idx_stock_price_cache_symbol ON public.stock_price_cache(symbol);