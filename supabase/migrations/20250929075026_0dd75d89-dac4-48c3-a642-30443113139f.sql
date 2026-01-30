-- Create stock groups table
CREATE TABLE public.stock_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stocks table
CREATE TABLE public.stocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  group_id UUID NOT NULL REFERENCES public.stock_groups(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(symbol, group_id)
);

-- Enable RLS
ALTER TABLE public.stock_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

-- Create policies (public read access for this financial data app)
CREATE POLICY "Anyone can read stock groups" ON public.stock_groups FOR SELECT USING (true);
CREATE POLICY "Anyone can read stocks" ON public.stocks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert stock groups" ON public.stock_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert stocks" ON public.stocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update stock groups" ON public.stock_groups FOR UPDATE USING (true);
CREATE POLICY "Anyone can update stocks" ON public.stocks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete stock groups" ON public.stock_groups FOR DELETE USING (true);
CREATE POLICY "Anyone can delete stocks" ON public.stocks FOR DELETE USING (true);

-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_stock_groups_updated_at
  BEFORE UPDATE ON public.stock_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stocks_updated_at
  BEFORE UPDATE ON public.stocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial stock groups
INSERT INTO public.stock_groups (name, display_order) VALUES
  ('Software', 1),
  ('Semi', 2),
  ('MAG7', 3),
  ('Other software + Internet', 4),
  ('Data Center', 5),
  ('Power', 6),
  ('Miner/Neocloud', 7),
  ('Energy', 8),
  ('Fin/fintech', 9);

-- Insert initial stocks
WITH group_data AS (
  SELECT id, name FROM public.stock_groups
)
INSERT INTO public.stocks (symbol, group_id, display_order)
SELECT symbol, group_id, row_number() OVER (PARTITION BY group_id ORDER BY symbol) as display_order
FROM (
  SELECT 'SNAP' as symbol, (SELECT id FROM group_data WHERE name = 'Software') as group_id
  UNION ALL SELECT 'SNPS', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'GTLB', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'EA', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'WDAY', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'CFLT', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'PTC', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'ADSK', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'ADBE', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'MNDY', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'PATH', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'CDNS', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'KVYO', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'ESTC', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'HUBS', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'CRM', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'INTU', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'NOW', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'FICO', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'MSTR', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'DT', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'AUR', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'TWLO', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'TTWO', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'DDOG', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'IGV', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'MSFT', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'ZS', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'IOT', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'NTNX', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'PANW', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'PLTR', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'FTNT', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'CRWD', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'ORCL', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'RBRK', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'APP', (SELECT id FROM group_data WHERE name = 'Software')
  UNION ALL SELECT 'U', (SELECT id FROM group_data WHERE name = 'Software')
  -- Semi stocks
  UNION ALL SELECT 'ON', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'MCHP', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'SWKS', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'LSCC', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'ENTG', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'TXN', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'INTC', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'NXPI', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'QRVO', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'CRUS', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'QCOM', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'MPWR', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'GFS', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'TER', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'SOXX', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'AMD', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'MRVL', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'TSM', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'ASML', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'AMKR', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'ADI', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'NVDA', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'MTSI', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'AMAT', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'ONTO', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'COHR', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'AVGO', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'ARM', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'MU', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'LRCX', (SELECT id FROM group_data WHERE name = 'Semi')
  UNION ALL SELECT 'KLAC', (SELECT id FROM group_data WHERE name = 'Semi')
  -- MAG7 stocks
  UNION ALL SELECT 'GOOGL', (SELECT id FROM group_data WHERE name = 'MAG7')
  UNION ALL SELECT 'AMZN', (SELECT id FROM group_data WHERE name = 'MAG7')
  UNION ALL SELECT 'META', (SELECT id FROM group_data WHERE name = 'MAG7')
  UNION ALL SELECT 'MAGS', (SELECT id FROM group_data WHERE name = 'MAG7')
  UNION ALL SELECT 'AAPL', (SELECT id FROM group_data WHERE name = 'MAG7')
  UNION ALL SELECT 'MSFT', (SELECT id FROM group_data WHERE name = 'MAG7')
  UNION ALL SELECT 'TSLA', (SELECT id FROM group_data WHERE name = 'MAG7')
  UNION ALL SELECT 'NVDA', (SELECT id FROM group_data WHERE name = 'MAG7')
  -- Other software + Internet
  UNION ALL SELECT 'OKTA', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'RDDT', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'NET', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'SNOW', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'SPOT', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'RBLX', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'TRIP', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'UBER', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'COMP', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'TTD', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'PINS', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'FIG', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'MDB', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'DUOL', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'NFLX', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  UNION ALL SELECT 'WIX', (SELECT id FROM group_data WHERE name = 'Other software + Internet')
  -- Data Center
  UNION ALL SELECT 'ALAB', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'CRDO', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'ANET', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'CLS', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'CSCO', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'DELL', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'FN', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'INOD', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'SITM', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'VRT', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'AEHR', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'SMCI', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'LITE', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'TSEM', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'HPE', (SELECT id FROM group_data WHERE name = 'Data Center')
  UNION ALL SELECT 'CIEN', (SELECT id FROM group_data WHERE name = 'Data Center')
  -- Power
  UNION ALL SELECT 'CEG', (SELECT id FROM group_data WHERE name = 'Power')
  UNION ALL SELECT 'GEV', (SELECT id FROM group_data WHERE name = 'Power')
  UNION ALL SELECT 'MTZ', (SELECT id FROM group_data WHERE name = 'Power')
  UNION ALL SELECT 'BE', (SELECT id FROM group_data WHERE name = 'Power')
  UNION ALL SELECT 'OKLO', (SELECT id FROM group_data WHERE name = 'Power')
  UNION ALL SELECT 'SMR', (SELECT id FROM group_data WHERE name = 'Power')
  UNION ALL SELECT 'BWXT', (SELECT id FROM group_data WHERE name = 'Power')
  UNION ALL SELECT 'LEU', (SELECT id FROM group_data WHERE name = 'Power')
  UNION ALL SELECT 'LTBR', (SELECT id FROM group_data WHERE name = 'Power')
  UNION ALL SELECT 'ICLN', (SELECT id FROM group_data WHERE name = 'Power')
  -- Miner/Neocloud
  UNION ALL SELECT 'BTC', (SELECT id FROM group_data WHERE name = 'Miner/Neocloud')
  UNION ALL SELECT 'NBIS', (SELECT id FROM group_data WHERE name = 'Miner/Neocloud')
  UNION ALL SELECT 'CRWV', (SELECT id FROM group_data WHERE name = 'Miner/Neocloud')
  UNION ALL SELECT 'IREN', (SELECT id FROM group_data WHERE name = 'Miner/Neocloud')
  UNION ALL SELECT 'CIFR', (SELECT id FROM group_data WHERE name = 'Miner/Neocloud')
  UNION ALL SELECT 'HUT', (SELECT id FROM group_data WHERE name = 'Miner/Neocloud')
  UNION ALL SELECT 'CORZ', (SELECT id FROM group_data WHERE name = 'Miner/Neocloud')
  UNION ALL SELECT 'APLD', (SELECT id FROM group_data WHERE name = 'Miner/Neocloud')
  UNION ALL SELECT 'WULF', (SELECT id FROM group_data WHERE name = 'Miner/Neocloud')
  UNION ALL SELECT 'CLSK', (SELECT id FROM group_data WHERE name = 'Miner/Neocloud')
  UNION ALL SELECT 'MARA', (SELECT id FROM group_data WHERE name = 'Miner/Neocloud')
  -- Energy
  UNION ALL SELECT 'SEI', (SELECT id FROM group_data WHERE name = 'Energy')
  UNION ALL SELECT 'XLE', (SELECT id FROM group_data WHERE name = 'Energy')
  UNION ALL SELECT 'OIH', (SELECT id FROM group_data WHERE name = 'Energy')
  UNION ALL SELECT 'XOP', (SELECT id FROM group_data WHERE name = 'Energy')
  -- Fin/fintech
  UNION ALL SELECT 'CHYM', (SELECT id FROM group_data WHERE name = 'Fin/fintech')
  UNION ALL SELECT 'CRCL', (SELECT id FROM group_data WHERE name = 'Fin/fintech')
  UNION ALL SELECT 'KKR', (SELECT id FROM group_data WHERE name = 'Fin/fintech')
  UNION ALL SELECT 'HOOD', (SELECT id FROM group_data WHERE name = 'Fin/fintech')
  UNION ALL SELECT 'LMND', (SELECT id FROM group_data WHERE name = 'Fin/fintech')
  UNION ALL SELECT 'ROOT', (SELECT id FROM group_data WHERE name = 'Fin/fintech')
  UNION ALL SELECT 'COIN', (SELECT id FROM group_data WHERE name = 'Fin/fintech')
  UNION ALL SELECT 'XYZ', (SELECT id FROM group_data WHERE name = 'Fin/fintech')
  UNION ALL SELECT 'UPST', (SELECT id FROM group_data WHERE name = 'Fin/fintech')
) stock_inserts;