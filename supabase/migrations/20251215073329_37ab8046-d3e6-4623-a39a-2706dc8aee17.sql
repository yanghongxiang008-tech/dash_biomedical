-- Create table for weekly additional notes (not synced to Notion)
CREATE TABLE public.weekly_additional_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_end_date DATE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on week_end_date to ensure one note per week
CREATE UNIQUE INDEX idx_weekly_additional_notes_week_end_date ON public.weekly_additional_notes(week_end_date);

-- Enable RLS
ALTER TABLE public.weekly_additional_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (same as stock_notes - anyone can CRUD)
CREATE POLICY "Anyone can read weekly additional notes" ON public.weekly_additional_notes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert weekly additional notes" ON public.weekly_additional_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update weekly additional notes" ON public.weekly_additional_notes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete weekly additional notes" ON public.weekly_additional_notes FOR DELETE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_weekly_additional_notes_updated_at
  BEFORE UPDATE ON public.weekly_additional_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();