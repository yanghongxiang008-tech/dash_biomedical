-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests from cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create a function to trigger the auto-fetch edge function
-- This will be called by the cron job
-- US stock market closes at 4:00 PM ET, so we fetch at 4:30 PM ET
-- 4:30 PM ET = 8:30 PM UTC (during daylight saving) or 9:30 PM UTC (standard time)
-- We'll use 9:00 PM UTC (21:00) to cover both scenarios
-- Only run on weekdays (Monday-Friday) when markets are open

SELECT cron.schedule(
  'auto-fetch-daily-stock-data',
  '0 21 * * 1-5', -- Run at 9:00 PM UTC, Monday through Friday
  $$
  SELECT
    net.http_post(
        url:='https://cfawoyegqqigthbtoyan.supabase.co/functions/v1/auto-fetch-stock-data',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_VnLhxTTXbFmWyYNhPf0Ceg_ONZBKr-y"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);