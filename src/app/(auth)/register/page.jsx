'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Register from '@/views/pages/Register';

// ==============================|| REGISTER PAGE ||============================== //

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const redirectInitiated = useRef(false);

  useEffect(() => {
    // Prevent redirect loops
    if (loading || redirectInitiated.current) {
      return;
    }

    // If user is already authenticated, redirect to dashboard
    if (user && pathname === '/register') {
      redirectInitiated.current = true;
      router.replace('/dashboard/default');
    } else if (!user) {
      // Reset flag when user is not authenticated
      redirectInitiated.current = false;
    }
  }, [user, loading, pathname, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Only show register page if user is not authenticated
  if (!user) {
    return <Register />;
  }

  // Return null while redirecting authenticated users
  return null;
}
