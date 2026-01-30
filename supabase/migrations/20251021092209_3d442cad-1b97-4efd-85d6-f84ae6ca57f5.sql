-- Create table for stock discussions
CREATE TABLE public.stock_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_symbol TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.stock_discussions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_discussions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read discussions"
ON public.stock_discussions
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create discussions"
ON public.stock_discussions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own discussions"
ON public.stock_discussions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own discussions"
ON public.stock_discussions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_stock_discussions_symbol ON public.stock_discussions(stock_symbol);
CREATE INDEX idx_stock_discussions_parent ON public.stock_discussions(parent_id);
CREATE INDEX idx_stock_discussions_user ON public.stock_discussions(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_stock_discussions_updated_at
BEFORE UPDATE ON public.stock_discussions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();