'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { supabase } from '@/lib/supabase';
import { fetchAllReports, deleteReport } from '@/lib/reportApi';
import ReportStatusBadge from '@/components/reports/ReportStatusBadge';
import ReportCard from '@/components/reports/ReportCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import PDFPreviewButton from '@/components/ai/PDFPreviewButton';
import PDFDownloadButton from '@/components/ai/PDFDownloadButton';

// ==============================|| REPORTS LIST PAGE ||============================== //

function formatYearMonth(yearMonth) {
  if (!yearMonth) return '—';
  try {
    const [year, month] = yearMonth.split('-');
    return `${year}年${parseInt(month, 10)}月`;
  } catch {
    return yearMonth;
  }
}

export default function ReportsListPage() {
  const router = useRouter();
  const { user } = useAuthProfile();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState(null);
  const [previewReportId, setPreviewReportId] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  // Fetch all reports
  const fetchReports = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Try backend API first
      try {
        const data = await fetchAllReports();
        const reportsList = Array.isArray(data) ? data : (data.reports || []);
        
        // Fetch patient names for each report
        const reportsWithPatients = await Promise.all(
          reportsList.map(async (report) => {
            if (report.patient_id) {
              try {
                const { data: patientData } = await supabase
                  .from('patients')
                  .select('name')
                  .eq('id', report.patient_id)
                  .eq('user_id', user.id)
                  .single();
                
                return {
                  ...report,
                  patient_name: patientData?.name || '不明',
                };
              } catch {
                return {
                  ...report,
                  patient_name: '不明',
                };
              }
            }
            return {
              ...report,
              patient_name: '不明',
            };
          })
        );

        setReports(reportsWithPatients);
      } catch (apiError) {
        console.warn('Backend API failed, trying Supabase direct:', apiError);
        
        // Fallback: Fetch from Supabase directly
        const { data, error: supabaseError } = await supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .order('year_month', { ascending: false });

        if (supabaseError) throw supabaseError;

        // Fetch patient names
        const reportsWithPatients = await Promise.all(
          (data || []).map(async (report) => {
            if (report.patient_id) {
              try {
                const { data: patientData } = await supabase
                  .from('patients')
                  .select('name')
                  .eq('id', report.patient_id)
                  .eq('user_id', user.id)
                  .single();
                
                return {
                  ...report,
                  patient_name: patientData?.name || '不明',
                };
              } catch {
                return {
                  ...report,
                  patient_name: '不明',
                };
              }
            }
            return {
              ...report,
              patient_name: '不明',
            };
          })
        );

        setReports(reportsWithPatients);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : '報告書の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Filter reports
  useEffect(() => {
    let filtered = [...reports];

    // Filter by patient name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report =>
        (report.patient_name || '').toLowerCase().includes(query)
      );
    }

    // Filter by month
    if (monthFilter) {
      filtered = filtered.filter(report => report.year_month === monthFilter);
    }

    setFilteredReports(filtered);
  }, [reports, searchQuery, monthFilter]);

  const handleDelete = (report) => {
    setConfirmDialog({
      isOpen: true,
      title: '報告書の削除',
      message: `「${report.patient_name}」の${formatYearMonth(report.year_month)}の報告書を削除しますか？この操作は取り消せません。`,
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

  // Generate month options (last 12 months)
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      options.push({ value: yearMonth, label });
    }
    return options;
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

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
      
      <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">月次報告書一覧</h1>
            <p className="mt-2 text-gray-600">月次報告書の管理</p>
          </div>
        </div>

        {error && (
          <div className={`alert mb-6 alert-danger`} role="alert">
            <i className="ph ph-x-circle"></i>
            <div>{error}</div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="search-patient" className="mb-2 block text-sm font-medium text-gray-700">
                患者名で検索
              </label>
              <input
                id="search-patient"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="患者名を入力..."
                className="form-control"
              />
            </div>
            <div>
              <label htmlFor="filter-month" className="mb-2 block text-sm font-medium text-gray-700">
                対象月で絞り込み
              </label>
              <select
                id="filter-month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="form-control"
              >
                <option value="">すべて</option>
                {getMonthOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <i className="ph ph-file-text text-4xl text-gray-400"></i>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">報告書がありません</h3>
            <p className="text-gray-600">
              {searchQuery || monthFilter
                ? '検索条件に一致する報告書が見つかりませんでした。'
                : '月次報告書はまだ作成されていません。'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: Table View */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      患者名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      対象月
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      作成日
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {report.patient_name || '不明'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatYearMonth(report.year_month)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ReportStatusBadge status={report.status || 'DRAFT'} />
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                        {report.created_at
                          ? new Date(report.created_at).toLocaleDateString('ja-JP')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/reports/${report.id}/edit`)}
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

            {/* Mobile: Card View */}
            <div className="md:hidden space-y-4">
              {filteredReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onEdit={(report) => router.push(`/reports/${report.id}/edit`)}
                  onDelete={handleDelete}
                  onPreview={(report) => {
                    if (previewReportId === report.id && pdfPreviewUrl) {
                      setPreviewReportId(null);
                      setPdfPreviewUrl(null);
                    } else {
                      setPreviewReportId(report.id);
                    }
                  }}
                  onDownload={async (report) => {
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
                  isPreviewActive={previewReportId === report.id && !!pdfPreviewUrl}
                  isDeleting={deletingReportId === report.id}
                />
              ))}
            </div>
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
    </>
  );
}
