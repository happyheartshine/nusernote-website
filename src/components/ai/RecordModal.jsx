'use client';

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '@/lib/supabase';
import SOAPOutput from './SOAPOutput';
import PDFDownloadButton from './PDFDownloadButton';
import PDFPreviewButton from './PDFPreviewButton';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export default function RecordModal({ recordId, onClose }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  useEffect(() => {
    if (!recordId) {
      setRecord(null);
      setError(null);
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('認証が必要です。再度ログインしてください。');
          setLoading(false);
          return;
        }

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

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (recordId) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [recordId, onClose]);

  if (!recordId) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="card-header flex items-center justify-between">
          <h5>
            {record
              ? `${record.patient_name} - ${new Date(record.visit_date).toLocaleDateString('ja-JP')}`
              : '記録詳細'}
          </h5>
          <button onClick={onClose} className="btn btn-sm btn-outline-secondary" aria-label="閉じる">
            <i className="ph ph-x"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
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

                {pdfPreviewUrl && (
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
                )}
              </div>

              <SOAPOutput
                soapOutput={record.soap_output}
                planOutput={record.plan_output}
                visitDate={record.visit_date}
                startTime={record.start_time || ''}
                endTime={record.end_time || ''}
                selectedNurses={record.nurses}
                diagnosis={record.diagnosis || ''}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

RecordModal.propTypes = {
  recordId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};


