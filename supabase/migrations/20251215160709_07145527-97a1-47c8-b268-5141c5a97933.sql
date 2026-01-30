-- Add logo_url column to deals table
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS logo_url text;