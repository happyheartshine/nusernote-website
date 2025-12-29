'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  const router = useRouter();
  const pathname = usePathname();
  const redirectInitiated = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Only run on callback page
      if (pathname !== '/auth/callback') {
        return;
      }

      // Prevent multiple redirects
      if (redirectInitiated.current) {
        return;
      }

      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!session) {
          redirectInitiated.current = true;
          router.replace('/login');
          return;
        }

        if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

          if (!profile) {
            redirectInitiated.current = true;
            router.replace('/dashboard/default');
          } else if (profile.status === 'pending') {
            redirectInitiated.current = true;
            router.replace('/pending-approval');
          } else if (profile.status === 'rejected') {
            await supabase.auth.signOut();
            redirectInitiated.current = true;
            router.replace('/login?error=rejected');
          } else if (profile.status === 'approved') {
            if (profile.role === 'admin') {
              redirectInitiated.current = true;
              router.replace('/admin/approvals');
            } else {
              redirectInitiated.current = true;
              router.replace('/dashboard/default');
            }
          } else {
            redirectInitiated.current = true;
            router.replace('/dashboard/default');
          }
        } else {
          redirectInitiated.current = true;
          router.replace('/login');
        }
      } catch {
        redirectInitiated.current = true;
        router.replace('/login');
      }
    };

    handleCallback();
  }, [pathname, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p className="text-gray-600">認証処理中...</p>
      </div>
    </div>
  );
}
