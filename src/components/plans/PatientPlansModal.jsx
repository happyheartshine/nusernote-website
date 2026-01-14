'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PropTypes from 'prop-types';
import { fetchPatientPlans, deletePlan } from '@/lib/planApi';
import PlanStatusBadge from './PlanStatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';

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

export default function PatientPlansModal({ patientId, patientName, isOpen, onClose }) {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [deletingPlanId, setDeletingPlanId] = useState(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPatientPlans(patientId);
      const plansList = Array.isArray(data) ? data : (data.plans || []);
      setPlans(plansList);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err instanceof Error ? err.message : '計画書の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && patientId) {
      fetchPlans();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, patientId]);

  const handleDelete = (plan) => {
    setConfirmDialog({
      isOpen: true,
      title: '計画書の削除',
      message: `「${patientName}」の計画書（${formatDate(plan.start_date)} ～ ${formatDate(plan.end_date)}）を削除しますか？この操作は取り消せません。`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setDeletingPlanId(plan.id);
        try {
          await deletePlan(plan.id);
          // Refresh the plans list
          await fetchPlans();
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

  if (!isOpen) return null;

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="max-w-4xl w-full rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">計画書一覧</h3>
              <p className="mt-1 text-sm text-gray-600">{patientName}</p>
            </div>
            <button
              onClick={onClose}
              className="btn btn-sm btn-outline-secondary"
            >
              <i className="ph ph-x me-1"></i>
              閉じる
            </button>
          </div>
          </div>

          <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className={`alert alert-danger`} role="alert">
              <i className="ph ph-x-circle"></i>
              <div>{error}</div>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <i className="ph ph-file-text text-4xl text-gray-400"></i>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">計画書がありません</h3>
              <p className="mb-4 text-gray-600">この患者の計画書はまだ作成されていません。</p>
              <button
                onClick={() => {
                  onClose();
                  router.push(`/plans/new?patientId=${patientId}`);
                }}
                className="btn btn-primary"
              >
                <i className="ph ph-plus me-2"></i>
                新規計画書作成
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => {
                    onClose();
                    router.push(`/plans/new?patientId=${patientId}`);
                  }}
                  className="btn btn-primary"
                >
                  <i className="ph ph-plus me-2"></i>
                  新規計画書作成
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        期間
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        ステータス
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        作成日
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {plans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <div>
                            {formatDate(plan.start_date)} ～ {formatDate(plan.end_date)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <PlanStatusBadge status={plan.status} />
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
                          {formatDate(plan.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                onClose();
                                router.push(`/plans/${plan.id}/edit`);
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="編集"
                            >
                              <i className="ph ph-pencil"></i>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </>
  );
}

PatientPlansModal.propTypes = {
  patientId: PropTypes.string.isRequired,
  patientName: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
