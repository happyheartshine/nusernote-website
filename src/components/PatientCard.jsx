'use client';

import PropTypes from 'prop-types';

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getStatusBadge(status) {
  const badges = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    archived: 'bg-yellow-100 text-yellow-800'
  };
  const labels = {
    active: '有効',
    inactive: '無効',
    archived: 'アーカイブ'
  };
  return (
    <span className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${badges[status]}`}>
      {labels[status]}
    </span>
  );
}

/**
 * Patient Card Component for Mobile View
 * Displays patient information in a card format
 */
export default function PatientCard({
  patient,
  onEdit,
  onDelete,
  onPlans,
  onReports,
  onPdfPreview,
  isProcessing = false,
  showPdfControls = false,
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
              {patient.patient_name}
            </h3>
            {patient.main_disease && (
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600 break-words">
                {patient.main_disease}
              </p>
            )}
          </div>
          <div className="ml-2 shrink-0">{getStatusBadge(patient.status)}</div>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 space-y-1.5 sm:space-y-2">
        {patient.initial_visit_date && (
          <div className="flex items-center text-xs sm:text-sm text-gray-600">
            <i className="ph ph-calendar me-1.5 sm:me-2 text-gray-400 text-sm"></i>
            <span>初回訪問: {formatDate(patient.initial_visit_date)}</span>
          </div>
        )}
        {patient.created_at && (
          <div className="flex items-center text-xs sm:text-sm text-gray-600">
            <i className="ph ph-clock me-1.5 sm:me-2 text-gray-400 text-sm"></i>
            <span>作成日: {formatDate(patient.created_at)}</span>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Left Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onPlans(patient)}
              className="p-1.5 sm:p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors"
              title="計画書"
            >
              <i className="ph ph-file-text text-base sm:text-lg"></i>
            </button>
            <button
              onClick={() => onReports(patient)}
              className="p-1.5 sm:p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
              title="月次報告書"
            >
              <i className="ph ph-file-doc text-base sm:text-lg"></i>
            </button>
            <button
              onClick={() => onPdfPreview(patient)}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                showPdfControls
                  ? 'text-purple-600 hover:text-purple-900 hover:bg-purple-50'
                  : 'text-purple-600 hover:text-purple-900 hover:bg-purple-50'
              }`}
              title={showPdfControls ? 'PDF操作を閉じる' : 'PDF操作を表示'}
            >
              <i className={`ph ${showPdfControls ? 'ph-eye-slash' : 'ph-file-pdf'} text-base sm:text-lg`}></i>
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onEdit(patient)}
              disabled={isProcessing}
              className="p-1.5 sm:p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="編集"
            >
              <i className="ph ph-pencil text-base sm:text-lg"></i>
            </button>
            <button
              onClick={() => onDelete(patient)}
              disabled={isProcessing}
              className="p-1.5 sm:p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="削除"
            >
              <i className="ph ph-trash text-base sm:text-lg"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

PatientCard.propTypes = {
  patient: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onPlans: PropTypes.func.isRequired,
  onReports: PropTypes.func.isRequired,
  onPdfPreview: PropTypes.func.isRequired,
  isProcessing: PropTypes.bool,
  showPdfControls: PropTypes.bool,
};
