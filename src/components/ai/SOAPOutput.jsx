'use client';

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// ==============================|| SOAP OUTPUT ||============================== //

export default function SOAPOutput({
  soapOutput,
  planOutput,
  visitDate,
  startTime,
  endTime,
  selectedNurses,
  diagnosis,
  patientName,
  onSoapUpdate,
  onPlanUpdate,
  status = 'draft',
}) {
  const [activeTab, setActiveTab] = useState('s');
  const [activeSubTab, setActiveSubTab] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  const isEditable = status === 'draft';

  // Sub-tabs for A (Assessment) section
  const assessmentSubTabs = [
    { key: '症状推移', label: '症状推移' },
    { key: 'リスク評価', label: 'リスク評価' },
    { key: '背景要因', label: '背景要因' },
    { key: '次回観察ポイント', label: '次回観察ポイント' },
  ];

  // Sub-tabs for P (Plan) section
  const planSubTabs = [
    { key: '本日実施した援助', label: '本日実施した援助' },
    { key: '次回以降の方針', label: '次回以降の方針' },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}（${weekday}）`;
  };

  // Initialize sub-tab when switching to A or P tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'a') {
      setActiveSubTab(assessmentSubTabs[0].key);
    } else if (tab === 'p') {
      setActiveSubTab(planSubTabs[0].key);
    } else {
      setActiveSubTab(null);
    }
  };

  const handleEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const handleSave = () => {
    if (!editingField) return;

    if (editingField === 's' || editingField === 'o') {
      const updated = { ...soapOutput, [editingField]: editValue };
      onSoapUpdate?.(updated);
    } else if (editingField.startsWith('a.')) {
      const subField = editingField.replace('a.', '');
      const updated = {
        ...soapOutput,
        a: { ...soapOutput.a, [subField]: editValue },
      };
      onSoapUpdate?.(updated);
    } else if (editingField.startsWith('p.')) {
      const subField = editingField.replace('p.', '');
      const updated = {
        ...soapOutput,
        p: { ...soapOutput.p, [subField]: editValue },
      };
      onSoapUpdate?.(updated);
    } else if (editingField.startsWith('plan.')) {
      if (!planOutput) return;
      const subField = editingField.replace('plan.', '');
      const updated = { ...planOutput, [subField]: editValue };
      onPlanUpdate?.(updated);
    }

    setEditingField(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const renderEditableContent = (field, value, className = '', compact = false) => {
    const isEditing = editingField === field;
    const displayValue = value || '（未入力）';

    if (isEditing) {
      return (
        <div className="space-y-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="form-control"
            rows={compact ? 6 : 8}
            autoFocus
            style={{ maxHeight: compact ? '200px' : '300px' }}
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn btn-primary btn-sm">
              保存
            </button>
            <button onClick={handleCancel} className="btn btn-outline-secondary btn-sm">
              キャンセル
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <p className={`whitespace-pre-wrap ${compact ? 'leading-6 text-sm' : 'leading-7'} ${isEditable ? 'pr-7' : ''} ${className}`}>
          {displayValue}
        </p>
        {isEditable && (
          <button
            onClick={() => handleEdit(field, value)}
            className="absolute bottom-1 right-1 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="編集"
            type="button"
          >
            <i className="ph ph-pencil text-muted"></i>
          </button>
        )}
      </div>
    );
  };

  // Main tabs configuration
  const mainTabs = [
    { key: 's', label: 'S', fullLabel: '主観', badge: 'bg-primary' },
    { key: 'o', label: 'O', fullLabel: '客観', badge: 'bg-success' },
    { key: 'a', label: 'A', fullLabel: 'アセスメント', badge: 'bg-warning' },
    { key: 'p', label: 'P', fullLabel: '計画', badge: 'bg-info' },
  ];

  // Initialize sub-tab when switching to A or P tabs
  useEffect(() => {
    if (activeTab === 'a' && !activeSubTab) {
      setActiveSubTab(assessmentSubTabs[0].key);
    } else if (activeTab === 'p' && !activeSubTab) {
      setActiveSubTab(planSubTabs[0].key);
    } else if (activeTab !== 'a' && activeTab !== 'p') {
      setActiveSubTab(null);
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full">
      {/* Compact Visit Info Header - Always Visible */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs flex-shrink-0">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {patientName && (
            <span className="font-medium text-gray-700">{patientName}</span>
          )}
          {visitDate && (
            <span className="text-gray-600">{formatDate(visitDate)}</span>
          )}
          {startTime && endTime && (
            <span className="text-gray-600">{startTime}〜{endTime}</span>
          )}
          {selectedNurses.length > 0 && (
            <span className="text-gray-600">担当: {selectedNurses.join('・')}</span>
          )}
          {diagnosis && (
            <span className="text-gray-600">{diagnosis}</span>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex">
          {mainTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex-1 px-2 py-3 min-h-[44px] text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? `${tab.badge} text-white`
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              type="button"
            >
              <span className="hidden sm:inline">{tab.fullLabel}</span>
              <span className="sm:hidden">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tabs for A and P sections */}
      {(activeTab === 'a' || activeTab === 'p') && (
        <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ WebkitOverflowScrolling: 'touch' }}>
            {(activeTab === 'a' ? assessmentSubTabs : planSubTabs).map((subTab) => (
              <button
                key={subTab.key}
                onClick={() => setActiveSubTab(subTab.key)}
                className={`px-2 py-2 sm:px-3 min-h-[44px] text-[10px] sm:text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  activeSubTab === subTab.key
                    ? 'bg-white text-primary border-b-2 border-primary'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                type="button"
              >
                {subTab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content Area - Scrollable if needed, but designed to fit */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {activeTab === 's' && (
          <div>
            <h5 className="mb-3 text-lg font-semibold">
              <span className="badge bg-primary me-2">S</span>主観
            </h5>
            <div className="ms-4">
              {renderEditableContent('s', soapOutput.s, '', true)}
            </div>
          </div>
        )}

        {activeTab === 'o' && (
          <div>
            <h5 className="mb-3 text-lg font-semibold">
              <span className="badge bg-success me-2">O</span>客観
            </h5>
            <div className="ms-4">
              {renderEditableContent('o', soapOutput.o, '', true)}
            </div>
          </div>
        )}

        {activeTab === 'a' && activeSubTab && (
          <div>
            <h5 className="mb-3 text-lg font-semibold">
              <span className="badge bg-warning me-2">A</span>アセスメント
            </h5>
            <div className="ms-4">
              <h6 className="mb-2 text-base font-medium">【{activeSubTab}】</h6>
              {renderEditableContent(`a.${activeSubTab}`, soapOutput.a[activeSubTab], '', true)}
            </div>
          </div>
        )}

        {activeTab === 'p' && activeSubTab && (
          <div>
            <h5 className="mb-3 text-lg font-semibold">
              <span className="badge bg-info me-2">P</span>計画
            </h5>
            <div className="ms-4">
              <h6 className="mb-2 text-base font-medium">【{activeSubTab}】</h6>
              {renderEditableContent(`p.${activeSubTab}`, soapOutput.p[activeSubTab], '', true)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

SOAPOutput.propTypes = {
  soapOutput: PropTypes.object.isRequired,
  planOutput: PropTypes.object,
  visitDate: PropTypes.string.isRequired,
  startTime: PropTypes.string.isRequired,
  endTime: PropTypes.string.isRequired,
  selectedNurses: PropTypes.array.isRequired,
  diagnosis: PropTypes.string.isRequired,
  patientName: PropTypes.string,
  onSoapUpdate: PropTypes.func,
  onPlanUpdate: PropTypes.func,
  status: PropTypes.oneOf(['draft', 'confirmed']),
};


