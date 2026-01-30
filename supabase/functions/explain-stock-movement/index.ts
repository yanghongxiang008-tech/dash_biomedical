import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Received request for stock movement explanation');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, changePercent, date } = await req.json();
    console.log(`Explaining movement for ${symbol}: ${changePercent}% on ${date}`);

    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not found');
    }

    // Get company name from database
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: stockData } = await supabase
      .from('stock_price_cache')
      .select('company_name')
      .eq('symbol', symbol)
      .eq('date', date)
      .single();

    const companyName = stockData?.company_name || symbol;
    console.log(`Company name: ${companyName}`);

    // Calculate date range (day before and day after)
    const targetDate = new Date(date);
    const dayBefore = new Date(targetDate);
    dayBefore.setDate(targetDate.getDate() - 1);
    const dayAfter = new Date(targetDate);
    dayAfter.setDate(targetDate.getDate() + 1);
    
    // Format date as MM/DD/YYYY for Perplexity API
    const formatDate = (d: Date) => {
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      return `${month}/${day}/${year}`;
    };

    const direction = changePercent > 0 ? 'rise' : 'fall';
    const prompt = `Why did ${companyName} (${symbol}) stock ${direction} by ${Math.abs(changePercent).toFixed(2)}% on ${date}? Focus on: direct news events, earnings reports, or analyst rating changes. If no specific relevant news found, clearly state "No relevant news found".`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a hedge fund equity analyst. Provide brief, precise explanations for stock movements based ONLY on direct relevant news,assuming reporting to the portfolio manager. Maximum 50 words. If no specific relevant information exists, state "No relevant news found".'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 100,
        return_images: false,
        return_related_questions: false,
        search_after_date_filter: formatDate(dayBefore),
        search_before_date_filter: formatDate(dayAfter),
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content || 'No explanation available';

    console.log(`Generated explanation for ${symbol}: ${explanation.substring(0, 100)}...`);

    return new Response(JSON.stringify({ explanation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in explain-stock-movement function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      explanation: 'Unable to generate explanation at this time.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});