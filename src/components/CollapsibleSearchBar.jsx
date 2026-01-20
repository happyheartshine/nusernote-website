'use client';

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Collapsible Search and Filter Bar
 * Collapses to icon on mobile to save space
 */
export default function CollapsibleSearchBar({
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

  // On desktop, always show expanded
  const shouldShowExpanded = isMobile ? isExpanded : true;

  return (
    <div className="mb-6 rounded-lg bg-white p-4 shadow">
      {/* Mobile: Collapsed Header */}
      {isMobile && !shouldShowExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <i className="ph ph-magnifying-glass text-gray-600"></i>
            <span className="text-sm text-gray-700">
              {searchQuery ? `検索: ${searchQuery}` : '検索・フィルター'}
            </span>
            {statusFilter !== 'all' && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                {statusFilter === 'active' ? '有効' : statusFilter === 'inactive' ? '無効' : 'アーカイブ'}
              </span>
            )}
          </div>
          <i className="ph ph-chevron-down text-gray-400"></i>
        </button>
      )}

      {/* Expanded Content */}
      {shouldShowExpanded && (
        <div className="space-y-4">
          {isMobile && (
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">検索・フィルター</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <i className="ph ph-x text-lg"></i>
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="search" className="mb-2 block text-sm font-medium text-gray-700">
                検索
              </label>
              <div className="relative">
                <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  id="search"
                  type="text"
                  placeholder="患者名、主疾患、メモで検索"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="form-control pl-10 w-full"
                />
              </div>
            </div>
            <div>
              <label htmlFor="status-filter" className="mb-2 block text-sm font-medium text-gray-700">
                ステータス
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="form-select w-full"
              >
                <option value="all">すべて</option>
                <option value="active">有効</option>
                <option value="inactive">無効</option>
                <option value="archived">アーカイブ</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

CollapsibleSearchBar.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  statusFilter: PropTypes.string.isRequired,
  onStatusFilterChange: PropTypes.func.isRequired,
};
