'use client';

import PropTypes from 'prop-types';
import ReportStatusBadge from './ReportStatusBadge';

function formatYearMonth(yearMonth) {
  if (!yearMonth) return '—';
  try {
    const [year, month] = yearMonth.split('-');
    return `${year}年${parseInt(month, 10)}月`;
  } catch {
    return yearMonth;
  }
}

function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('ja-JP');
  } catch {
    return dateString;
  }
}

/**
 * Report Card Component for Mobile View
 * Displays report information in a card format
 */
export default function ReportCard({
  report,
  onEdit,
  onDelete,
  onPreview,
  onDownload,
  isDeleting = false,
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
              {report.patient_name || '不明'}
            </h3>
            {report.year_month && (
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600">
                対象月: {formatYearMonth(report.year_month)}
              </p>
            )}
          </div>
          <div className="ml-2 shrink-0">
            <ReportStatusBadge status={report.status || 'DRAFT'} />
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 space-y-1.5 sm:space-y-2">
        {report.created_at && (
          <div className="flex items-center text-xs sm:text-sm text-gray-600">
            <i className="ph ph-clock text-sm sm:text-base me-1.5 sm:me-2 text-gray-400"></i>
            <span>作成日: {formatDate(report.created_at)}</span>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Left Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onPreview(report)}
              className="p-1.5 sm:p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors"
              title="PDF操作を表示"
            >
              <i className="ph ph-file-pdf text-base sm:text-lg"></i>
            </button>
            <button
              onClick={() => onDownload(report)}
              className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              title="PDFダウンロード"
            >
              <i className="ph ph-download text-base sm:text-lg"></i>
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onEdit(report)}
              disabled={isDeleting}
              className="p-1.5 sm:p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="編集"
            >
              <i className="ph ph-pencil text-base sm:text-lg"></i>
            </button>
            <button
              onClick={() => onDelete(report)}
              disabled={isDeleting}
              className="p-1.5 sm:p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="削除"
            >
              {isDeleting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
              ) : (
                <i className="ph ph-trash text-base sm:text-lg"></i>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

ReportCard.propTypes = {
  report: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  isDeleting: PropTypes.bool,
};
