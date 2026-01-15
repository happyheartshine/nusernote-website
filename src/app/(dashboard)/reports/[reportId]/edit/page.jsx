'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { supabase } from '@/lib/supabase';
import {
  fetchReport,
  updateReport,
  regenerateReport,
  getReportPdfUrl,
} from '@/lib/reportApi';
import { getSessionFromStorage } from '@/lib/sessionStorage';
import ReportStatusBadge from '@/components/reports/ReportStatusBadge';
import CalendarMarksEditor from '@/components/reports/CalendarMarksEditor';
import ConfirmDialog from '@/components/ConfirmDialog';

// ==============================|| REPORT EDIT PAGE ||============================== //

export default function ReportEditPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthProfile();
  const reportId = params.reportId;
  const isMountedRef = useRef(true);

  const [report, setReport] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);

  const [formData, setFormData] = useState({
    year_month: '',
    status: 'DRAFT',
    disease_progress_text: '', // 病状の経過
    nursing_rehab_text: '', // 看護・リハビリテーションの内容 (multiline bullets)
    family_situation_text: '', // 家庭状況
    procedure_text: '', // 処置 / 衛生材料… / 必要量
    monitoring_text: '', // 特記すべき事項及びモニタリング
    gaf_score: '', // GAF score
    gaf_date: '', // GAF date
    calendar_marks: [], // Calendar marks array
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!reportId || !user?.id) return;

    const fetchData = async () => {
      try {
        if (isMountedRef.current) {
          setLoading(true);
          setError(null);
        }

        // Fetch report
        const reportData = await fetchReport(reportId);

        if (!isMountedRef.current) return;

        setReport(reportData);

        // Fetch patient
        if (reportData.patient_id) {
          const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('id', reportData.patient_id)
            .eq('user_id', user.id)
            .single();

          if (!patientError && patientData && isMountedRef.current) {
            setPatient(patientData);
          }
        }

        // Initialize form data
        if (isMountedRef.current) {
          setFormData({
            year_month: reportData.year_month || '',
            status: reportData.status || 'DRAFT',
            disease_progress_text: reportData.disease_progress_text || '',
            nursing_rehab_text: reportData.nursing_rehab_text || '',
            family_situation_text: reportData.family_situation_text || '',
            procedure_text: reportData.procedure_text || '',
            monitoring_text: reportData.monitoring_text || '',
            gaf_score: reportData.gaf_score || '',
            gaf_date: reportData.gaf_date || '',
            calendar_marks: reportData.calendar_marks || [],
          });
        }
      } catch (err) {
        console.error('Error fetching report:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : '報告書の取得に失敗しました');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [reportId, user?.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCalendarMarksChange = (marks) => {
    setFormData(prev => ({
      ...prev,
      calendar_marks: marks,
    }));
  };

  const handleSave = async () => {
    if (!report) return;

    if (isMountedRef.current) {
      setSaving(true);
      setError(null);
    }

    try {
      const updateData = {
        year_month: formData.year_month,
        disease_progress_text: formData.disease_progress_text || null,
        nursing_rehab_text: formData.nursing_rehab_text || null,
        family_situation_text: formData.family_situation_text || null,
        procedure_text: formData.procedure_text || null,
        monitoring_text: formData.monitoring_text || null,
        gaf_score: formData.gaf_score || null,
        gaf_date: formData.gaf_date || null,
        calendar_marks: formData.calendar_marks || [],
      };

      const updatedReport = await updateReport(reportId, updateData);

      if (isMountedRef.current) {
        setReport(updatedReport);
        setError(null);
        alert('保存しました');
      }
    } catch (err) {
      console.error('Error updating report:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '保存に失敗しました');
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleRegenerate = async () => {
    if (!report) return;

    if (isMountedRef.current) {
      setSaving(true);
      setError(null);
    }

    try {
      await regenerateReport(reportId);
      
      // Refetch report to get updated data
      const updatedReport = await fetchReport(reportId);

      if (isMountedRef.current) {
        setReport(updatedReport);
        setFormData(prev => ({
          ...prev,
          disease_progress_text: updatedReport.disease_progress_text || prev.disease_progress_text,
          nursing_rehab_text: updatedReport.nursing_rehab_text || prev.nursing_rehab_text,
          family_situation_text: updatedReport.family_situation_text || prev.family_situation_text,
          procedure_text: updatedReport.procedure_text || prev.procedure_text,
          monitoring_text: updatedReport.monitoring_text || prev.monitoring_text,
          gaf_score: updatedReport.gaf_score || prev.gaf_score,
          gaf_date: updatedReport.gaf_date || prev.gaf_date,
          calendar_marks: updatedReport.calendar_marks || prev.calendar_marks,
        }));
        alert('自動生成/再集計を実行しました');
      }
    } catch (err) {
      console.error('Error regenerating report:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '自動生成/再集計に失敗しました');
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handlePdfExport = async () => {
    if (!report) return;

    try {
      const session = getSessionFromStorage();
      if (!session) {
        if (isMountedRef.current) {
          setError('認証が必要です。再度ログインしてください。');
        }
        return;
      }

      const pdfUrl = getReportPdfUrl(reportId);

      // Open PDF in new tab
      window.open(pdfUrl, '_blank');
    } catch (err) {
      console.error('Error exporting PDF:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'PDF出力に失敗しました');
      }
    }
  };

  const handleFinalize = async () => {
    if (!report) return;

    if (isMountedRef.current) {
      setSaving(true);
      setError(null);
    }

    try {
      const updateData = {
        status: 'FINAL',
      };

      const updatedReport = await updateReport(reportId, updateData);

      if (isMountedRef.current) {
        setReport(updatedReport);
        setFormData(prev => ({ ...prev, status: 'FINAL' }));
        setShowFinalizeDialog(false);
        alert('報告書を確定しました');
      }
    } catch (err) {
      console.error('Error finalizing report:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '確定に失敗しました');
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  // Fetch visits for the month (for calendar marks)
  const [visits, setVisits] = useState([]);
  useEffect(() => {
    if (!report?.patient_id || !formData.year_month) return;

    const fetchVisits = async () => {
      try {
        const [year, month] = formData.year_month.split('-').map(Number);
        const startDate = `${formData.year_month}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

        // Fetch visits from Supabase (soap_records table)
        const { data, error } = await supabase
          .from('soap_records')
          .select('visit_date')
          .eq('patient_id', report.patient_id)
          .eq('user_id', user.id)
          .gte('visit_date', startDate)
          .lte('visit_date', endDate)
          .order('visit_date', { ascending: true });

        if (!error && data) {
          setVisits(data);
        }
      } catch (err) {
        console.error('Error fetching visits:', err);
      }
    };

    fetchVisits();
  }, [report?.patient_id, formData.year_month]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className={`alert alert-danger`} role="alert">
          <i className="ph ph-x-circle"></i>
          <div>{error}</div>
        </div>
        <button onClick={() => router.back()} className="btn btn-secondary mt-4">
          戻る
        </button>
      </div>
    );
  }

  const isReadOnly = report?.status === 'FINAL';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">月次報告書編集</h1>
          <p className="mt-2 text-gray-600">月次報告書の編集</p>
        </div>
        <div className="flex gap-2">
          {report && (
            <>
              <button
                onClick={handlePdfExport}
                className="btn btn-outline-secondary"
              >
                <i className="ph ph-file-pdf me-2"></i>
                PDF出力（1ページ）
              </button>
              {!isReadOnly && (
                <>
                  <button
                    onClick={handleRegenerate}
                    disabled={saving}
                    className="btn btn-outline-secondary"
                  >
                    {saving ? (
                      <span className="flex items-center">
                        <span className="me-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"></span>
                        処理中...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <i className="ph ph-magic-wand me-2"></i>
                        自動生成/再集計
                      </span>
                    )}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                  >
                    {saving ? (
                      <span className="flex items-center">
                        <span className="me-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                        保存中...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <i className="ph ph-check me-2"></i>
                        保存
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowFinalizeDialog(true)}
                    disabled={saving}
                    className="btn btn-success"
                  >
                    <i className="ph ph-check-circle me-2"></i>
                    確定（FINAL）
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className={`alert mb-6 alert-danger`} role="alert">
          <i className="ph ph-x-circle"></i>
          <div>{error}</div>
        </div>
      )}

      {report?.status === 'FINAL' && (
        <div className={`alert mb-6 alert-warning`} role="alert">
          <i className="ph ph-warning-circle"></i>
          <div>
            <strong>この報告書は確定済みです</strong>
            <p className="mt-1 text-sm">編集するには、ステータスを変更する必要があります。</p>
          </div>
        </div>
      )}

      {report && (
        <>
          {/* Patient Header (Read-only) */}
          {patient && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">患者情報</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">患者名</label>
                  <div className="mt-1 text-gray-900">{patient.name || '—'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">性別</label>
                  <div className="mt-1 text-gray-900">
                    {patient.gender === 'male' ? '男性' : patient.gender === 'female' ? '女性' : '—'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">生年月日</label>
                  <div className="mt-1 text-gray-900">{patient.birth_date || '—'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">住所</label>
                  <div className="mt-1 text-gray-900">{patient.address || '—'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">連絡先</label>
                  <div className="mt-1 text-gray-900">{patient.contact || '—'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">主たる傷病名</label>
                  <div className="mt-1 text-gray-900">{patient.primary_diagnosis || patient.main_disease || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Month Selector + Status */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">対象月・ステータス</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="year_month" className="mb-2 block text-sm font-medium text-gray-700">
                  対象月
                </label>
                <input
                  id="year_month"
                  type="month"
                  name="year_month"
                  value={formData.year_month}
                  onChange={handleInputChange}
                  className="form-control"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">ステータス</label>
                <div className="mt-1">
                  <ReportStatusBadge status={formData.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Marks Editor */}
          {formData.year_month && (
            <div className="mb-6">
              <CalendarMarksEditor
                yearMonth={formData.year_month}
                marks={formData.calendar_marks}
                visits={visits}
                onChange={handleCalendarMarksChange}
                readOnly={isReadOnly}
              />
            </div>
          )}

          {/* Text Blocks */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">報告内容</h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="disease_progress_text" className="mb-2 block text-sm font-medium text-gray-700">
                  病状の経過
                </label>
                <textarea
                  id="disease_progress_text"
                  name="disease_progress_text"
                  value={formData.disease_progress_text}
                  onChange={handleInputChange}
                  rows={4}
                  className="form-control"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <label htmlFor="nursing_rehab_text" className="mb-2 block text-sm font-medium text-gray-700">
                  看護・リハビリテーションの内容
                </label>
                <textarea
                  id="nursing_rehab_text"
                  name="nursing_rehab_text"
                  value={formData.nursing_rehab_text}
                  onChange={handleInputChange}
                  rows={6}
                  className="form-control"
                  placeholder="箇条書きで入力してください（例：&#10;・内容1&#10;・内容2）"
                  disabled={isReadOnly}
                />
                <p className="mt-1 text-xs text-gray-500">箇条書き形式で入力してください</p>
              </div>

              <div>
                <label htmlFor="family_situation_text" className="mb-2 block text-sm font-medium text-gray-700">
                  家庭状況
                </label>
                <textarea
                  id="family_situation_text"
                  name="family_situation_text"
                  value={formData.family_situation_text}
                  onChange={handleInputChange}
                  rows={4}
                  className="form-control"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <label htmlFor="procedure_text" className="mb-2 block text-sm font-medium text-gray-700">
                  処置 / 衛生材料… / 必要量
                </label>
                <textarea
                  id="procedure_text"
                  name="procedure_text"
                  value={formData.procedure_text}
                  onChange={handleInputChange}
                  rows={4}
                  className="form-control"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <label htmlFor="monitoring_text" className="mb-2 block text-sm font-medium text-gray-700">
                  特記すべき事項及びモニタリング
                </label>
                <textarea
                  id="monitoring_text"
                  name="monitoring_text"
                  value={formData.monitoring_text}
                  onChange={handleInputChange}
                  rows={4}
                  className="form-control"
                  disabled={isReadOnly}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="gaf_score" className="mb-2 block text-sm font-medium text-gray-700">
                    GAF score
                  </label>
                  <input
                    id="gaf_score"
                    type="number"
                    name="gaf_score"
                    value={formData.gaf_score}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="form-control"
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label htmlFor="gaf_date" className="mb-2 block text-sm font-medium text-gray-700">
                    GAF score 評価日
                  </label>
                  <input
                    id="gaf_date"
                    type="date"
                    name="gaf_date"
                    value={formData.gaf_date}
                    onChange={handleInputChange}
                    className="form-control"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Finalize Dialog */}
      {showFinalizeDialog && (
        <ConfirmDialog
          isOpen={showFinalizeDialog}
          title="報告書を確定しますか？"
          message="この報告書を確定（FINAL）にしますか？確定後は編集できなくなります。"
          onConfirm={handleFinalize}
          onCancel={() => setShowFinalizeDialog(false)}
          confirmText="確定"
          cancelText="キャンセル"
          type="warning"
        />
      )}
    </div>
  );
}
