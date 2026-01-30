-- First, unschedule any existing job with the same name
SELECT cron.unschedule('auto-fetch-daily-stock-data');

-- Schedule daily stock data fetch
-- Runs at 9:00 PM UTC (21:00), Monday-Friday
-- This is approximately 4:30 PM ET (after US market close)
SELECT cron.schedule(
  'auto-fetch-daily-stock-data',
  '0 21 * * 1-5',
  $$
  SELECT
    net.http_post(
        url:='https://cfawoyegqqigthbtoyan.supabase.co/functions/v1/auto-fetch-stock-data',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmY2J0aHFwaWNlcWF2aWF1dG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMjg5MjAsImV4cCI6MjA3NDcwNDkyMH0.LZiISyPRxeDududWcDl-zNttoU4Lf6ZDULULYqdN2Fw"}'::jsonb
    ) as request_id;
  $$
);