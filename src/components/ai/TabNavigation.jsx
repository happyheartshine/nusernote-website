'use client';

import PropTypes from 'prop-types';

const TABS = [
  { key: 'soap', label: 'SOAP作成（AI生成）' },
  { key: 'records', label: '記録一覧' },
];

// ==============================|| TAB NAVIGATION ||============================== //

export default function TabNavigation({ activeTab, onTabChange }) {
  return (
    <div className="card" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div className="card-body" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div className="flex gap-2" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`btn flex-1 text-xs sm:text-sm py-2 sm:py-2.5 min-w-0 ${
                activeTab === tab.key ? 'btn-primary' : 'btn-outline-secondary'
              }`}
              style={{ maxWidth: '100%', boxSizing: 'border-box' }}
            >
              <span className="truncate block">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

TabNavigation.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
};


