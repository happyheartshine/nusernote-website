'use client';

import { useState } from 'react';
import PropTypes from 'prop-types';

// ==============================|| PLAN OUTPUT ||============================== //

export default function PlanOutput({
  planOutput,
  visitDate,
  patientName,
  diagnosis,
  onPlanUpdate,
  status = 'draft',
}) {
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  const isEditable = status === 'draft';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}（${weekday}）`;
  };

  const handleEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const handleSave = () => {
    if (!editingField || !planOutput) return;
    
    const subField = editingField.replace('plan.', '');
    const updated = { ...planOutput, [subField]: editValue };
    onPlanUpdate?.(updated);

    setEditingField(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const renderEditableContent = (field, value, className = '') => {
    const isEditing = editingField === field;
    const displayValue = value || '（未入力）';

    if (isEditing) {
      return (
        <div className="space-y-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="form-control"
            rows={4}
            autoFocus
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
        <p className={`whitespace-pre-wrap leading-7 ${isEditable ? 'pr-7' : ''} ${className}`}>{displayValue}</p>
        {isEditable && (
          <button
            onClick={() => handleEdit(field, value)}
            className="absolute bottom-1 right-1 p-1"
            title="編集"
            type="button"
          >
            <i className="ph ph-pencil text-muted"></i>
          </button>
        )}
      </div>
    );
  };

  if (!planOutput) {
    return (
      <div className="card">
        <div className="card-body">
          <p className="text-muted">計画書データがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="space-y-6">
          <div className="pb-4 border-b">
            <h5 className="mb-4">訪問看護計画書</h5>
            {patientName && (
              <div className="mb-2">
                <strong>利用者：</strong> {patientName}
              </div>
            )}
            {visitDate && (
              <div className="mb-2">
                <strong>訪問日：</strong> {formatDate(visitDate)}
              </div>
            )}
            {diagnosis && (
              <div className="mb-2">
                <strong>主疾患：</strong> {diagnosis}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="card">
              <div className="card-body">
                <h6 className="mb-2">【長期目標】</h6>
                {renderEditableContent('plan.長期目標', planOutput.長期目標)}
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <h6 className="mb-2">【短期目標】</h6>
                {renderEditableContent('plan.短期目標', planOutput.短期目標)}
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <h6 className="mb-2">【看護援助の方針】</h6>
                {renderEditableContent('plan.看護援助の方針', planOutput.看護援助の方針)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

PlanOutput.propTypes = {
  planOutput: PropTypes.object,
  visitDate: PropTypes.string,
  patientName: PropTypes.string,
  diagnosis: PropTypes.string,
  onPlanUpdate: PropTypes.func,
  status: PropTypes.oneOf(['draft', 'confirmed']),
};
