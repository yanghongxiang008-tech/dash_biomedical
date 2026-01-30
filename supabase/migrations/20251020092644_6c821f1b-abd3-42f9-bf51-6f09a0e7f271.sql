-- Add index_symbol column to stock_groups table
ALTER TABLE public.stock_groups 
ADD COLUMN index_symbol TEXT;

-- Add comment
COMMENT ON COLUMN public.stock_groups.index_symbol IS 'Optional stock symbol to use as group index for performance calculation. If null, uses average of all stocks in group.';