'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PropTypes from 'prop-types';
import { fetchPatientReports, createPatientReport, deleteReport } from '@/lib/reportApi';
import ReportStatusBadge from './ReportStatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import PDFPreviewButton from '@/components/ai/PDFPreviewButton';
import PDFDownloadButton from '@/components/ai/PDFDownloadButton';

function formatYearMonth(yearMonth) {
  if (!yearMonth) return '—';
  try {
    const [year, month] = yearMonth.split('-');
    return `${year}年${parseInt(month, 10)}月`;
  } catch {
    return yearMonth;
  }
}

export default function PatientReportsModal({ patientId, patientName, isOpen, onClose }) {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState(null);
  const [previewReportId, setPreviewReportId] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPatientReports(patientId);
      const reportsList = Array.isArray(data) ? data : (data.reports || []);
      // Sort by year_month descending (newest first)
      reportsList.sort((a, b) => b.year_month.localeCompare(a.year_month));
      setReports(reportsList);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : '報告書の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && patientId) {
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, patientId]);

  const handleCreateCurrentMonth = async () => {
    try {
      setCreating(true);
      setError(null);
      
      // Get current year-month in YYYY-MM format
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // 1-12 (1-indexed)
      const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
      
      // Calculate period_start and period_end for the month
      // period_start is the first day of the month
      const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
      
      // period_end is the last day of the month
      // JavaScript Date months are 0-indexed (0=Jan, 11=Dec)
      // When month is 1-12, new Date(year, month, 0) gives last day of (month-1)
      // To get last day of current month: new Date(year, month + 1, 0)
      // Example: month=1 (Jan) -> new Date(2024, 2, 0) = Jan 31 ✓
      //          month=12 (Dec) -> new Date(2024, 13, 0) = Dec 31 ✓
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      
      // Check if report already exists for this month
      const existingReport = reports.find(r => r.year_month === yearMonth);
      if (existingReport) {
        // Navigate to edit page
        onClose();
        router.push(`/reports/${existingReport.id}/edit`);
        return;
      }

      // Create new report
      await createPatientReport(patientId, { 
        year_month: yearMonth,
        period_start: periodStart,
        period_end: periodEnd,
      });
      
      // Refresh list
      await fetchReports();
    } catch (err) {
      console.error('Error creating report:', err);
      setError(err instanceof Error ? err.message : '報告書の作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (report) => {
    setConfirmDialog({
      isOpen: true,
      title: '報告書の削除',
      message: `${formatYearMonth(report.year_month)}の報告書を削除しますか？この操作は取り消せません。`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setDeletingReportId(report.id);
        try {
          await deleteReport(report.id);
          // Refresh the reports list
          await fetchReports();
        } catch (err) {
          console.error('Delete report error:', err);
          setError(err instanceof Error ? err.message : '報告書の削除中にエラーが発生しました。');
        } finally {
          setDeletingReportId(null);
        }
      },
      onCancel: () => {
        setConfirmDialog(null);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
          confirmText="削除"
          cancelText="キャンセル"
          type="danger"
        />
      )}
      
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-w-4xl w-full rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">月次報告書一覧</h3>
              <p className="mt-1 text-sm text-gray-600">{patientName}</p>
            </div>
            <button
              onClick={onClose}
              className="btn btn-sm btn-outline-secondary"
            >
              <i className="ph ph-x me-1"></i>
              閉じる
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className={`alert alert-danger`} role="alert">
              <i className="ph ph-x-circle"></i>
              <div>{error}</div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                <button
                  onClick={handleCreateCurrentMonth}
                  disabled={creating}
                  className="btn btn-primary"
                >
                  {creating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent me-2"></div>
                      作成中...
                    </>
                  ) : (
                    <>
                      <i className="ph ph-plus me-2"></i>
                      当月の報告書を作成
                    </>
                  )}
                </button>
              </div>
              {reports.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <i className="ph ph-file-text text-4xl text-gray-400"></i>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">報告書がありません</h3>
                  <p className="mb-4 text-gray-600">この患者の月次報告書はまだ作成されていません。</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          対象月
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          ステータス
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          作成日
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {reports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatYearMonth(report.year_month)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <ReportStatusBadge status={report.status} />
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
                            {new Date(report.created_at).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  onClose();
                                  router.push(`/reports/${report.id}/edit`);
                                }}
                                className="text-blue-600 hover:text-blue-900 p-1"
                                title="編集"
                              >
                                <i className="ph ph-pencil"></i>
                              </button>
                              <button
                                onClick={() => {
                                  if (previewReportId === report.id && pdfPreviewUrl) {
                                    setPreviewReportId(null);
                                    setPdfPreviewUrl(null);
                                  } else {
                                    setPreviewReportId(report.id);
                                  }
                                }}
                                className={`p-1 ${previewReportId === report.id && pdfPreviewUrl ? 'text-green-600' : 'text-gray-600'} hover:text-green-700`}
                                title={previewReportId === report.id && pdfPreviewUrl ? 'プレビューを閉じる' : 'PDFプレビュー'}
                              >
                                <i className="ph ph-eye"></i>
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const { getSessionFromStorage } = await import('@/lib/sessionStorage');
                                    const session = getSessionFromStorage();
                                    if (!session) {
                                      alert('認証が必要です。再度ログインしてください。');
                                      return;
                                    }
                                    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
                                    const url = `${BACKEND_URL}/reports/${report.id}/pdf`;
                                    const response = await fetch(url, {
                                      method: 'GET',
                                      headers: {
                                        'Authorization': `Bearer ${session.access_token}`,
                                        'ngrok-skip-browser-warning': 'true',
                                      },
                                    });
                                    if (!response.ok) {
                                      throw new Error(`PDF生成に失敗しました: ${response.status}`);
                                    }
                                    const blob = await response.blob();
                                    const blobUrl = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = blobUrl;
                                    link.download = `report_${report.id}.pdf`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(blobUrl);
                                  } catch (err) {
                                    console.error('Error downloading PDF:', err);
                                    alert('PDFのダウンロード中にエラーが発生しました。');
                                  }
                                }}
                                className="text-gray-600 hover:text-blue-700 p-1"
                                title="PDFダウンロード"
                              >
                                <i className="ph ph-download"></i>
                              </button>
                              <button
                                onClick={() => handleDelete(report)}
                                disabled={deletingReportId === report.id}
                                className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50"
                                title="削除"
                              >
                                {deletingReportId === report.id ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                                ) : (
                                  <i className="ph ph-trash"></i>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* PDF Preview Section */}
          {previewReportId && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">PDFプレビュー</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewReportId(null);
                      setPdfPreviewUrl(null);
                    }}
                    className="btn btn-sm btn-outline-secondary"
                  >
                    閉じる
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <PDFDownloadButton
                    label="報告書 PDFをダウンロード"
                    endpoint={`/reports/${previewReportId}/pdf`}
                    filename={`report_${previewReportId}.pdf`}
                    method="GET"
                  />
                  <PDFPreviewButton
                    label={pdfPreviewUrl ? 'プレビューを閉じる' : '報告書をプレビュー'}
                    endpoint={`/reports/${previewReportId}/pdf`}
                    isActive={!!pdfPreviewUrl}
                    onPreviewReady={(url) => setPdfPreviewUrl(url)}
                    method="GET"
                  />
                </div>
                
                {pdfPreviewUrl && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-white shadow">
                    <div className="w-full" style={{ height: '600px' }}>
                      <iframe src={pdfPreviewUrl} title="PDF preview" className="w-full h-full border-0" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

PatientReportsModal.propTypes = {
  patientId: PropTypes.string.isRequired,
  patientName: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
