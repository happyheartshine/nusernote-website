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
    const role = url.searchParams.get('role'); // Optional filter by role
    const status = url.searchParams.get('status'); // Optional filter by status

    // Build query
    let query = serviceClient
      .from('profiles')
      .select('id, email, role, status, name, birthday, gender, address, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters if provided
    if (role && ['admin', 'nurse'].includes(role)) {
      query = query.eq('role', role);
    }

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    // Execute query
    const { data: profiles, error, count } = await query;

    if (error) {
      console.error('Error fetching profiles:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profiles', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return profiles list
    return new Response(
      JSON.stringify({
        success: true,
        profiles: profiles || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          returned: profiles?.length || 0,
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

