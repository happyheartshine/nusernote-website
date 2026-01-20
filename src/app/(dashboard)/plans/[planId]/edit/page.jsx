'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { supabase } from '@/lib/supabase';
import { fetchPlan, updatePlan, hospitalizePlan, autoEvaluatePlan, getPlanPdfUrl } from '@/lib/planApi';
import { getSessionFromStorage } from '@/lib/sessionStorage';
import PlanStatusBadge from '@/components/plans/PlanStatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import Stepper from '@/components/Stepper';
import StepperNavigation from '@/components/StepperNavigation';

// ==============================|| PLAN EDIT PAGE ||============================== //

const DEFAULT_PLAN_ITEMS = [
  { label: '長期目標', key: 'LONG_TERM' },
  { label: '短期目標', key: 'SHORT_TERM' },
  { label: '看護援助の方針', key: 'POLICY' },
  { label: '訪問看護の具体的内容', key: 'SPECIFIC_CONTENT' },
  { label: '生活リズム及び日中の活動状況', key: 'LIFE_RHYTHM' },
];

export default function PlanEditPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthProfile();
  const planId = params.planId;
  const isMountedRef = useRef(true);

  const [plan, setPlan] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showHospitalizeModal, setShowHospitalizeModal] = useState(false);
  const [hospitalizeData, setHospitalizeData] = useState({
    hospitalized_at: '',
    note: '',
  });

  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    long_term_goal: '',
    short_term_goal: '',
    policy: '',
    patient_family_wish: '',
    items: [],
    evaluations: [],
    care_supplies: [],
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!planId || !user?.id) return;

    const fetchData = async () => {
      try {
        if (isMountedRef.current) {
          setLoading(true);
          setError(null);
        }

        // Fetch plan
        const planData = await fetchPlan(planId);
        
        if (!isMountedRef.current) return;

        setPlan(planData);

        // Fetch patient
        if (planData.patient_id) {
          const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('id', planData.patient_id)
            .eq('user_id', user.id)
            .single();

          if (!patientError && patientData && isMountedRef.current) {
            setPatient(patientData);
          }
        }

        // Initialize form data
        const items = planData.items || [];
        // Ensure default items exist
        const defaultItemsMap = new Map();
        DEFAULT_PLAN_ITEMS.forEach((item, index) => {
          defaultItemsMap.set(item.key, {
            id: null,
            item_key: item.key,
            label: item.label,
            observation: '',
            assistance: '',
            sort_order: index + 1,
          });
        });

        // Merge existing items with defaults (map backend fields to form fields)
        items.forEach((item) => {
          const key = item.item_key || item.label;
          defaultItemsMap.set(key, {
            id: item.id,
            item_key: item.item_key || key,
            label: item.label,
            observation: item.observation_text || '',
            assistance: item.assistance_text || '',
            sort_order: item.sort_order || defaultItemsMap.size + 1,
          });
        });

        // Normalize evaluations from backend to form shape
        const normalizedEvaluations = (planData.evaluations || []).map((ev, index) => ({
          id: ev.id,
          evaluation_slot: ev.evaluation_slot ?? index + 1,
          evaluation_date: ev.evaluation_date || '',
          result: ev.result || 'NONE',
          note: ev.note || '',
        }));

        if (isMountedRef.current) {
          setFormData({
            start_date: planData.start_date || '',
            end_date: planData.end_date || '',
            long_term_goal: planData.long_term_goal || '',
            short_term_goal: planData.short_term_goal || '',
            policy: planData.nursing_policy || '',
            patient_family_wish: planData.patient_family_wish || '',
            has_procedure: planData.has_procedure || false,
            procedure_content: planData.procedure_content || '',
            material_details: planData.material_details || '',
            material_amount: planData.material_amount || '',
            procedure_note: planData.procedure_note || '',
            items: Array.from(defaultItemsMap.values()),
            evaluations: normalizedEvaluations,
            care_supplies: planData.care_supplies || [],
          });
        }
      } catch (err) {
        console.error('Error fetching plan:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : '計画書の取得に失敗しました');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [planId, user?.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleEvaluationChange = (index, field, value) => {
    setFormData(prev => {
      const newEvaluations = [...prev.evaluations];
      newEvaluations[index] = { ...newEvaluations[index], [field]: value };
      return { ...prev, evaluations: newEvaluations };
    });
  };

  const handleAddEvaluation = () => {
    setFormData(prev => ({
      ...prev,
      evaluations: [
        ...prev.evaluations,
        {
          evaluation_slot: prev.evaluations.length + 1,
          evaluation_date: '',
          result: 'NONE',
          note: '',
        }
      ]
    }));
  };

  // Stepper configuration
  const steps = [
    { label: '計画期間', shortLabel: '期間' },
    { label: '目標・方針', shortLabel: '目標' },
    { label: '計画項目', shortLabel: '項目' },
    { label: '3ヶ月評価', shortLabel: '評価' },
    { label: '処置・材料', shortLabel: '処置' },
    { label: '計画終了', shortLabel: '終了' },
  ];

  // Step validation
  const validateStep = (step) => {
    switch (step) {
      case 0: // Plan Period
        return !!formData.start_date && !!formData.end_date;
      case 1: // Goals & Policy (optional)
        return true;
      case 2: // Plan Items (optional)
        return true;
      case 3: // Evaluations (optional)
        return true;
      case 4: // Procedures (optional)
        return true;
      case 5: // Hospitalization (optional)
        return true;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep) && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!plan || plan.status !== 'ACTIVE') {
      if (isMountedRef.current) {
        setError('この計画書は編集できません');
      }
      return;
    }

    if (isMountedRef.current) {
      setSaving(true);
      setError(null);
    }

    try {
      const updateData = {
        start_date: formData.start_date,
        end_date: formData.end_date,
        long_term_goal: formData.long_term_goal || null,
        short_term_goal: formData.short_term_goal || null,
        nursing_policy: formData.policy || null,
        patient_family_wish: formData.patient_family_wish || null,
        has_procedure: formData.has_procedure || false,
        procedure_content: formData.procedure_content || null,
        material_details: formData.material_details || null,
        material_amount: formData.material_amount || null,
        procedure_note: formData.procedure_note || null,
        items: formData.items
          .filter((item) => item.item_key) // Filter out items without item_key
          .map((item) => ({
            id: item.id || null,
            item_key: item.item_key,
            label: item.label || '',
            observation_text: item.observation || null,
            assistance_text: item.assistance || null,
            sort_order: item.sort_order || 0,
          })),
        evaluations: formData.evaluations
          .filter((evaluation) => {
            // Filter out evaluations without slot or without date (required by database)
            return evaluation.evaluation_slot != null && evaluation.evaluation_date && evaluation.evaluation_date.trim() !== '';
          })
          .map((evaluation, index) => ({
            id: evaluation.id || null,
            evaluation_slot: evaluation.evaluation_slot ?? index + 1,
            evaluation_date: evaluation.evaluation_date.trim(),
            result: evaluation.result || 'NONE',
            note: evaluation.note || null,
          })),
      };

      const updatedPlan = await updatePlan(planId, updateData);
      
      if (isMountedRef.current) {
        setPlan(updatedPlan);
        setError(null);
        // Show success message
        alert('保存しました');
      }
    } catch (err) {
      console.error('Error updating plan:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '保存に失敗しました');
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleAutoEvaluate = async () => {
    if (!plan) return;

    if (isMountedRef.current) {
      setSaving(true);
      setError(null);
    }

    try {
      await autoEvaluatePlan(planId);
      // Refetch plan to get updated evaluations
      const updatedPlan = await fetchPlan(planId);
      
      if (isMountedRef.current) {
        setPlan(updatedPlan);
        setFormData(prev => ({
          ...prev,
          evaluations: updatedPlan.evaluations || prev.evaluations
        }));
        alert('自動判定を実行しました');
      }
    } catch (err) {
      console.error('Error auto-evaluating:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '自動判定に失敗しました');
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleHospitalize = async () => {
    if (!hospitalizeData.hospitalized_at) {
      if (isMountedRef.current) {
        setError('入院日を入力してください');
      }
      return;
    }

    if (isMountedRef.current) {
      setSaving(true);
      setError(null);
    }

    try {
      await hospitalizePlan(planId, {
        hospitalized_at: hospitalizeData.hospitalized_at,
        note: hospitalizeData.note || null,
      });

      // Refetch plan
      const updatedPlan = await fetchPlan(planId);
      
      if (isMountedRef.current) {
        setPlan(updatedPlan);
        setShowHospitalizeModal(false);
        setHospitalizeData({ hospitalized_at: '', note: '' });
        alert('計画書を終了しました（入院により終了）');
      }
    } catch (err) {
      console.error('Error hospitalizing plan:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '計画書の終了に失敗しました');
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handlePdfExport = async () => {
    if (!plan) return;

    try {
      const session = getSessionFromStorage();
      if (!session) {
        if (isMountedRef.current) {
          setError('認証が必要です。再度ログインしてください。');
        }
        return;
      }

      const pdfUrl = getPlanPdfUrl(planId);
      
      // Fetch PDF with auth token
      const response = await fetch(pdfUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!response.ok) {
        throw new Error(`PDF生成に失敗しました: ${response.status}`);
      }

      // Get PDF blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plan_${planId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'PDF出力に失敗しました');
      }
    }
  };

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

  if (error && !plan) {
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

  const isReadOnly = plan?.status !== 'ACTIVE';
  const hospitalization = plan?.hospitalizations?.[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">計画書編集</h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600">訪問看護計画書の編集</p>
        </div>
        {plan && (
          <div className="flex flex-col gap-2 md:flex-row md:gap-2">
            <button
              onClick={handlePdfExport}
              className="btn btn-outline-secondary w-full md:w-auto"
            >
              <i className="ph ph-file-pdf me-2"></i>
              <span className="hidden sm:inline">PDF出力（1ページ）</span>
              <span className="sm:hidden">PDF出力</span>
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary w-full md:w-auto"
              >
                {saving ? (
                  <span className="flex items-center justify-center">
                    <span className="me-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    保存中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <i className="ph ph-check me-2"></i>
                    保存
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className={`alert mb-6 alert-danger`} role="alert">
          <i className="ph ph-x-circle"></i>
          <div>{error}</div>
        </div>
      )}

      {plan?.status === 'ENDED_BY_HOSPITALIZATION' && (
        <div className={`alert mb-6 alert-warning`} role="alert">
          <i className="ph ph-warning-circle"></i>
          <div>
            <strong>入院のため計画は終了しました</strong>
            {hospitalization && (
              <div className="mt-1 text-sm">
                入院日: {hospitalization.hospitalized_at}
                {hospitalization.note && ` - ${hospitalization.note}`}
              </div>
            )}
          </div>
        </div>
      )}

      {plan && (
        <>
          {/* Patient Header (Read-only) */}
          {patient && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
              <details className="group">
                <summary className="cursor-pointer text-xl font-semibold text-gray-900 list-none">
                  <div className="flex items-center justify-between">
                    <span>患者情報</span>
                    <i className="ph ph-caret-down group-open:rotate-180 transition-transform"></i>
                  </div>
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    <div className="mt-1 text-gray-900">{patient.primary_diagnosis || '—'}</div>
                  </div>
                  {patient.key_person_name && (
                    <div className="md:col-span-2">
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700">
                          キーパーソン情報
                        </summary>
                        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                          <div>氏名: {patient.key_person_name}</div>
                          <div>続柄: {patient.key_person_relationship || '—'}</div>
                          <div>住所: {patient.key_person_address || '—'}</div>
                          <div>連絡先: {patient.key_person_contact1 || '—'}</div>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}

          {/* Stepper Form */}
          <div className="mb-6 rounded-lg bg-white shadow" style={{ minHeight: 'calc(100vh - 200px)' }}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">計画書編集</h2>
                <button
                  onClick={() => router.back()}
                  className="btn btn-sm btn-outline-secondary"
                  disabled={saving}
                >
                  <i className="ph ph-x me-1"></i>
                  キャンセル
                </button>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
              <Stepper steps={steps} currentStep={currentStep}>
                <div className="p-4 md:p-6">
                  {/* Step 0: Plan Period & Status */}
                  {currentStep === 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">計画期間・ステータス</h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <label htmlFor="start_date" className="mb-2 block text-sm font-medium text-gray-700">
                            開始日 <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="start_date"
                            type="date"
                            name="start_date"
                            value={formData.start_date}
                            onChange={handleInputChange}
                            className="form-control"
                            disabled={isReadOnly}
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="end_date" className="mb-2 block text-sm font-medium text-gray-700">
                            終了日 <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="end_date"
                            type="date"
                            name="end_date"
                            value={formData.end_date}
                            onChange={handleInputChange}
                            className="form-control"
                            disabled={isReadOnly}
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">ステータス</label>
                          <div className="mt-1">
                            <PlanStatusBadge status={plan.status} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 1: Goals & Policy */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">目標・方針</h3>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="long_term_goal" className="mb-2 block text-sm font-medium text-gray-700">
                            看護の目標（長期目標）
                          </label>
                          <textarea
                            id="long_term_goal"
                            name="long_term_goal"
                            value={formData.long_term_goal}
                            onChange={handleInputChange}
                            rows={3}
                            className="form-control"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <label htmlFor="short_term_goal" className="mb-2 block text-sm font-medium text-gray-700">
                            短期目標
                          </label>
                          <textarea
                            id="short_term_goal"
                            name="short_term_goal"
                            value={formData.short_term_goal}
                            onChange={handleInputChange}
                            rows={2}
                            className="form-control"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <label htmlFor="policy" className="mb-2 block text-sm font-medium text-gray-700">
                            看護援助の方針
                          </label>
                          <textarea
                            id="policy"
                            name="policy"
                            value={formData.policy}
                            onChange={handleInputChange}
                            rows={3}
                            className="form-control"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <label htmlFor="patient_family_wish" className="mb-2 block text-sm font-medium text-gray-700">
                            利用者・家族の希望
                          </label>
                          <textarea
                            id="patient_family_wish"
                            name="patient_family_wish"
                            value={formData.patient_family_wish}
                            onChange={handleInputChange}
                            rows={2}
                            className="form-control"
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Plan Items */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">計画項目</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase w-1/4">
                                項目
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                観察内容
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                援助内容
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {formData.items.map((item, index) => (
                              <tr key={index}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {item.label}
                                </td>
                                <td className="px-4 py-3">
                                  <textarea
                                    value={item.observation || ''}
                                    onChange={(e) => handleItemChange(index, 'observation', e.target.value)}
                                    rows={2}
                                    className="form-control w-full"
                                    disabled={isReadOnly}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <textarea
                                    value={item.assistance || ''}
                                    onChange={(e) => handleItemChange(index, 'assistance', e.target.value)}
                                    rows={2}
                                    className="form-control w-full"
                                    disabled={isReadOnly}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Step 3: 3-month Evaluations */}
                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-700">3ヶ月評価</h3>
                        {!isReadOnly && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleAutoEvaluate}
                              disabled={saving}
                              className="btn btn-outline-secondary btn-sm"
                            >
                              <i className="ph ph-magic-wand me-1"></i>
                              自動判定を実行
                            </button>
                            <button
                              type="button"
                              onClick={handleAddEvaluation}
                              disabled={isReadOnly}
                              className="btn btn-outline-secondary btn-sm"
                            >
                              <i className="ph ph-plus me-1"></i>
                              評価枠を追加
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {formData.evaluations.map((evaluation, index) => (
                          <div key={index} className="rounded-lg border border-gray-200 p-4">
                            <div className="space-y-3">
                              <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                  評価日
                                </label>
                                <input
                                  type="date"
                                  value={evaluation.evaluation_date || ''}
                                  onChange={(e) => handleEvaluationChange(index, 'evaluation_date', e.target.value)}
                                  className="form-control"
                                  disabled={isReadOnly}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                  結果
                                </label>
                                <div className="flex gap-4">
                                  {['NONE', 'CIRCLE', 'CHECK'].map((result) => (
                                    <label key={result} className="flex items-center">
                                      <input
                                        type="radio"
                                        name={`evaluation-${index}`}
                                        value={result}
                                        checked={evaluation.result === result}
                                        onChange={(e) => handleEvaluationChange(index, 'result', e.target.value)}
                                        className="form-check-input input-primary me-1"
                                        disabled={isReadOnly}
                                      />
                                      <span className="text-sm text-gray-700">
                                        {result === 'NONE' ? '未評価' : result === 'CIRCLE' ? '◯' : '☑️'}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                  備考
                                </label>
                                <textarea
                                  value={evaluation.note || ''}
                                  onChange={(e) => handleEvaluationChange(index, 'note', e.target.value)}
                                  rows={2}
                                  className="form-control"
                                  disabled={isReadOnly}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Procedure/Materials */}
                  {currentStep === 4 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">処置・材料</h3>
                      {formData.care_supplies && formData.care_supplies.length > 0 ? (
                        formData.care_supplies.map((supply, index) => (
                          <div key={index} className="space-y-4 rounded-lg border border-gray-200 p-4">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-700">
                                処置内容
                              </label>
                              <div className="text-gray-900">{supply.procedure_content || '—'}</div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                  材料の種類・サイズ
                                </label>
                                <div className="text-gray-900">{supply.material_type_size || '—'}</div>
                              </div>
                              <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                  必要数量
                                </label>
                                <div className="text-gray-900">{supply.required_amount || '—'}</div>
                              </div>
                            </div>
                            {supply.remark && (
                              <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                  備考
                                </label>
                                <div className="text-gray-900">{supply.remark}</div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          処置・材料の情報はありません
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 5: Hospitalization */}
                  {currentStep === 5 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">計画終了</h3>
                      {!isReadOnly ? (
                        <div className="rounded-lg border border-gray-200 p-6">
                          <p className="mb-4 text-gray-700">
                            入院により計画書を終了する場合は、以下のボタンをクリックしてください。
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowHospitalizeModal(true)}
                            className="btn btn-danger"
                          >
                            <i className="ph ph-hospital me-2"></i>
                            入院あり（計画終了）
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                          <p className="text-gray-700">
                            この計画書は既に終了しています。
                          </p>
                          {hospitalization && (
                            <div className="mt-4 text-sm text-gray-600">
                              <p>入院日: {hospitalization.hospitalized_at}</p>
                              {hospitalization.note && <p>備考: {hospitalization.note}</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Stepper>
              <StepperNavigation
                currentStep={currentStep}
                totalSteps={steps.length}
                onPrevious={handlePreviousStep}
                onNext={handleNextStep}
                onSave={handleSave}
                canGoNext={validateStep(currentStep)}
                isSubmitting={saving}
                showSave={currentStep === steps.length - 1}
              />
            </form>
          </div>
        </>
      )}

      {/* Hospitalization Modal */}
      {showHospitalizeModal && (
        <ConfirmDialog
          isOpen={showHospitalizeModal}
          title="計画書を終了しますか？"
          message={
            <div className="space-y-4">
              <p>入院により計画書を終了します。この操作は取り消せません。</p>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  入院日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={hospitalizeData.hospitalized_at}
                  onChange={(e) => setHospitalizeData(prev => ({ ...prev, hospitalized_at: e.target.value }))}
                  className="form-control"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  備考
                </label>
                <textarea
                  value={hospitalizeData.note}
                  onChange={(e) => setHospitalizeData(prev => ({ ...prev, note: e.target.value }))}
                  rows={3}
                  className="form-control"
                />
              </div>
            </div>
          }
          onConfirm={handleHospitalize}
          onCancel={() => {
            setShowHospitalizeModal(false);
            setHospitalizeData({ hospitalized_at: '', note: '' });
          }}
          confirmText="終了"
          cancelText="キャンセル"
          type="danger"
        />
      )}
    </div>
  );
}
