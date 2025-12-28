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
      // Prevent multiple redirects
      if (redirectInitiated.current) {
        return;
      }

      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!session) {
          if (pathname !== '/login') {
            redirectInitiated.current = true;
            router.push('/login');
          }
          return;
        }

        if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

          if (!profile) {
            if (pathname !== '/dashboard/default') {
              redirectInitiated.current = true;
              router.push('/dashboard/default');
            }
          } else if (profile.status === 'pending') {
            if (pathname !== '/pending-approval') {
              redirectInitiated.current = true;
              router.push('/pending-approval');
            }
          } else if (profile.status === 'rejected') {
            await supabase.auth.signOut();
            if (pathname !== '/login') {
              redirectInitiated.current = true;
              router.push('/login?error=rejected');
            }
          } else if (profile.status === 'approved') {
            if (profile.role === 'admin') {
              if (pathname !== '/admin/approvals') {
                redirectInitiated.current = true;
                router.push('/admin/approvals');
              }
            } else {
              if (pathname !== '/dashboard/default') {
                redirectInitiated.current = true;
                router.push('/dashboard/default');
              }
            }
          } else {
            if (pathname !== '/dashboard/default') {
              redirectInitiated.current = true;
              router.push('/dashboard/default');
            }
          }
        } else {
          if (pathname !== '/login') {
            redirectInitiated.current = true;
            router.push('/login');
          }
        }
      } catch {
        if (pathname !== '/login') {
          redirectInitiated.current = true;
          router.push('/login');
        }
      }
    };

    handleCallback();
  }, [pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p className="text-gray-600">認証処理中...</p>
      </div>
    </div>
  );
}
