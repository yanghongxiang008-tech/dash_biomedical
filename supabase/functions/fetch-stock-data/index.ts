import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StockData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
}

serve(async (req) => {
  console.log('Received request for stock data');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols, date } = await req.json();
    console.log('Fetching data for symbols:', symbols, 'date:', date);

    const stockData: StockData[] = [];

    // Process symbols in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(async (symbol: string) => {
        try {
        // Convert date to epoch timestamp for Yahoo Finance API
        // Set target date to end of day to ensure we capture the selected date's data
        const targetDate = new Date(date + 'T23:59:59Z');
        const endTimestamp = Math.floor(targetDate.getTime() / 1000);
        // Get data for a wider range to ensure we have the target date
        const startTimestamp = endTimestamp - (30 * 24 * 60 * 60); // 30 days before
          
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`;
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (!response.ok) {
            console.error(`Failed to fetch data for ${symbol}:`, response.status);
            return null;
          }

          const data = await response.json();
          const result = data.chart?.result?.[0];
          
          if (!result) {
            console.error(`No chart data for ${symbol}`);
            return null;
          }

          // Extract company name from meta data
          const companyName = result.meta?.longName || result.meta?.shortName || symbol;

          const quotes = result.indicators?.quote?.[0];
          const timestamps = result.timestamp;
          
          if (!quotes || !timestamps || timestamps.length < 2) {
            console.error(`Insufficient data for ${symbol}`);
            return null;
          }

          // Find the target date in the timestamps
          const targetDateStr = date;
          const targetTimestamp = Math.floor(new Date(targetDateStr + 'T23:59:59Z').getTime() / 1000);
          
          // Find the closest trading day to or before the target date
          let targetIndex = -1;
          let previousIndex = -1;
          
          for (let j = timestamps.length - 1; j >= 0; j--) {
            if (timestamps[j] <= targetTimestamp) {
              if (targetIndex === -1) {
                targetIndex = j;
              } else if (previousIndex === -1) {
                previousIndex = j;
                break;
              }
            }
          }
          
          if (targetIndex === -1 || previousIndex === -1) {
            console.error(`No valid trading data found for ${symbol} around ${targetDateStr}`);
            return null;
          }

          const currentPrice = quotes.close[targetIndex];
          const previousClose = quotes.close[previousIndex];
          
          if (currentPrice === null || previousClose === null) {
            console.error(`Invalid price data for ${symbol}`);
            return null;
          }

          const change = currentPrice - previousClose;
          const changePercent = (change / previousClose) * 100;

          return {
            symbol,
            companyName,
            currentPrice: Number(currentPrice.toFixed(2)),
            previousClose: Number(previousClose.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2))
          };
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      stockData.push(...batchResults.filter(data => data !== null));
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`Successfully fetched data for ${stockData.length}/${symbols.length} symbols`);

    return new Response(JSON.stringify({ stockData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-stock-data function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stockData: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});