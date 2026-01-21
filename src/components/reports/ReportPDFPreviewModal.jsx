'use client';

import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import PDFDownloadButton from '@/components/ai/PDFDownloadButton';
import PDFPreviewButton from '@/components/ai/PDFPreviewButton';
import { getSessionFromStorage } from '@/lib/sessionStorage';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

/**
 * Full-screen PDF Preview Modal for Reports
 * Desktop: Shows inline, Mobile: Full-screen modal
 */
export default function ReportPDFPreviewModal({ reportId, isOpen, onClose, pdfPreviewUrl, onPreviewReady }) {
  const [isMobile, setIsMobile] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null); // 'download' | 'preview' | null

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMobileDownload = async () => {
    if (!BACKEND_URL) {
      alert('バックエンドURLが設定されていません');
      return;
    }

    try {
      setLoadingAction('download');
      const session = getSessionFromStorage();
      if (!session) {
        alert('認証が必要です。再度ログインしてください。');
        return;
      }

      const url = `${BACKEND_URL}/reports/${reportId}/pdf`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!response.ok) {
        throw new Error(`PDF生成に失敗しました: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error('PDFデータが取得できませんでした');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `report_${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Mobile report PDF download error:', err);
      alert('PDFのダウンロード中にエラーが発生しました。');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleMobilePreviewToggle = async () => {
    if (pdfPreviewUrl) {
      onPreviewReady(null);
      return;
    }

    if (!BACKEND_URL) {
      alert('バックエンドURLが設定されていません');
      return;
    }

    try {
      setLoadingAction('preview');
      const session = getSessionFromStorage();
      if (!session) {
        alert('認証が必要です。再度ログインしてください。');
        return;
      }

      const url = `${BACKEND_URL}/reports/${reportId}/pdf`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!response.ok) {
        throw new Error(`PDF生成に失敗しました: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error('PDFデータが取得できませんでした');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      onPreviewReady(blobUrl);
    } catch (err) {
      console.error('Mobile report PDF preview error:', err);
      alert(err instanceof Error ? err.message : 'PDFプレビュー中にエラーが発生しました。');
    } finally {
      setLoadingAction(null);
    }
  };

  if (!isOpen) return null;

  // Mobile: Full-screen modal
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="戻る"
            >
              <i className="ph ph-arrow-left text-xl"></i>
            </button>
            <h3 className="text-lg font-semibold text-gray-900">PDF操作</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="閉じる"
          >
            <i className="ph ph-x text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
          {/* Mini icon toolbar (mobile) */}
          <div className="mb-3 flex items-center justify-between gap-2">
            {/* Back to reports list */}
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 text-lg shadow-sm active:scale-95 transition"
              title="報告書リストに戻る"
              aria-label="報告書リストに戻る"
            >
              <i className="ph ph-arrow-left" />
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={handleMobileDownload}
              disabled={loadingAction === 'download'}
              className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-300 bg-white text-blue-600 text-lg shadow-sm active:scale-95 transition disabled:opacity-60"
              title="PDFダウンロード"
              aria-label="PDFダウンロード"
            >
              {loadingAction === 'download' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              ) : (
                <i className="ph ph-download" />
              )}
            </button>

            {/* Preview PDF */}
            <button
              type="button"
              onClick={handleMobilePreviewToggle}
              disabled={loadingAction === 'preview'}
              className={`h-9 w-9 flex items-center justify-center rounded-full border shadow-sm active:scale-95 transition disabled:opacity-60 ${
                pdfPreviewUrl
                  ? 'border-green-400 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-white text-purple-600'
              }`}
              title={pdfPreviewUrl ? 'プレビューを閉じる' : 'PDFプレビュー'}
              aria-label={pdfPreviewUrl ? 'プレビューを閉じる' : 'PDFプレビュー'}
            >
              {loadingAction === 'preview' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              ) : (
                <i className={pdfPreviewUrl ? 'ph ph-eye-slash' : 'ph ph-file-pdf'} />
              )}
            </button>
          </div>

          {pdfPreviewUrl && (
            <div className="mt-3 sm:mt-4 rounded-lg border border-gray-200 bg-white shadow overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base font-semibold text-gray-900">PDFプレビュー</span>
                  <button
                    type="button"
                    onClick={() => onPreviewReady(null)}
                    className="btn btn-sm btn-outline-secondary text-xs sm:text-sm"
                  >
                    閉じる
                  </button>
                </div>
              </div>
              <div className="p-0 overflow-hidden">
                <div
                  className="w-full overflow-hidden"
                  style={{ height: 'calc(100vh - 280px)', minHeight: '360px' }}
                >
                  <iframe
                    src={pdfPreviewUrl}
                    title="PDF preview"
                    className="w-full h-full border-0 block"
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: Inline view (existing behavior)
  return (
    <div className="border-t border-gray-200 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="btn btn-sm btn-outline-secondary">
            <i className="ph ph-arrow-left me-1"></i>
            戻る
          </button>
          <h3 className="text-lg font-semibold text-gray-900">PDF操作</h3>
        </div>
        <button onClick={onClose} className="btn btn-sm btn-outline-secondary">
          <i className="ph ph-x me-1"></i>
          閉じる
        </button>
      </div>
      
      {/* Return to Reports List Button */}
      <div className="mb-4">
        <button
          onClick={onClose}
          className="btn btn-outline-secondary w-full md:w-auto min-h-[44px] flex items-center justify-center gap-2"
          type="button"
        >
          <i className="ph ph-arrow-left"></i>
          報告書リストに戻る
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PDFDownloadButton
          label="報告書 PDFをダウンロード"
          endpoint={`/reports/${reportId}/pdf`}
          filename={`report_${reportId}.pdf`}
          method="GET"
        />
        <PDFPreviewButton
          label={pdfPreviewUrl ? '報告書 プレビューを閉じる' : '報告書をプレビュー'}
          endpoint={`/reports/${reportId}/pdf`}
          isActive={!!pdfPreviewUrl}
          onPreviewReady={onPreviewReady}
          method="GET"
        />
      </div>

      {pdfPreviewUrl && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white shadow">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">PDFプレビュー</span>
              <button
                type="button"
                onClick={() => onPreviewReady(null)}
                className="btn btn-sm btn-outline-secondary"
              >
                閉じる
              </button>
            </div>
          </div>
          <div className="p-0">
            <div className="w-full" style={{ height: '600px' }}>
              <iframe src={pdfPreviewUrl} title="PDF preview" className="w-full h-full border-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReportPDFPreviewModal.propTypes = {
  reportId: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  pdfPreviewUrl: PropTypes.string,
  onPreviewReady: PropTypes.func.isRequired,
};
