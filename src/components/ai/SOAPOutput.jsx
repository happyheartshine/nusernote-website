'use client';

import { useState } from 'react';
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
  onSoapUpdate,
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

  return (
    <div className="card">
      <div className="card-body">
        <div className="space-y-6">
          <div className="pb-4 border-b">
            <h5 className="mb-3">
              <span className="badge bg-primary me-2">S</span>主観
            </h5>
            <div className="ms-4">
              {renderEditableContent('s', soapOutput.s)}
            </div>
          </div>

          <div className="pb-4 border-b">
            <h5 className="mb-3">
              <span className="badge bg-success me-2">O</span>客観
            </h5>
            <div className="ms-4">
              {renderEditableContent('o', soapOutput.o)}
            </div>
          </div>

          <div className="pb-4 border-b">
            <h5 className="mb-3">
              <span className="badge bg-warning me-2">A</span>アセスメント
            </h5>
            <div className="ms-4 space-y-4">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-2">【症状推移】</h6>
                  {renderEditableContent('a.症状推移', soapOutput.a.症状推移)}
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-2">【リスク評価（自殺・他害・服薬）】</h6>
                  {renderEditableContent('a.リスク評価', soapOutput.a.リスク評価)}
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-2">【背景要因】</h6>
                  {renderEditableContent('a.背景要因', soapOutput.a.背景要因)}
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-2">【次回観察ポイント】</h6>
                  {renderEditableContent('a.次回観察ポイント', soapOutput.a.次回観察ポイント)}
                </div>
              </div>
            </div>
          </div>

          <div className="pb-4 border-b">
            <h5 className="mb-3">
              <span className="badge bg-info me-2">P</span>計画
            </h5>
            <div className="ms-4 space-y-4">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-2">【本日実施した援助】</h6>
                  {renderEditableContent('p.本日実施した援助', soapOutput.p.本日実施した援助)}
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-2">【次回以降の方針】</h6>
                  {renderEditableContent('p.次回以降の方針', soapOutput.p.次回以降の方針)}
                </div>
              </div>
            </div>
          </div>

          {planOutput && (
            <div className="border-t pt-4">
              <h5 className="mb-4">訪問看護計画書</h5>
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
          )}

          <div className="border-t pt-4">
            <h6 className="mb-3">【訪問情報】</h6>
            <div className="card">
              <div className="card-body">
                {visitDate && (
                  <div className="mb-2">
                    <strong>訪問日：</strong> {formatDate(visitDate)}
                  </div>
                )}
                {startTime && endTime && (
                  <div className="mb-2">
                    <strong>訪問時間：</strong> {startTime}〜{endTime}
                  </div>
                )}
                {selectedNurses.length > 0 && (
                  <div className="mb-2">
                    <strong>担当看護師：</strong> {selectedNurses.join('・')}
                  </div>
                )}
                {diagnosis && (
                  <div>
                    <strong>主疾患：</strong> {diagnosis}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
  onSoapUpdate: PropTypes.func,
  onPlanUpdate: PropTypes.func,
  status: PropTypes.oneOf(['draft', 'confirmed']),
};


