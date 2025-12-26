import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase.ts';
import { getUserIdFromAuth, validateAdmin } from '../_shared/auth.ts';

interface ApproveUserRequest {
  user_id: string;
  status: 'approved' | 'rejected';
  role?: 'nurse' | 'admin';
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create clients
    const serviceClient = createServiceRoleClient();
    const userClient = createUserClient(authHeader.replace('Bearer ', ''));

    // Get the requesting user's ID
    const requesterId = await getUserIdFromAuth(authHeader, userClient);
    if (!requesterId) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that requester is an admin
    const isAdmin = await validateAdmin(serviceClient, requesterId);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Admin access required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ApproveUserRequest = await req.json();
    const { user_id, status, role } = body;

    // Validate input
    if (!user_id || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status. Must be "approved" or "rejected"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (role && !['nurse', 'admin'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be "nurse" or "admin"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists
    const { data: existingProfile, error: fetchError } = await serviceClient
      .from('profiles')
      .select('id, email, role, status')
      .eq('id', user_id)
      .single();

    if (fetchError || !existingProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (role) {
      updateData.role = role;
    }

    // Update the profile
    const { data: updatedProfile, error: updateError } = await serviceClient
      .from('profiles')
      .update(updateData)
      .eq('id', user_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update user profile', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return updated profile
    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${status} successfully`,
        profile: updatedProfile,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

