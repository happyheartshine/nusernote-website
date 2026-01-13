'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionFromStorage } from '@/lib/sessionStorage';
import PlanOutput from '@/components/ai/PlanOutput';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

function formatDate(dateString) {
  try {
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateString)) {
      const [year, month, day] = dateString.split('T')[0].split('-');
      return `${year}/${month}/${day}`;
    }
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  } catch {
    return dateString;
  }
}

// ==============================|| PLANS PAGE ||============================== //

export default function PlansPage() {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (!BACKEND_URL) {
      setError('バックエンドURLが設定されていません');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const session = getSessionFromStorage();
      if (!session) {
        setError('認証が必要です。再度ログインしてください。');
        setLoading(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/records`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', {
          url: `${BACKEND_URL}/records`,
          status: response.status,
          contentType,
          preview: text.substring(0, 200),
        });
        throw new Error(
          `バックエンドサーバーに接続できません。URLを確認してください: ${BACKEND_URL || '未設定'}`
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'エラーが発生しました' }));
        throw new Error(errorData.error || errorData.detail || `APIエラー: ${response.status}`);
      }

      const data = await response.json();
      // Filter records that have plan_output (not null/undefined and not empty object)
      const recordsWithPlans = (data.records || []).filter(record => {
        const planOutput = record.plan_output;
        return planOutput && typeof planOutput === 'object' && Object.keys(planOutput).length > 0;
      });
      setRecords(recordsWithPlans);
      setError(null);
    } catch (err) {
      console.error('Error fetching records:', err);
      setError(err instanceof Error ? err.message : '記録の取得中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handlePlanUpdate = async (updatedPlanOutput) => {
    if (!selectedRecord) return;

    try {
      setUpdating(true);
      const session = getSessionFromStorage();
      if (!session) {
        throw new Error('認証が必要です。再度ログインしてください。');
      }

      const response = await fetch(`${BACKEND_URL}/records/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          plan_output: updatedPlanOutput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '更新に失敗しました' }));
        throw new Error(errorData.error || errorData.detail || `APIエラー: ${response.status}`);
      }

      const updatedRecord = await response.json();
      setSelectedRecord(updatedRecord);
      
      // Update the record in the list
      setRecords(prevRecords =>
        prevRecords.map(record =>
          record.id === updatedRecord.id ? updatedRecord : record
        )
      );
    } catch (err) {
      console.error('Error updating plan output:', err);
      alert(err instanceof Error ? err.message : '更新中にエラーが発生しました。');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <div className="card">
          <div className="card-header">
            <h5>訪問看護計画書</h5>
          </div>
          <div className="card-body">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                  <p className="mt-4 text-sm text-muted">読み込み中...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-danger">
                <i className="ph ph-warning-circle"></i>
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && records.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted">計画書データがありません</p>
              </div>
            )}

            {!loading && !error && records.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Records List */}
                <div className="space-y-3">
                  <h6 className="font-semibold mb-3">計画書一覧</h6>
                  {records.map((record) => (
                    <div
                      key={record.id}
                      onClick={() => setSelectedRecord(record)}
                      className={`card cursor-pointer hover:shadow-md transition-shadow ${
                        selectedRecord?.id === record.id ? 'border-primary' : ''
                      }`}
                    >
                      <div className="card-body">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="badge bg-primary"></span>
                              <p className="font-semibold">
                                {formatDate(record.visit_date)}　{record.patient_name}
                              </p>
                            </div>
                            {record.diagnosis && (
                              <p className="text-sm text-muted ms-4">主疾患：{record.diagnosis}</p>
                            )}
                          </div>
                          <i className="ph ph-arrow-right text-muted"></i>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Plan Output Display */}
                <div>
                  {selectedRecord ? (
                    <PlanOutput
                      planOutput={selectedRecord.plan_output}
                      visitDate={selectedRecord.visit_date}
                      patientName={selectedRecord.patient_name}
                      diagnosis={selectedRecord.diagnosis || ''}
                      status={selectedRecord.status || 'draft'}
                      onPlanUpdate={handlePlanUpdate}
                    />
                  ) : (
                    <div className="card">
                      <div className="card-body">
                        <p className="text-muted text-center py-8">
                          左側のリストから計画書を選択してください
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
