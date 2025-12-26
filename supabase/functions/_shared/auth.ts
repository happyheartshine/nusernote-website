/**
 * Validates that a user is an admin with approved status
 * @param supabase - Supabase service role client
 * @param userId - User ID to check
 * @returns true if user is an approved admin, false otherwise
 */
export async function validateAdmin(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.role === 'admin' && data.status === 'approved';
  } catch (error) {
    console.error('Error validating admin:', error);
    return false;
  }
}

/**
 * Gets the user ID from the Authorization header JWT token
 * @param authHeader - Authorization header value
 * @param supabase - Supabase client (with user token)
 * @returns User ID or null if invalid
 */
export async function getUserIdFromAuth(authHeader: string | null, supabase: any): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error getting user from auth:', error);
    return null;
  }
}

