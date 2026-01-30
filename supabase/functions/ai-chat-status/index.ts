import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    
    // Check if user has their own Notion key
    let userHasNotion = false;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const token = authHeader.replace('Bearer ', '');
      
      // Use service role to check profile directly, extracting user ID from token
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Decode JWT to get user ID (simple base64 decode of payload)
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const userId = payload.sub;
          
          if (userId) {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('notion_api_key')
              .eq('id', userId)
              .single();
            
            userHasNotion = !!profile?.notion_api_key;
            console.log('[Status] User ID:', userId, 'Has Notion key:', userHasNotion);
          }
        }
      } catch (e) {
        console.error('[Status] Token decode error:', e);
      }
    }

    return new Response(
      JSON.stringify({
        hasNotion: userHasNotion,
        hasWeb: !!PERPLEXITY_API_KEY,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Status check error:", error);
    return new Response(
      JSON.stringify({ hasNotion: false, hasWeb: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
