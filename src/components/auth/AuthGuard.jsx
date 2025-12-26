'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthProfile } from '@/hooks/useAuthProfile';

export default function AuthGuard({ children }) {
  const { session, profile, loading } = useAuthProfile();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!session) {
        router.push('/login');
      } else if (profile && profile.status !== 'approved') {
        router.push('/pending-approval');
      }
    }
  }, [session, profile, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!session || (profile && profile.status !== 'approved')) {
    return null;
  }

  return <>{children}</>;
}
