'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getSessionFromStorage } from '@/lib/sessionStorage';
import RecordModal from './RecordModal';
import MonthlyReportPDF from './MonthlyReportPDF';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  } catch {
    return dateString;
  }
}

export default function RecordsTab() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  const patientNames = useMemo(() => {
    const uniqueNames = Array.from(new Set(records.map((r) => r.patient_name)));
    return uniqueNames.sort();
  }, [records]);

  useEffect(() => {
    if (patientNames.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patientNames[0]);
    }
  }, [patientNames, selectedPatientId]);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!BACKEND_URL) {
        setError('バックエンドURLが設定されていません');
        setLoading(false);
        return;
      }

      try {
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
        setRecords(data.records || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching records:', err);
        setError(err instanceof Error ? err.message : '記録の取得中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  return (
    <div className="space-y-6">
      {!loading && !error && patientNames.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h5>月次レポートPDF生成</h5>
          </div>
          <div className="card-body">
            <div className="mb-4">
              <label htmlFor="patient-select" className="mb-2 block text-sm font-medium">
                利用者を選択
              </label>
              <select
                id="patient-select"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="form-control"
              >
                {patientNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPatientId && <MonthlyReportPDF patientId={selectedPatientId} />}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h5>記録一覧</h5>
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
              <p className="text-muted">記録がありません</p>
            </div>
          )}

          {!loading && !error && records.length > 0 && (
            <div className="space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  onClick={() => setSelectedRecordId(record.id)}
                  className="card cursor-pointer hover:shadow-md transition-shadow"
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
                        {record.chief_complaint && (
                          <p className="text-sm text-muted ms-4">主訴：{record.chief_complaint}</p>
                        )}
                      </div>
                      <i className="ph ph-arrow-right text-muted"></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RecordModal recordId={selectedRecordId} onClose={() => setSelectedRecordId(null)} />
    </div>
  );
}


