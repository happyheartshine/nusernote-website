'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminGuard from '@/components/auth/AdminGuard';
import { supabase } from '@/lib/supabase';

export default function AdminApprovalsPage() {
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchPendingUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('status', 'pending').order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('エラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = async (userId) => {
    setProcessingId(userId);
    try {
      // Direct database update (temporary workaround until Edge Function is deployed)
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      showToast('ユーザーを承認しました', 'success');
      fetchPendingUsers();
    } catch (error) {
      console.error('Approval error:', error);
      showToast('承認に失敗しました: ' + (error.message || '不明なエラー'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId) => {
    if (!confirm('本当にこのユーザーを却下しますか？')) return;

    setProcessingId(userId);
    try {
      // Direct database update (temporary workaround until Edge Function is deployed)
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      showToast('ユーザーを却下しました', 'success');
      fetchPendingUsers();
    } catch (error) {
      console.error('Rejection error:', error);
      showToast('却下に失敗しました: ' + (error.message || '不明なエラー'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">承認待ちユーザー</h1>
              <p className="mt-2 text-gray-600">新規登録したユーザーの承認・却下を行います</p>
            </div>
            <button onClick={() => router.push('/admin/users')} className="btn btn-outline-primary">
              全ユーザー一覧
            </button>
          </div>
        </div>

        {toast && (
          <div
            className={`mb-4 rounded-lg p-4 ${toast.type === 'success' ? 'border border-green-200 bg-green-50 text-green-800' : 'border border-red-200 bg-red-50 text-red-800'}`}
          >
            {toast.message}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">承認待ちのユーザーはいません</h3>
            <p className="text-gray-600">現在、承認待ちの新規登録ユーザーはいません。</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">ユーザー情報</th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">登録日時</th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">役割</th>
                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                              <span className="text-sm font-medium text-blue-600">
                                {user.name ? user.name.charAt(0) : user.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name || '名前未設定'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{formatDate(user.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex rounded-full bg-purple-100 px-2 text-xs leading-5 font-semibold text-purple-800">
                          {user.role === 'admin' ? '管理者' : '看護師'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(user.id)}
                            disabled={processingId === user.id}
                            className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {processingId === user.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            ) : (
                              <>
                                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                承認
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(user.id)}
                            disabled={processingId === user.id}
                            className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {processingId === user.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            ) : (
                              <>
                                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                却下
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
