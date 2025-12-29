'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthProfile } from '@/hooks/useAuthProfile';

export default function AdminGuard({ children }) {
  const { session, profile, loading } = useAuthProfile();
  const router = useRouter();
  const pathname = usePathname();
  const redirectInitiated = useRef(false);

  useEffect(() => {
    // Prevent redirect loops
    if (loading || redirectInitiated.current) {
      return;
    }

    if (!session) {
      // Only redirect if not already on login page
      if (pathname !== '/login' && !pathname.startsWith('/auth/callback')) {
        redirectInitiated.current = true;
        router.replace('/login');
      }
    } else if (!profile || profile.status !== 'approved' || profile.role !== 'admin') {
      // Only redirect if not already on dashboard
      if (pathname !== '/dashboard/default' && !pathname.startsWith('/admin')) {
        redirectInitiated.current = true;
        router.replace('/dashboard/default');
      }
    } else {
      // Reset flag when conditions are met (user is admin)
      redirectInitiated.current = false;
    }
  }, [session, profile, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!session || !profile || profile.status !== 'approved' || profile.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}
