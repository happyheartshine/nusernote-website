'use client';

import { useState } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '@/lib/supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export default function PDFPreviewButton({
  label = 'PDFプレビュー',
  endpoint,
  queryParams,
  onPreviewReady,
  isActive = false,
  className = '',
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const buildUrl = () => {
    let url = `${BACKEND_URL}${endpoint}`;

    if (queryParams) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      url += `?${params.toString()}`;
    }

    return url;
  };

  const handlePreview = async () => {
    if (isActive) {
      onPreviewReady(null);
      return;
    }

    if (!BACKEND_URL) {
      setError('バックエンドURLが設定されていません');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('認証が必要です。再度ログインしてください。');
        setLoading(false);
        return;
      }

      const url = buildUrl();

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.detail || `エラー: ${response.status}`);
        } else {
          throw new Error(`PDF生成に失敗しました: ${response.status}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error('PDFデータが取得できませんでした');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      onPreviewReady(blobUrl);
    } catch (err) {
      console.error('Error fetching PDF for preview:', err);
      setError(err instanceof Error ? err.message : 'PDFプレビュー中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        onClick={handlePreview}
        disabled={loading}
        className="btn btn-outline-primary w-full"
        aria-label={label}
      >
        {loading ? 'プレビュー生成中...' : label}
      </button>

      {error && (
        <div className="alert alert-danger">
          <i className="ph ph-warning-circle"></i>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

PDFPreviewButton.propTypes = {
  label: PropTypes.string,
  endpoint: PropTypes.string.isRequired,
  queryParams: PropTypes.object,
  onPreviewReady: PropTypes.func.isRequired,
  isActive: PropTypes.bool,
  className: PropTypes.string,
};


