'use client';

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Collapsible Record Filters Component
 * Collapses to icon on mobile to save space
 * Mobile-first design for single-screen operation
 */
export default function CollapsibleRecordFilters({
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  assignedNurse,
  onAssignedNurseChange,
  nurseNames,
  onApplyFilters,
  onClearFilters,
  loading,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // On desktop, always show expanded
  const shouldShowExpanded = isMobile ? isExpanded : true;

  // Check if any filters are active
  const hasActiveFilters = dateFrom || dateTo || assignedNurse;

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    } catch {
      return dateString;
    }
  };

  // Get filter summary text
  const getFilterSummary = () => {
    const parts = [];
    if (dateFrom) parts.push(`開始: ${formatDateForDisplay(dateFrom)}`);
    if (dateTo) parts.push(`終了: ${formatDateForDisplay(dateTo)}`);
    if (assignedNurse) parts.push(`看護師: ${assignedNurse}`);
    return parts.length > 0 ? parts.join(', ') : '検索・フィルター';
  };

  return (
    <div className="mb-3 sm:mb-6 rounded-lg bg-white shadow">
      {/* Mobile: Collapsed Header */}
      {isMobile && !shouldShowExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
          type="button"
        >
          <div className="flex items-center gap-2">
            <i className="ph ph-funnel text-gray-600 text-sm"></i>
            <span className="text-xs text-gray-700">
              {getFilterSummary()}
            </span>
            {hasActiveFilters && (
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                適用中
              </span>
            )}
          </div>
          <i className="ph ph-chevron-down text-gray-400 text-sm"></i>
        </button>
      )}

      {/* Expanded Content */}
      {shouldShowExpanded && (
        <div className="p-3 sm:p-4">
          <div className="space-y-2 sm:space-y-3">
            {isMobile && (
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-700">検索・フィルター</h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  type="button"
                >
                  <i className="ph ph-x text-base"></i>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3">
              <div>
                <label htmlFor="date-from" className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-gray-700">
                  開始日
                </label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="form-control w-full text-xs sm:text-sm"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="date-to" className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-gray-700">
                  終了日
                </label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="form-control w-full text-xs sm:text-sm"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="assigned-nurse" className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-gray-700">
                  担当看護師
                </label>
                <select
                  id="assigned-nurse"
                  value={assignedNurse}
                  onChange={(e) => onAssignedNurseChange(e.target.value)}
                  className="form-select w-full text-xs sm:text-sm"
                  disabled={loading}
                >
                  <option value="">すべて</option>
                  {nurseNames.map((nurse) => (
                    <option key={nurse} value={nurse}>
                      {nurse}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onApplyFilters}
                disabled={loading}
                className="btn btn-primary flex-1 text-xs sm:text-sm py-1.5 sm:py-2"
                type="button"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <div className="inline-block h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    <span className="text-xs sm:text-sm">適用中...</span>
                  </span>
                ) : (
                  '適用'
                )}
              </button>
              <button
                onClick={onClearFilters}
                disabled={loading}
                className="btn btn-outline-secondary text-xs sm:text-sm py-1.5 sm:py-2"
                type="button"
              >
                クリア
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

CollapsibleRecordFilters.propTypes = {
  dateFrom: PropTypes.string.isRequired,
  onDateFromChange: PropTypes.func.isRequired,
  dateTo: PropTypes.string.isRequired,
  onDateToChange: PropTypes.func.isRequired,
  assignedNurse: PropTypes.string.isRequired,
  onAssignedNurseChange: PropTypes.func.isRequired,
  nurseNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  onApplyFilters: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

CollapsibleRecordFilters.defaultProps = {
  loading: false,
};
