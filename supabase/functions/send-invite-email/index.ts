import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
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

    const { email, role } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    if (!role || (role !== 'user' && role !== 'admin')) {
      throw new Error('Valid role is required (user or admin)');
    }

    console.log(`Sending invite to ${email} with role ${role}`);

    // Get the current site URL
    const siteUrl = 'https://e09186cc-9639-4944-bf68-01378b4ceb87.lovableproject.com';

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Send invitation email
    const { error: emailError } = await resend.emails.send({
      from: 'biomedical <onboarding@resend.dev>',
      to: [email],
      subject: 'You\'re invited to biomedical',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to biomedical!</h1>
          <p>You've been invited to join biomedical.</p>
          <p>To complete your registration, you'll need an invite code.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px; color: #333; font-weight: 500;">
              Please contact via WeChat: <strong>Tzzzz0110</strong> to get your invite code.
            </p>
          </div>
          <p>
            <a href="${siteUrl}/auth" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Go to Registration Page
            </a>
          </p>
          <p style="margin-top: 30px; font-size: 12px; color: #999;">
            If you did not expect this invitation, please ignore this email.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log('Invitation email sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Invitation sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-invite-email function:', error);
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
