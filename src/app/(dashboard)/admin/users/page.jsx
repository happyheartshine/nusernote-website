'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminGuard from '@/components/auth/AdminGuard';
import { supabase } from '@/lib/supabase';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, statusFilter, roleFilter, searchQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      showToast('ユーザーの取得に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) => user.email.toLowerCase().includes(query) || (user.name && user.name.toLowerCase().includes(query))
      );
    }

    setFilteredUsers(filtered);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleStatusChange = async (userId, newStatus) => {
    setProcessingId(userId);
    try {
      // Direct database update (temporary workaround until Edge Function is deployed)
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      showToast('ステータスを更新しました', 'success');
      fetchUsers();
    } catch (error) {
      console.error('Status update error:', error);
      showToast('更新に失敗しました: ' + (error.message || '不明なエラー'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!confirm(`役割を「${newRole === 'admin' ? '管理者' : '看護師'}」に変更しますか？`)) return;

    setProcessingId(userId);
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);

      if (error) throw error;

      showToast('役割を更新しました', 'success');
      fetchUsers();
    } catch (error) {
      showToast('更新に失敗しました', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    const labels = {
      pending: '承認待ち',
      approved: '承認済み',
      rejected: '却下'
    };
    return <span className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${badges[status]}`}>{labels[status]}</span>;
  };

  return (
    <AdminGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ユーザー管理</h1>
              <p className="mt-2 text-gray-600">全ユーザーの管理とステータス変更</p>
            </div>
            <button onClick={() => router.push('/admin/approvals')} className="btn btn-primary">
              承認待ちユーザー
            </button>
          </div>

          {toast && (
            <div
              className={`mb-4 rounded-lg p-4 ${toast.type === 'success' ? 'border border-green-200 bg-green-50 text-green-800' : 'border border-red-200 bg-red-50 text-red-800'}`}
            >
              {toast.message}
            </div>
          )}

          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="search" className="mb-2 block text-sm font-medium text-gray-700">
                  検索
                </label>
                <input
                  id="search"
                  type="text"
                  placeholder="名前またはメールアドレスで検索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control w-full"
                />
              </div>
              <div>
                <label htmlFor="status-filter" className="mb-2 block text-sm font-medium text-gray-700">
                  ステータス
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="form-control w-full"
                >
                  <option value="all">すべて</option>
                  <option value="pending">承認待ち</option>
                  <option value="approved">承認済み</option>
                  <option value="rejected">却下</option>
                </select>
              </div>
              <div>
                <label htmlFor="role-filter" className="mb-2 block text-sm font-medium text-gray-700">
                  役割
                </label>
                <select id="role-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="form-control w-full">
                  <option value="all">すべて</option>
                  <option value="admin">管理者</option>
                  <option value="nurse">看護師</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">ユーザーが見つかりません</h3>
            <p className="text-gray-600">検索条件に一致するユーザーがいません。</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">ユーザー情報</th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">役割</th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">ステータス</th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">登録日</th>
                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredUsers.map((user) => (
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={processingId === user.id}
                          className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                        >
                          <option value="nurse">看護師</option>
                          <option value="admin">管理者</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(user.status)}</td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{formatDate(user.created_at)}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {user.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(user.id, 'approved')}
                                disabled={processingId === user.id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              >
                                承認
                              </button>
                              <button
                                onClick={() => handleStatusChange(user.id, 'rejected')}
                                disabled={processingId === user.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                却下
                              </button>
                            </>
                          )}
                          {user.status === 'approved' && (
                            <button
                              onClick={() => handleStatusChange(user.id, 'rejected')}
                              disabled={processingId === user.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              停止
                            </button>
                          )}
                          {user.status === 'rejected' && (
                            <button
                              onClick={() => handleStatusChange(user.id, 'approved')}
                              disabled={processingId === user.id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              再承認
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-6 py-3 text-sm text-gray-500">全 {filteredUsers.length} 件のユーザー</div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
