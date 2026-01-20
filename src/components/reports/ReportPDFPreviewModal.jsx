'use client';

import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import PDFDownloadButton from '@/components/ai/PDFDownloadButton';
import PDFPreviewButton from '@/components/ai/PDFPreviewButton';

/**
 * Full-screen PDF Preview Modal for Reports
 * Desktop: Shows inline, Mobile: Full-screen modal
 */
export default function ReportPDFPreviewModal({ reportId, isOpen, onClose, pdfPreviewUrl, onPreviewReady }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  // Mobile: Full-screen modal
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
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
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4 mb-4">
            {/* Return to Reports List Button */}
            <button
              onClick={onClose}
              className="btn btn-outline-secondary w-full min-h-[44px] flex items-center justify-center gap-2"
              type="button"
            >
              <i className="ph ph-arrow-left"></i>
              報告書リストに戻る
            </button>

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
                <div className="w-full" style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}>
                  <iframe src={pdfPreviewUrl} title="PDF preview" className="w-full h-full border-0" />
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
