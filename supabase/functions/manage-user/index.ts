import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, userId, newPassword } = await req.json();

    if (!action || !userId) {
      throw new Error('Action and userId are required');
    }

    console.log(`Processing ${action} action for user ${userId}`);

    if (action === 'delete') {
      // Delete user using admin API
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('Error deleting user:', deleteError);
        throw deleteError;
      }

      console.log('User deleted successfully');

      return new Response(
        JSON.stringify({ success: true, message: 'User deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'reset-password') {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }

      // Update user password using admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        console.error('Error resetting password:', updateError);
        throw updateError;
      }

      console.log('Password reset successfully');

      return new Response(
        JSON.stringify({ success: true, message: 'Password reset successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Invalid action. Use "delete" or "reset-password"');
    }
  } catch (error) {
    console.error('Error in manage-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
