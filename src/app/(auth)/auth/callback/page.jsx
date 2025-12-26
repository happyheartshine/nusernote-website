'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!session) {
          router.push('/login');
          return;
        }

        if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

          if (!profile) {
            router.push('/dashboard/default');
          } else if (profile.status === 'pending') {
            router.push('/pending-approval');
          } else if (profile.status === 'rejected') {
            await supabase.auth.signOut();
            router.push('/login?error=rejected');
          } else if (profile.status === 'approved') {
            if (profile.role === 'admin') {
              router.push('/admin/approvals');
            } else {
              router.push('/dashboard/default');
            }
          } else {
            router.push('/dashboard/default');
          }
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p className="text-gray-600">認証処理中...</p>
      </div>
    </div>
  );
}
