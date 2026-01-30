import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey } = await req.json();
    
    // Support both old 'secret_' and new 'ntn_' format
    if (!apiKey || (!apiKey.startsWith('secret_') && !apiKey.startsWith('ntn_'))) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid API key format. Must start with 'secret_' or 'ntn_'" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log('[test-notion] Testing Notion connection...');
    
    const response = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('[test-notion] Connection successful');
      return new Response(
        JSON.stringify({ success: true, user: data.name || data.bot?.owner?.user?.name || 'Connected' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errorText = await response.text();
      console.log('[test-notion] Connection failed:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `API error: ${response.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
  } catch (error: unknown) {
    console.error('[test-notion] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
