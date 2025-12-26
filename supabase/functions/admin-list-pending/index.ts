import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase.ts';
import { getUserIdFromAuth, validateAdmin } from '../_shared/auth.ts';

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

    // Parse query parameters for pagination
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Query for pending users only
    const { data: pendingProfiles, error, count } = await serviceClient
      .from('profiles')
      .select('id, email, role, status, name, birthday, gender, address, created_at, updated_at', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: true }) // Oldest first for FIFO processing
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching pending profiles:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending users', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return pending profiles list
    return new Response(
      JSON.stringify({
        success: true,
        pending_users: pendingProfiles || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          returned: pendingProfiles?.length || 0,
        },
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

