-- Add company_name column to stock_price_cache table
ALTER TABLE public.stock_price_cache 
ADD COLUMN IF NOT EXISTS company_name TEXT;