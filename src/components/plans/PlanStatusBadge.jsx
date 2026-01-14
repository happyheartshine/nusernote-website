'use client';

import PropTypes from 'prop-types';

/**
 * Status badge component for Plan status
 */
export default function PlanStatusBadge({ status }) {
  const badges = {
    ACTIVE: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    ENDED_BY_HOSPITALIZATION: 'bg-red-100 text-red-800',
  };

  const labels = {
    ACTIVE: '有効',
    CLOSED: '終了',
    ENDED_BY_HOSPITALIZATION: '入院により終了',
  };

  return (
    <span className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${badges[status] || badges.CLOSED}`}>
      {labels[status] || labels.CLOSED}
    </span>
  );
}

PlanStatusBadge.propTypes = {
  status: PropTypes.oneOf(['ACTIVE', 'CLOSED', 'ENDED_BY_HOSPITALIZATION']).isRequired,
};
