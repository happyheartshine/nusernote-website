'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthProfile } from '@/hooks/useAuthProfile';

const logo = '/assets/images/logo-dark.svg';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { session, profile, loading } = useAuthProfile();

  useEffect(() => {
    if (!loading) {
      if (!session) {
        router.push('/login');
      } else if (profile && profile.status === 'approved') {
        router.push('/dashboard/default');
      }
    }
  }, [session, profile, loading, router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!session || !profile) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <Image src={logo} alt="Nurse Note AI" className="mx-auto mb-6" width={120} height={60} priority />

          <div className="mb-6">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
              <svg className="h-10 w-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">管理者の承認待ちです</h1>
            <p className="mb-4 text-gray-600">アカウントは現在審査中です</p>
          </div>

          <div className="mb-6 rounded-lg bg-gray-50 p-6 text-left">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">メールアドレス</span>
                <span className="text-sm text-gray-900">{profile.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">ステータス</span>
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                  {profile.status === 'pending' && '承認待ち'}
                  {profile.status === 'rejected' && '却下'}
                </span>
              </div>
              {profile.name && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">お名前</span>
                  <span className="text-sm text-gray-900">{profile.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 text-sm text-blue-700">
                <p>
                  承認後に自動で利用可能になります。
                  <br />
                  承認されましたら、再度ログインしてください。
                </p>
              </div>
            </div>
          </div>

          <button onClick={handleLogout} className="btn btn-primary w-full shadow-lg transition-all hover:shadow-xl">
            ログアウト
          </button>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>お問い合わせは管理者までご連絡ください</p>
        </div>
      </div>
    </div>
  );
}
