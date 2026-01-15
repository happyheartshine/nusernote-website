'use client';

import PropTypes from 'prop-types';

/**
 * Status badge component for Report status
 */
export default function ReportStatusBadge({ status }) {
  const badges = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    FINAL: 'bg-green-100 text-green-800',
  };

  const labels = {
    DRAFT: '下書き',
    FINAL: '確定',
  };

  return (
    <span className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${badges[status] || badges.DRAFT}`}>
      {labels[status] || labels.DRAFT}
    </span>
  );
}

ReportStatusBadge.propTypes = {
  status: PropTypes.oneOf(['DRAFT', 'FINAL']).isRequired,
};
