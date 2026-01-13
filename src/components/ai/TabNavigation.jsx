'use client';

import PropTypes from 'prop-types';

const TABS = [
  { key: 'soap', label: 'SOAP作成（AI生成）' },
  { key: 'records', label: '記録一覧' },
];

// ==============================|| TAB NAVIGATION ||============================== //

export default function TabNavigation({ activeTab, onTabChange }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`btn flex-1 ${
                activeTab === tab.key ? 'btn-primary' : 'btn-outline-secondary'
              }`}
            >
              {tab.label}
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


