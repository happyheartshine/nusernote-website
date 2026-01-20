'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { supabase } from '@/lib/supabase';
import { createPlan } from '@/lib/planApi';
import Stepper from '@/components/Stepper';
import StepperNavigation from '@/components/StepperNavigation';

// ==============================|| PLAN CREATE PAGE ||============================== //

export default function PlanCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthProfile();
  const patientId = searchParams.get('patientId');
  const isMountedRef = useRef(true);

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    long_term_goal: '',
    short_term_goal: '',
    nursing_policy: '',
    patient_family_wish: '',
    has_procedure: false,
    procedure_content: '',
    material_details: '',
    material_amount: '',
    procedure_note: '',
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!patientId) {
      if (isMountedRef.current) {
        setError('患者IDが指定されていません');
        setLoading(false);
      }
      return;
    }

    const fetchPatient = async () => {
      try {
        if (isMountedRef.current) {
          setLoading(true);
        }
        const { data, error: fetchError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .eq('user_id', user?.id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('患者が見つかりません');

        if (isMountedRef.current) {
          setPatient(data);
          // Prefill patient_family_wish from individual_notes
          if (data.individual_notes) {
            setFormData(prev => ({ ...prev, patient_family_wish: data.individual_notes }));
          }
        }

        // Fetch latest SOAP record's plan_output to prefill form fields
        try {
          const { data: soapData, error: soapError } = await supabase
            .from('soap_records')
            .select('plan_output')
            .eq('patient_id', patientId)
            .eq('user_id', user?.id)
            .order('visit_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!soapError && soapData && soapData.plan_output && isMountedRef.current) {
            const planOutput = soapData.plan_output;
            
            // Map plan_output fields (Japanese keys) to form fields
            setFormData(prev => ({
              ...prev,
              long_term_goal: planOutput['長期目標'] || prev.long_term_goal,
              short_term_goal: planOutput['短期目標'] || prev.short_term_goal,
              nursing_policy: planOutput['看護援助の方針'] || prev.nursing_policy,
            }));
          }
        } catch (soapErr) {
          // Silently fail - it's okay if there's no SOAP record
          console.log('No SOAP record found or error fetching plan_output:', soapErr);
        }
      } catch (err) {
        console.error('Error fetching patient:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : '患者情報の取得に失敗しました');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    if (user?.id) {
      fetchPatient();
    }
  }, [patientId, user?.id]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Stepper configuration
  const steps = [
    { label: '計画期間', shortLabel: '期間' },
    { label: '目標・方針', shortLabel: '目標' },
    { label: '処置・材料', shortLabel: '処置' },
  ];

  // Step validation
  const validateStep = (step) => {
    switch (step) {
      case 0: // Plan Period
        return !!formData.start_date && !!formData.end_date;
      case 1: // Goals & Policy (optional)
        return true;
      case 2: // Procedures (optional)
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientId) return;

    // Validate required fields
    if (!formData.start_date || !formData.end_date) {
      setError('開始日と終了日は必須です');
      setCurrentStep(0);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Prepare plan data
      const planData = {
        start_date: formData.start_date,
        end_date: formData.end_date,
        long_term_goal: formData.long_term_goal || null,
        short_term_goal: formData.short_term_goal || null,
        nursing_policy: formData.nursing_policy || null,
        patient_family_wish: formData.patient_family_wish || null,
        has_procedure: formData.has_procedure,
        procedure_content: formData.procedure_content || null,
        material_details: formData.material_details || null,
        material_amount: formData.material_amount || null,
        procedure_note: formData.procedure_note || null,
        // Items will be created with defaults by backend if not provided
        items: null,
        // Evaluations will be created with defaults by backend if not provided
        evaluations: null,
      };

      const result = await createPlan(patientId, planData);
      
      // Redirect to edit page - don't update state after navigation
      if (isMountedRef.current) {
        router.push(`/plans/${result.id}/edit`);
      }
      // Note: We don't set saving to false here because we're navigating away
    } catch (err) {
      console.error('Error creating plan:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '計画書の作成に失敗しました');
        setSaving(false);
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

  if (error && !patient) {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">新規計画書作成</h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600">訪問看護計画書を作成します</p>
        </div>
      </div>

      {error && (
        <div className={`alert mb-6 alert-danger`} role="alert">
          <i className="ph ph-x-circle"></i>
          <div>{error}</div>
        </div>
      )}

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
                <div className="mt-1 text-gray-900">{patient.gender === 'male' ? '男性' : patient.gender === 'female' ? '女性' : '—'}</div>
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
            <h2 className="text-xl font-semibold text-gray-900">新規計画書作成</h2>
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
        <form onSubmit={handleSubmit} className="flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
          <Stepper steps={steps} currentStep={currentStep}>
            <div className="p-4 md:p-6">
              {/* Step 0: Plan Period */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">計画期間</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                        required
                      />
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
                      />
                    </div>
                    <div>
                      <label htmlFor="nursing_policy" className="mb-2 block text-sm font-medium text-gray-700">
                        看護援助の方針
                      </label>
                      <textarea
                        id="nursing_policy"
                        name="nursing_policy"
                        value={formData.nursing_policy}
                        onChange={handleInputChange}
                        rows={3}
                        className="form-control"
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
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Procedure/Materials */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">処置・材料</h3>
                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="has_procedure"
                        checked={formData.has_procedure}
                        onChange={handleInputChange}
                        className="form-check-input input-primary me-2"
                      />
                      <span className="text-sm font-medium text-gray-700">処置・材料あり</span>
                    </label>
                  </div>
                  {formData.has_procedure && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="procedure_content" className="mb-2 block text-sm font-medium text-gray-700">
                          処置内容
                        </label>
                        <textarea
                          id="procedure_content"
                          name="procedure_content"
                          value={formData.procedure_content}
                          onChange={handleInputChange}
                          rows={2}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="material_details" className="mb-2 block text-sm font-medium text-gray-700">
                          材料の種類・サイズ
                        </label>
                        <input
                          id="material_details"
                          type="text"
                          name="material_details"
                          value={formData.material_details}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="material_amount" className="mb-2 block text-sm font-medium text-gray-700">
                          必要数量
                        </label>
                        <input
                          id="material_amount"
                          type="text"
                          name="material_amount"
                          value={formData.material_amount}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="procedure_note" className="mb-2 block text-sm font-medium text-gray-700">
                          備考
                        </label>
                        <textarea
                          id="procedure_note"
                          name="procedure_note"
                          value={formData.procedure_note}
                          onChange={handleInputChange}
                          rows={2}
                          className="form-control"
                        />
                      </div>
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
            onSave={handleSubmit}
            canGoNext={validateStep(currentStep)}
            isSubmitting={saving}
            showSave={currentStep === steps.length - 1}
          />
        </form>
      </div>
    </div>
  );
}
