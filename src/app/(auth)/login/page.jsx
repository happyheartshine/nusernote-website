'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Login from '@/views/pages/Login';

// ==============================|| LOGIN PAGE ||============================== //

export default function LoginPage() {
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
    if (user && pathname !== '/dashboard/default') {
      redirectInitiated.current = true;
      router.push('/dashboard/default');
    }
  }, [user, loading, pathname]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Only show login page if user is not authenticated
  if (!user) {
    return <Login />;
  }

  // Return null while redirecting authenticated users
  return null;
}
