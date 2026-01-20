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

  return (
    <div className="card">
      {/* Mobile: Collapsed Header */}
      {isMobile && !shouldShowExpanded && (
        <div className="card-body p-4">
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
            type="button"
          >
            <div className="flex items-center gap-2">
              <i className="ph ph-funnel text-gray-600"></i>
              <span className="text-sm text-gray-700">
                {hasActiveFilters ? 'フィルター適用中' : 'フィルター'}
              </span>
              {hasActiveFilters && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  適用中
                </span>
              )}
            </div>
            <i className="ph ph-chevron-down text-gray-400"></i>
          </button>
        </div>
      )}

      {/* Expanded Content */}
      {shouldShowExpanded && (
        <div className="card-body">
          <div className="space-y-4">
            {isMobile && (
              <div className="flex items-center justify-between pb-2 border-b">
                <h3 className="text-sm font-semibold text-gray-700">フィルター</h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  type="button"
                >
                  <i className="ph ph-x text-lg"></i>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="date-from" className="mb-2 block text-sm font-medium text-gray-700">
                  開始日
                </label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="form-control w-full"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="date-to" className="mb-2 block text-sm font-medium text-gray-700">
                  終了日
                </label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="form-control w-full"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="assigned-nurse" className="mb-2 block text-sm font-medium text-gray-700">
                  担当看護師
                </label>
                <select
                  id="assigned-nurse"
                  value={assignedNurse}
                  onChange={(e) => onAssignedNurseChange(e.target.value)}
                  className="form-select w-full"
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
                className="btn btn-primary flex-1 min-h-[44px]"
                type="button"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    適用中...
                  </span>
                ) : (
                  '適用'
                )}
              </button>
              <button
                onClick={onClearFilters}
                disabled={loading}
                className="btn btn-outline-secondary min-h-[44px]"
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
