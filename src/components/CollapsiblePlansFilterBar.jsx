'use client';

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Collapsible Filter Bar for Plans List
 * Mobile: collapses to a single row, Desktop: always expanded
 */
export default function CollapsiblePlansFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
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

  const shouldShowExpanded = isMobile ? isExpanded : true;

  const getStatusLabel = (value) => {
    switch (value) {
      case 'ACTIVE':
        return '有効';
      case 'CLOSED':
        return '終了';
      case 'ENDED_BY_HOSPITALIZATION':
        return '入院により終了';
      case 'all':
      default:
        return 'すべて';
    }
  };

  const hasActiveFilter = statusFilter !== 'all' || !!searchQuery;

  return (
    <div className="mb-3 sm:mb-6 rounded-lg bg-white shadow">
      {/* Mobile: Collapsed header */}
      {isMobile && !shouldShowExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <i className="ph ph-funnel text-gray-600 text-sm" />
            <span className="text-xs text-gray-700">
              {searchQuery ? `検索: ${searchQuery}` : '検索・フィルター'}
            </span>
            {hasActiveFilter && (
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                {getStatusLabel(statusFilter)}
              </span>
            )}
          </div>
          <i className="ph ph-chevron-down text-gray-400 text-sm" />
        </button>
      )}

      {/* Expanded content */}
      {shouldShowExpanded && (
        <div className="p-3 sm:p-4">
          {isMobile && (
            <div className="mb-3 flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-semibold text-gray-700">検索・フィルター</h3>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600"
                aria-label="閉じる"
              >
                <i className="ph ph-x text-base" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:gap-3 md:gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="plans-search"
                className="mb-1 block text-xs sm:text-sm font-medium text-gray-700"
              >
                患者名で検索
              </label>
              <div className="relative">
                <i className="ph ph-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  id="plans-search"
                  type="text"
                  placeholder="患者名で検索"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="form-control w-full pl-7 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="plans-status-filter"
                className="mb-1 block text-xs sm:text-sm font-medium text-gray-700"
              >
                ステータス
              </label>
              <select
                id="plans-status-filter"
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="form-select w-full text-xs sm:text-sm"
              >
                <option value="all">すべて</option>
                <option value="ACTIVE">有効</option>
                <option value="CLOSED">終了</option>
                <option value="ENDED_BY_HOSPITALIZATION">入院により終了</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

CollapsiblePlansFilterBar.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  statusFilter: PropTypes.string.isRequired,
  onStatusFilterChange: PropTypes.func.isRequired,
};

