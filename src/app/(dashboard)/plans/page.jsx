'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { supabase } from '@/lib/supabase';
import PlanStatusBadge from '@/components/plans/PlanStatusBadge';
import PlanCard from '@/components/plans/PlanCard';
import PlanPDFPreviewModal from '@/components/plans/PlanPDFPreviewModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { deletePlan } from '@/lib/planApi';
import CollapsiblePlansFilterBar from '@/components/CollapsiblePlansFilterBar';

// ==============================|| PLANS LIST PAGE ||============================== //

function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export default function PlansListPage() {
  const router = useRouter();
  const { user } = useAuthProfile();
  const [plans, setPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewPlanId, setPreviewPlanId] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [deletingPlanId, setDeletingPlanId] = useState(null);

  const fetchPlans = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all plans for the user directly from Supabase
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select(`
          *,
          patients (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (plansError) {
        throw plansError;
      }

      // Transform data to include patient name
      const plansList = (plansData || []).map(plan => ({
        ...plan,
        patient: plan.patients ? { id: plan.patients.id, name: plan.patients.name } : null,
        patient_name: plan.patients?.name || null,
      }));

      setPlans(plansList);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err instanceof Error ? err.message : '計画書の取得中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    let filtered = [...plans];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(plan => plan.status === statusFilter);
    }

    // Filter by patient name (client-side search)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(plan => {
        // If plan has patient info embedded, search by patient name
        const patientName = plan.patient?.name || plan.patient_name || '';
        return patientName.toLowerCase().includes(query);
      });
    }

    setFilteredPlans(filtered);
  }, [plans, searchQuery, statusFilter]);

  const handleDelete = (plan) => {
    const patientName = plan.patient?.name || plan.patient_name || '計画書';
    setConfirmDialog({
      isOpen: true,
      title: '計画書の削除',
      message: `「${patientName}」の計画書を削除しますか？この操作は取り消せません。`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setDeletingPlanId(plan.id);
        try {
          await deletePlan(plan.id);
          // Refresh the plans list
          await fetchPlans();
          // Close preview if the deleted plan was being previewed
          if (previewPlanId === plan.id) {
            setPreviewPlanId(null);
            setPdfPreviewUrl(null);
          }
        } catch (err) {
          console.error('Delete plan error:', err);
          setError(err instanceof Error ? err.message : '計画書の削除中にエラーが発生しました。');
        } finally {
          setDeletingPlanId(null);
        }
      },
      onCancel: () => {
        setConfirmDialog(null);
      }
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
          confirmText="削除"
          cancelText="キャンセル"
          type="danger"
        />
      )}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">訪問看護計画書</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">計画書の一覧と管理</p>
          </div>
        </div>

        {error && (
          <div className={`alert mb-4 sm:mb-6 alert-danger text-sm sm:text-base`} role="alert">
            <i className="ph ph-x-circle"></i>
            <div>{error}</div>
          </div>
        )}

        <CollapsiblePlansFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

      {filteredPlans.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <i className="ph ph-file-text text-4xl text-gray-400"></i>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">計画書が見つかりません</h3>
          <p className="text-gray-600">
            {searchQuery || statusFilter !== 'all'
              ? '検索条件に一致する計画書がありません。'
              : '計画書を作成してください。'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop: Table View */}
          <div className="hidden md:block overflow-hidden rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      患者名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      期間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      作成日
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredPlans.map((plan) => {
                    const patientName = plan.patient?.name || plan.patient_name || '—';
                    return (
                      <tr key={plan.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{patientName}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div>
                            {formatDate(plan.start_date)} ～ {formatDate(plan.end_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PlanStatusBadge status={plan.status} />
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {formatDate(plan.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/plans/${plan.id}/edit`)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="編集"
                            >
                              <i className="ph ph-pencil"></i>
                            </button>
                          <button
                            onClick={() => {
                              setPreviewPlanId(plan.id);
                              setShowPdfModal(true);
                            }}
                            className="text-purple-600 hover:text-purple-900 p-1"
                            title="PDF操作を表示"
                          >
                            <i className="ph ph-file-pdf"></i>
                          </button>
                            <button
                              onClick={async () => {
                                try {
                                  const { getSessionFromStorage } = await import('@/lib/sessionStorage');
                                  const session = getSessionFromStorage();
                                  if (!session) {
                                    alert('認証が必要です。再度ログインしてください。');
                                    return;
                                  }
                                  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
                                  const url = `${BACKEND_URL}/plans/${plan.id}/pdf`;
                                  const response = await fetch(url, {
                                    method: 'GET',
                                    headers: {
                                      'Authorization': `Bearer ${session.access_token}`,
                                      'ngrok-skip-browser-warning': 'true',
                                    },
                                  });
                                  if (!response.ok) {
                                    throw new Error(`PDF生成に失敗しました: ${response.status}`);
                                  }
                                  const blob = await response.blob();
                                  const blobUrl = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = blobUrl;
                                  link.download = `plan_${plan.id}.pdf`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(blobUrl);
                                } catch (err) {
                                  console.error('Error downloading PDF:', err);
                                  alert('PDFのダウンロード中にエラーが発生しました。');
                                }
                              }}
                              className="text-gray-600 hover:text-blue-700 p-1"
                              title="PDFダウンロード"
                            >
                              <i className="ph ph-download"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(plan)}
                              disabled={deletingPlanId === plan.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 p-1"
                              title="削除"
                            >
                              <i className="ph ph-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: Card View */}
          <div className="md:hidden space-y-4">
            {filteredPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={(plan) => router.push(`/plans/${plan.id}/edit`)}
                onDelete={handleDelete}
                onPreview={(plan) => {
                  setPreviewPlanId(plan.id);
                  setShowPdfModal(true);
                }}
                onDownload={async (plan) => {
                  try {
                    const { getSessionFromStorage } = await import('@/lib/sessionStorage');
                    const session = getSessionFromStorage();
                    if (!session) {
                      alert('認証が必要です。再度ログインしてください。');
                      return;
                    }
                    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
                    const url = `${BACKEND_URL}/plans/${plan.id}/pdf`;
                    const response = await fetch(url, {
                      method: 'GET',
                      headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'ngrok-skip-browser-warning': 'true',
                      },
                    });
                    if (!response.ok) {
                      throw new Error(`PDF生成に失敗しました: ${response.status}`);
                    }
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `plan_${plan.id}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(blobUrl);
                  } catch (err) {
                    console.error('Error downloading PDF:', err);
                    alert('PDFのダウンロード中にエラーが発生しました。');
                  }
                }}
                isDeleting={deletingPlanId === plan.id}
              />
            ))}
          </div>
        </>
      )}

      {/* PDF Preview Modal */}
      {previewPlanId && (
        <PlanPDFPreviewModal
          planId={previewPlanId}
          isOpen={showPdfModal}
          onClose={() => {
            setShowPdfModal(false);
            setPreviewPlanId(null);
            setPdfPreviewUrl(null);
          }}
          pdfPreviewUrl={pdfPreviewUrl}
          onPreviewReady={setPdfPreviewUrl}
        />
      )}
      </div>
    </>
  );
}
