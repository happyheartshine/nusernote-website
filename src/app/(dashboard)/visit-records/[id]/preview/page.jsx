'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { supabase } from '@/lib/supabase';

// ==============================|| VISIT RECORD PDF PREVIEW PAGE ||============================== //

export default function VisitRecordPreviewPage() {
  const { user } = useAuthProfile();
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id;
  
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recordName, setRecordName] = useState('');
  const pdfUrlRef = useRef(null);

  useEffect(() => {
    if (!user?.id || !recordId) return;

    const fetchPDF = async () => {
      setLoading(true);
      setError(null);

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('認証が必要です');
        }

        // Fetch record name for display
        const { data: record } = await supabase
          .from('visit_records')
          .select('patient_name')
          .eq('id', recordId)
          .eq('user_id', user.id)
          .single();

        if (record) {
          setRecordName(record.patient_name);
        }

        // Fetch PDF
        const response = await fetch(`${API_URL}/pdf/visit-record/${recordId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('PDF生成に失敗しました');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        // Cleanup previous URL if exists
        if (pdfUrlRef.current) {
          window.URL.revokeObjectURL(pdfUrlRef.current);
        }
        pdfUrlRef.current = url;
        setPdfUrl(url);
      } catch (err) {
        console.error('PDF preview error:', err);
        setError(err instanceof Error ? err.message : 'PDFプレビューに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchPDF();

    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrlRef.current) {
        window.URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
    };
  }, [user, recordId]);

  const handleDownload = async () => {
    if (!pdfUrl || !recordId) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`${API_URL}/pdf/visit-record/${recordId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('PDF生成に失敗しました');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `visit_record_${recordName || recordId}_${recordId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('PDFダウンロードに失敗しました');
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
              title="戻る"
            >
              <i className="ph ph-arrow-left text-2xl"></i>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">PDFプレビュー</h1>
              {recordName && (
                <p className="text-sm text-gray-600">{recordName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pdfUrl && (
              <button
                onClick={handleDownload}
                className="btn btn-primary"
              >
                <i className="ph ph-download me-2"></i>
                PDFをダウンロード
              </button>
            )}
            <button
              onClick={() => router.back()}
              className="btn btn-secondary"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <p className="text-gray-600">PDFを読み込み中...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <i className="ph ph-warning text-3xl text-red-600"></i>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">エラーが発生しました</h3>
              <p className="mb-4 text-gray-600">{error}</p>
              <button
                onClick={() => router.back()}
                className="btn btn-secondary"
              >
                戻る
              </button>
            </div>
          </div>
        )}

        {pdfUrl && !loading && !error && (
          <div className="h-full w-full">
            <iframe
              src={pdfUrl}
              title="PDF preview"
              className="h-full w-full border-0"
              style={{ minHeight: 'calc(100vh - 80px)' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
