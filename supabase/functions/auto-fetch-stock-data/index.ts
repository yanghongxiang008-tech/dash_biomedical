import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Auto-fetch stock data job started');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the previous trading day (similar logic to frontend)
    const getPreviousTradingDay = () => {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      
      let daysBack = 1;
      
      if (dayOfWeek === 0) {
        // Sunday -> Friday (2 days back)
        daysBack = 2;
      } else if (dayOfWeek === 1) {
        // Monday -> Friday (3 days back)  
        daysBack = 3;
      } else if (dayOfWeek === 6) {
        // Saturday -> Friday (1 day back)
        daysBack = 1;
      } else {
        // Tuesday-Friday -> previous day (1 day back)
        daysBack = 1;
      }
      
      const previousTradingDay = new Date(today);
      previousTradingDay.setDate(today.getDate() - daysBack);
      
      return previousTradingDay;
    };

    const targetDate = getPreviousTradingDay();
    const dateStr = targetDate.toISOString().split('T')[0];
    
    console.log(`Fetching data for date: ${dateStr}`);

    // Fetch all stock symbols from the database
    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select('symbol')
      .order('symbol');

    if (stocksError) {
      console.error('Error fetching stocks:', stocksError);
      throw stocksError;
    }

    if (!stocks || stocks.length === 0) {
      console.log('No stocks found in database');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No stocks to fetch',
        date: dateStr 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const symbols = stocks.map(s => s.symbol);
    console.log(`Found ${symbols.length} stocks to fetch data for`);

    // Check if we already have cached data for this date
    const { data: cachedData } = await supabase
      .from('stock_price_cache')
      .select('symbol')
      .eq('date', dateStr);

    const cachedSymbols = new Set(cachedData?.map(item => item.symbol) || []);
    const uncachedSymbols = symbols.filter(symbol => !cachedSymbols.has(symbol));

    if (uncachedSymbols.length === 0) {
      console.log(`All data already cached for ${dateStr}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'All data already cached',
        date: dateStr,
        totalStocks: symbols.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Fetching data for ${uncachedSymbols.length} uncached symbols`);

    // Call the fetch-stock-data edge function
    const { data: fetchResult, error: fetchError } = await supabase.functions.invoke(
      'fetch-stock-data',
      {
        body: { 
          symbols: uncachedSymbols, 
          date: dateStr 
        }
      }
    );

    if (fetchError) {
      console.error('Error calling fetch-stock-data:', fetchError);
      throw fetchError;
    }

    const stockData = fetchResult?.stockData || [];
    console.log(`Successfully fetched data for ${stockData.length}/${uncachedSymbols.length} symbols`);

    // Cache the fetched data
    if (stockData.length > 0) {
      const cacheEntries = stockData.map((stock: any) => ({
        symbol: stock.symbol,
        date: dateStr,
        current_price: stock.currentPrice,
        previous_close: stock.previousClose,
        change_amount: stock.change,
        change_percent: stock.changePercent,
        company_name: stock.companyName
      }));

      const { error: cacheError } = await supabase
        .from('stock_price_cache')
        .upsert(cacheEntries, { 
          onConflict: 'symbol,date',
          ignoreDuplicates: false 
        });

      if (cacheError) {
        console.error('Error caching stock data:', cacheError);
        // Don't throw - data was fetched successfully even if caching failed
      } else {
        console.log(`Successfully cached ${cacheEntries.length} stock entries`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Auto-fetch completed',
      date: dateStr,
      totalStocks: symbols.length,
      newlyFetched: stockData.length,
      alreadyCached: cachedSymbols.size
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-fetch-stock-data function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
