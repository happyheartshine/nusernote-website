'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PropTypes from 'prop-types';
import { getSessionFromStorage } from '@/lib/sessionStorage';
import SOAPOutput from '@/components/ai/SOAPOutput';
import PDFDownloadButton from '@/components/ai/PDFDownloadButton';
import PDFPreviewButton from '@/components/ai/PDFPreviewButton';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export default function RecordDetailPage({ recordId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!recordId) {
      return;
    }

    const fetchRecord = async () => {
      if (!BACKEND_URL) {
        setError('バックエンドURLが設定されていません');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const session = getSessionFromStorage();
        if (!session) {
          setError('認証が必要です。再度ログインしてください。');
          setLoading(false);
          return;
        }
        console.log(recordId);
        const response = await fetch(`${BACKEND_URL}/records/${recordId}`, {
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
            url: `${BACKEND_URL}/records/${recordId}`,
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
        setRecord(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching record:', err);
        setError(err instanceof Error ? err.message : '記録の取得中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [recordId]);

  const handleBackToList = () => {
    // Preserve filter state from URL params
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const assignedNurse = searchParams.get('assignedNurse') || '';
    const page = searchParams.get('page') || '';

    // Build query string with preserved state
    const queryParams = new URLSearchParams();
    if (dateFrom) queryParams.set('dateFrom', dateFrom);
    if (dateTo) queryParams.set('dateTo', dateTo);
    if (assignedNurse) queryParams.set('assignedNurse', assignedNurse);
    if (page) queryParams.set('page', page);

    const queryString = queryParams.toString();
    router.push(`/ai?tab=records${queryString ? `&${queryString}` : ''}`);
  };

  const handleSoapUpdate = async (updatedSoapOutput) => {
    if (!record) return;

    setUpdating(true);
    try {
      const session = getSessionFromStorage();
      if (!session) {
        setError('認証が必要です。再度ログインしてください。');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/records/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          soap_output: updatedSoapOutput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '更新に失敗しました' }));
        throw new Error(errorData.error || errorData.detail || `APIエラー: ${response.status}`);
      }

      const updatedRecord = await response.json();
      setRecord(updatedRecord);
    } catch (err) {
      console.error('Error updating SOAP output:', err);
      setError(err instanceof Error ? err.message : '更新中にエラーが発生しました。');
    } finally {
      setUpdating(false);
    }
  };

  const handlePlanUpdate = async (updatedPlanOutput) => {
    if (!record) return;

    setUpdating(true);
    try {
      const session = getSessionFromStorage();
      if (!session) {
        setError('認証が必要です。再度ログインしてください。');
        return;
      }
      const response = await fetch(`${BACKEND_URL}/records/${recordId}`, {
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
      setRecord(updatedRecord);
    } catch (err) {
      console.error('Error updating plan output:', err);
      setError(err instanceof Error ? err.message : '更新中にエラーが発生しました。');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <button
          type="button"
          onClick={handleBackToList}
          className="btn btn-outline-secondary inline-flex items-center gap-2"
        >
          <i className="ph ph-arrow-left"></i>
          記録一覧に戻る
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h5>
            {record
              ? `${record.patient_name} - ${new Date(record.visit_date).toLocaleDateString('ja-JP')}`
              : '記録詳細'}
          </h5>
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

          {!loading && !error && record && (
            <>
              {updating && (
                <div className="alert alert-info mb-4">
                  <i className="ph ph-circle-notch animate-spin me-2"></i>
                  更新中...
                </div>
              )}
              
              {!pdfPreviewUrl && (
                <div className="mb-6 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <PDFDownloadButton
                      label="訪問看護記録書Ⅱ PDFをダウンロード"
                      endpoint={`/pdf/visit-report/${record.id}`}
                      filename={`visit_report_${record.id}.pdf`}
                    />
                    <PDFPreviewButton
                      label={pdfPreviewUrl ? '訪問看護記録書Ⅱ プレビューを閉じる' : '訪問看護記録書Ⅱ をプレビュー'}
                      endpoint={`/pdf/visit-report/${record.id}`}
                      isActive={!!pdfPreviewUrl}
                      onPreviewReady={(url) => setPdfPreviewUrl(url)}
                    />
                  </div>
                </div>
              )}

              {pdfPreviewUrl && (
                <div className="mb-6">
                  <div className="card">
                    <div className="card-header flex items-center justify-between">
                      <span>PDFプレビュー</span>
                      <button
                        type="button"
                        onClick={() => setPdfPreviewUrl(null)}
                        className="btn btn-sm btn-outline-secondary"
                      >
                        閉じる
                      </button>
                    </div>
                    <div className="card-body p-0">
                      <div className="w-full" style={{ height: '480px' }}>
                        <iframe src={pdfPreviewUrl} title="PDF preview" className="w-full h-full" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!pdfPreviewUrl && (
                <div className="card flex flex-col" style={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}>
                  <div className="flex-1 flex flex-col overflow-hidden p-0">
                    <SOAPOutput
                      soapOutput={record.soap_output}
                      planOutput={record.plan_output}
                      visitDate={record.visit_date}
                      startTime={record.start_time || ''}
                      endTime={record.end_time || ''}
                      selectedNurses={record.nurses}
                      diagnosis={record.diagnosis || ''}
                      patientName={record.patient_name}
                      status={record.status || 'draft'}
                      onSoapUpdate={handleSoapUpdate}
                      onPlanUpdate={handlePlanUpdate}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

RecordDetailPage.propTypes = {
  recordId: PropTypes.string.isRequired,
};

