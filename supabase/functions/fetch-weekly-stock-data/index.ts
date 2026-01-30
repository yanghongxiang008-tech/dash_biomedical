import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MultiTimeframeStockData {
  symbol: string;
  companyName: string;
  weekStartPrice: number;
  weekEndPrice: number;
  change: number;
  changePercent: number;
  weekStartDate: string;
  weekEndDate: string;
  // Additional timeframes
  monthChange: number | null;        // T-30
  monthChangePercent: number | null;
  ytdChange: number | null;          // YTD
  ytdChangePercent: number | null;
  yearChange: number | null;         // T-365
  yearChangePercent: number | null;
}

serve(async (req) => {
  console.log('Received request for weekly stock data');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols, weekEndDate } = await req.json();
    console.log('Fetching multi-timeframe data for symbols:', symbols, 'week ending:', weekEndDate);

    // Calculate timestamps for different timeframes
    const weekEnd = new Date(weekEndDate + 'T23:59:59Z');
    const endTimestamp = Math.floor(weekEnd.getTime() / 1000);
    
    // Get YTD start (Jan 1 of the current year based on weekEndDate)
    const ytdStart = new Date(weekEnd.getFullYear(), 0, 1);
    const ytdTimestamp = Math.floor(ytdStart.getTime() / 1000);
    
    // Get T-365 start (1 year + buffer before week end)
    const yearStart = new Date(weekEnd);
    yearStart.setFullYear(yearStart.getFullYear() - 1);
    yearStart.setDate(yearStart.getDate() - 14); // Buffer for trading days
    const yearTimestamp = Math.floor(yearStart.getTime() / 1000);
    
    // Use the earliest timestamp for fetching
    const startTimestamp = Math.min(ytdTimestamp, yearTimestamp);

    const stockData: MultiTimeframeStockData[] = [];

    // Process symbols in batches
    const batchSize = 10;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(async (symbol: string) => {
        try {
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

          const companyName = result.meta?.longName || result.meta?.shortName || symbol;
          const quotes = result.indicators?.quote?.[0];
          const timestamps = result.timestamp;
          
          if (!quotes || !timestamps || timestamps.length < 2) {
            console.error(`Insufficient data for ${symbol}`);
            return null;
          }

          // Helper function to find the closest trading day at or before a target timestamp
          const findClosestTradingDay = (targetTs: number, beforeIndex: number = timestamps.length): number => {
            for (let j = Math.min(beforeIndex - 1, timestamps.length - 1); j >= 0; j--) {
              if (timestamps[j] <= targetTs && quotes.close[j] !== null) {
                return j;
              }
            }
            return -1;
          };

          // Find the week end date (target date or closest trading day before)
          const targetTimestamp = Math.floor(new Date(weekEndDate + 'T23:59:59Z').getTime() / 1000);
          const weekEndIndex = findClosestTradingDay(targetTimestamp);

          if (weekEndIndex === -1) {
            console.error(`No valid week end data for ${symbol}`);
            return null;
          }

          const weekEndPrice = quotes.close[weekEndIndex];
          const weekEndTs = timestamps[weekEndIndex];

          // Find week start (7 calendar days before)
          const targetWeekStartTs = weekEndTs - (7 * 24 * 60 * 60);
          let weekStartIndex = findClosestTradingDay(targetWeekStartTs, weekEndIndex);

          // Fallback: 5 trading days before
          if (weekStartIndex === -1 && weekEndIndex >= 5) {
            let validDays = 0;
            for (let j = weekEndIndex - 1; j >= 0 && validDays < 5; j--) {
              if (quotes.close[j] !== null) {
                validDays++;
                if (validDays === 5) {
                  weekStartIndex = j;
                }
              }
            }
          }

          if (weekStartIndex === -1) {
            console.error(`No valid week start data for ${symbol}`);
            return null;
          }

          const weekStartPrice = quotes.close[weekStartIndex];
          const change = weekEndPrice - weekStartPrice;
          const changePercent = (change / weekStartPrice) * 100;

          // Calculate T-30 (month) change
          const targetMonthStartTs = weekEndTs - (30 * 24 * 60 * 60);
          const monthStartIndex = findClosestTradingDay(targetMonthStartTs, weekEndIndex);
          let monthChange: number | null = null;
          let monthChangePercent: number | null = null;
          if (monthStartIndex !== -1 && quotes.close[monthStartIndex] !== null) {
            const monthStartPrice = quotes.close[monthStartIndex];
            monthChange = Number((weekEndPrice - monthStartPrice).toFixed(2));
            monthChangePercent = Number(((weekEndPrice - monthStartPrice) / monthStartPrice * 100).toFixed(2));
          }

          // Calculate YTD change
          const ytdStartTs = Math.floor(new Date(weekEnd.getFullYear(), 0, 1).getTime() / 1000);
          // Find the first trading day of the year (at or after Jan 1)
          let ytdStartIndex = -1;
          for (let j = 0; j < timestamps.length && j < weekEndIndex; j++) {
            if (timestamps[j] >= ytdStartTs && quotes.close[j] !== null) {
              ytdStartIndex = j;
              break;
            }
          }
          let ytdChange: number | null = null;
          let ytdChangePercent: number | null = null;
          if (ytdStartIndex !== -1 && quotes.close[ytdStartIndex] !== null) {
            const ytdStartPrice = quotes.close[ytdStartIndex];
            ytdChange = Number((weekEndPrice - ytdStartPrice).toFixed(2));
            ytdChangePercent = Number(((weekEndPrice - ytdStartPrice) / ytdStartPrice * 100).toFixed(2));
          }

          // Calculate T-365 (year) change
          const targetYearStartTs = weekEndTs - (365 * 24 * 60 * 60);
          const yearStartIndex = findClosestTradingDay(targetYearStartTs, weekEndIndex);
          let yearChange: number | null = null;
          let yearChangePercent: number | null = null;
          if (yearStartIndex !== -1 && quotes.close[yearStartIndex] !== null) {
            const yearStartPrice = quotes.close[yearStartIndex];
            yearChange = Number((weekEndPrice - yearStartPrice).toFixed(2));
            yearChangePercent = Number(((weekEndPrice - yearStartPrice) / yearStartPrice * 100).toFixed(2));
          }

          // Convert timestamps to dates
          const weekStartDateStr = new Date(timestamps[weekStartIndex] * 1000).toISOString().split('T')[0];
          const weekEndDateStr = new Date(timestamps[weekEndIndex] * 1000).toISOString().split('T')[0];

          return {
            symbol,
            companyName,
            weekStartPrice: Number(weekStartPrice.toFixed(2)),
            weekEndPrice: Number(weekEndPrice.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            weekStartDate: weekStartDateStr,
            weekEndDate: weekEndDateStr,
            monthChange,
            monthChangePercent,
            ytdChange,
            ytdChangePercent,
            yearChange,
            yearChangePercent
          };
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      stockData.push(...batchResults.filter(data => data !== null));
      
      // Add delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`Successfully fetched multi-timeframe data for ${stockData.length}/${symbols.length} symbols`);

    return new Response(JSON.stringify({ stockData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-weekly-stock-data function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stockData: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
