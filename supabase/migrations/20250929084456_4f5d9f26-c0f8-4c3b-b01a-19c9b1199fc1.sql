-- Deduplicate stock_notes by (symbol, date), keep latest
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY symbol, date
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM public.stock_notes
)
DELETE FROM public.stock_notes sn
USING ranked r
WHERE sn.id = r.id
  AND r.rn > 1;

-- Deduplicate stock_explanations by (symbol, date), keep latest
WITH ranked_exp AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY symbol, date
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM public.stock_explanations
)
DELETE FROM public.stock_explanations se
USING ranked_exp re
WHERE se.id = re.id
  AND re.rn > 1;

-- Create unique indexes to ensure one row per (symbol, date)
CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_notes_symbol_date
  ON public.stock_notes(symbol, date);

CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_explanations_symbol_date
  ON public.stock_explanations(symbol, date);

-- Ensure updated_at auto-updates on UPDATE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_stock_notes_updated_at'
  ) THEN
    CREATE TRIGGER update_stock_notes_updated_at
    BEFORE UPDATE ON public.stock_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_stock_explanations_updated_at'
  ) THEN
    CREATE TRIGGER update_stock_explanations_updated_at
    BEFORE UPDATE ON public.stock_explanations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;