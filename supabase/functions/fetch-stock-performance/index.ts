import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerformanceData {
  symbol: string;
  currentPrice: number;
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
  ytd: number | null;
  yearly: number | null;
}

serve(async (req) => {
  console.log('Received request for stock performance data');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol } = await req.json();
    
    if (!symbol) {
      return new Response(JSON.stringify({ error: 'Symbol is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching performance data for:', symbol);

    // Calculate timestamps
    const now = new Date();
    const endTimestamp = Math.floor(now.getTime() / 1000);
    
    // Get data from 1 year + buffer ago
    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    yearAgo.setDate(yearAgo.getDate() - 14); // Buffer for trading days
    const startTimestamp = Math.floor(yearAgo.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch data for ${symbol}:`, response.status);
      return new Response(JSON.stringify({ error: 'Failed to fetch stock data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result) {
      return new Response(JSON.stringify({ error: 'No chart data available' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp;
    const currentPrice = result.meta?.regularMarketPrice || quotes?.close?.[quotes.close.length - 1];
    
    if (!quotes || !timestamps || timestamps.length < 2) {
      return new Response(JSON.stringify({ error: 'Insufficient data' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helper function to find the closest trading day
    const findClosestTradingDay = (targetTs: number, beforeIndex: number = timestamps.length): number => {
      for (let j = Math.min(beforeIndex - 1, timestamps.length - 1); j >= 0; j--) {
        if (timestamps[j] <= targetTs && quotes.close[j] !== null) {
          return j;
        }
      }
      return -1;
    };

    // Get latest price and index
    const latestIndex = timestamps.length - 1;
    const latestPrice = quotes.close[latestIndex];
    const latestTs = timestamps[latestIndex];

    // Calculate daily change (previous close)
    let dailyChange: number | null = null;
    if (latestIndex > 0 && quotes.close[latestIndex - 1] !== null) {
      const prevClose = quotes.close[latestIndex - 1];
      dailyChange = Number((((latestPrice - prevClose) / prevClose) * 100).toFixed(2));
    }

    // Calculate weekly change (T-7)
    let weeklyChange: number | null = null;
    const weekAgoTs = latestTs - (7 * 24 * 60 * 60);
    const weekIndex = findClosestTradingDay(weekAgoTs, latestIndex);
    if (weekIndex !== -1 && quotes.close[weekIndex] !== null) {
      const weekPrice = quotes.close[weekIndex];
      weeklyChange = Number((((latestPrice - weekPrice) / weekPrice) * 100).toFixed(2));
    }

    // Calculate monthly change (T-30)
    let monthlyChange: number | null = null;
    const monthAgoTs = latestTs - (30 * 24 * 60 * 60);
    const monthIndex = findClosestTradingDay(monthAgoTs, latestIndex);
    if (monthIndex !== -1 && quotes.close[monthIndex] !== null) {
      const monthPrice = quotes.close[monthIndex];
      monthlyChange = Number((((latestPrice - monthPrice) / monthPrice) * 100).toFixed(2));
    }

    // Calculate YTD change
    let ytdChange: number | null = null;
    const ytdStartTs = Math.floor(new Date(now.getFullYear(), 0, 1).getTime() / 1000);
    // Find first trading day of the year
    let ytdIndex = -1;
    for (let j = 0; j < timestamps.length && j < latestIndex; j++) {
      if (timestamps[j] >= ytdStartTs && quotes.close[j] !== null) {
        ytdIndex = j;
        break;
      }
    }
    if (ytdIndex !== -1 && quotes.close[ytdIndex] !== null) {
      const ytdPrice = quotes.close[ytdIndex];
      ytdChange = Number((((latestPrice - ytdPrice) / ytdPrice) * 100).toFixed(2));
    }

    // Calculate yearly change (T-365)
    let yearlyChange: number | null = null;
    const yearAgoTs = latestTs - (365 * 24 * 60 * 60);
    const yearIndex = findClosestTradingDay(yearAgoTs, latestIndex);
    if (yearIndex !== -1 && quotes.close[yearIndex] !== null) {
      const yearPrice = quotes.close[yearIndex];
      yearlyChange = Number((((latestPrice - yearPrice) / yearPrice) * 100).toFixed(2));
    }

    const performanceData: PerformanceData = {
      symbol,
      currentPrice: Number(currentPrice?.toFixed(2) || latestPrice?.toFixed(2)),
      daily: dailyChange,
      weekly: weeklyChange,
      monthly: monthlyChange,
      ytd: ytdChange,
      yearly: yearlyChange,
    };

    console.log(`Successfully fetched performance for ${symbol}:`, performanceData);

    return new Response(JSON.stringify(performanceData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-stock-performance function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
