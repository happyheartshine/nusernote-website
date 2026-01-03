'use client';

import { useState } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '@/lib/supabase';
import { getSessionFromStorage } from '@/lib/sessionStorage';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export default function PDFDownloadButton({ label, endpoint, queryParams, filename, className = '' }) {
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

  const handleDownload = async () => {
    if (!BACKEND_URL) {
      setError('バックエンドURLが設定されていません');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = getSessionFromStorage();
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
      if (contentType && contentType.includes('application/pdf')) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;

        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (filenameMatch && filenameMatch[1]) {
            link.download = filenameMatch[1].replace(/['"]/g, '');
          } else {
            link.download = filename || 'download.pdf';
          }
        } else {
          link.download = filename || 'download.pdf';
        }

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        const data = await response.json();
        if (data.pdf_url) {
          const pdfResponse = await fetch(data.pdf_url);
          const blob = await pdfResponse.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename || `monthly_report_${data.s3_key?.split('/').pop() || 'download'}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        } else {
          throw new Error('PDFデータが取得できませんでした');
        }
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError(err instanceof Error ? err.message : 'PDFのダウンロード中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="btn btn-primary w-full"
        aria-label={label}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            生成中...
          </span>
        ) : (
          label
        )}
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

PDFDownloadButton.propTypes = {
  label: PropTypes.string.isRequired,
  endpoint: PropTypes.string.isRequired,
  queryParams: PropTypes.object,
  filename: PropTypes.string,
  className: PropTypes.string,
};


