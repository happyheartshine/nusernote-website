'use client';

import PropTypes from 'prop-types';
import PlanStatusBadge from './PlanStatusBadge';

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

/**
 * Plan Card Component for Mobile View
 * Displays plan information in a card format
 */
export default function PlanCard({
  plan,
  onEdit,
  onDelete,
  onPreview,
  onDownload,
  isDeleting = false,
}) {
  const patientName = plan.patient?.name || plan.patient_name || '—';

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
              {patientName}
            </h3>
            {plan.start_date && plan.end_date && (
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600">
                {formatDate(plan.start_date)} ～ {formatDate(plan.end_date)}
              </p>
            )}
          </div>
          <div className="ml-2 shrink-0">
            <PlanStatusBadge status={plan.status} />
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 space-y-1.5 sm:space-y-2">
        {plan.created_at && (
          <div className="flex items-center text-xs sm:text-sm text-gray-600">
            <i className="ph ph-clock me-1.5 sm:me-2 text-gray-400 text-sm"></i>
            <span>作成日: {formatDate(plan.created_at)}</span>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Left Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onPreview(plan)}
              className="p-1.5 sm:p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors"
              title="PDF操作を表示"
            >
              <i className="ph ph-file-pdf text-base sm:text-lg"></i>
            </button>
            <button
              onClick={() => onDownload(plan)}
              className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              title="PDFダウンロード"
            >
              <i className="ph ph-download text-base sm:text-lg"></i>
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onEdit(plan)}
              disabled={isDeleting}
              className="p-1.5 sm:p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="編集"
            >
              <i className="ph ph-pencil text-base sm:text-lg"></i>
            </button>
            <button
              onClick={() => onDelete(plan)}
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

PlanCard.propTypes = {
  plan: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  isDeleting: PropTypes.bool,
};
