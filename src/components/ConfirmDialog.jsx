'use client';

import PropTypes from 'prop-types';

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmText = '確認', cancelText = 'キャンセル', type = 'warning' }) {
  if (!isOpen) return null;

  const alertClass = type === 'danger' ? 'alert-danger' : 'alert-warning';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className={`alert ${alertClass} max-w-md w-full shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <i className={`ph ${type === 'danger' ? 'ph-warning-circle' : 'ph-warning'}`}></i>
        <div className="flex-1 min-w-0">
          {title && <h4 className="alert-heading mb-2 font-semibold">{title}</h4>}
          <p className="mb-4 text-sm">{message}</p>
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={onCancel} className="btn btn-outline-secondary btn-sm">
              {cancelText}
            </button>
            <button onClick={onConfirm} className={`btn btn-sm ${type === 'danger' ? 'btn-danger' : 'btn-warning'}`}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  type: PropTypes.oneOf(['warning', 'danger'])
};

