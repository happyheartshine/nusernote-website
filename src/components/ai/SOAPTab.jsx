'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { parseApiResponse } from '@/utils/parseApiResponse';
import { copyToClipboard } from '@/lib/copyToClipboard';
import { getSessionFromStorage } from '@/lib/sessionStorage';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { supabase } from '@/lib/supabase';
import VoiceInputButton from './VoiceInputButton';
import SOAPOutput from './SOAPOutput';
import Stepper from '@/components/Stepper';
import StepperNavigation from '@/components/StepperNavigation';

const NURSE_OPTIONS = ['吉村', 'A子', 'B子', 'C子'];

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
const MAX_TEXTAREA_HEIGHT = 200;

const getDefaultValues = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  return {
    patientId: '',
    patientName: '',
    diagnosis: '',
    selectedNurses: NURSE_OPTIONS[0] ? [NURSE_OPTIONS[0]] : [],
    visitDate: todayStr,
    startTime: '09:00',
    endTime: '10:00',
    chiefComplaint: '',
  };
};

export default function SOAPTab() {
  const { user, loading: authLoading } = useAuthProfile();
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [selectedNurses, setSelectedNurses] = useState([]);
  const [visitDate, setVisitDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [sText, setSText] = useState('');
  const [oText, setOText] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [soapOutput, setSoapOutput] = useState(null);
  const [planOutput, setPlanOutput] = useState(null);
  const [copyState, setCopyState] = useState('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [showForm, setShowForm] = useState(true);

  const resultsRef = useRef(null);
  const sTextareaRef = useRef(null);
  const oTextareaRef = useRef(null);

  const fetchPatients = useCallback(async () => {
    // Wait for authentication to complete
    if (authLoading) {
      return;
    }
    
    if (!user?.id) {
      // User is not authenticated, but don't show warning if still loading
      if (!authLoading) {
        console.warn('Cannot fetch patients: user not authenticated');
      }
      return;
    }
    
    try {
      // Fetch patients filtered by authenticated user's ID
      const { data, error } = await supabase
        .from('patients')
        .select('id, name')
        .eq('user_id', user.id) // Filter by authenticated user's ID
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Fetch patients error:', error);
    }
  }, [user, authLoading]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handlePatientChange = (e) => {
    const patientId = e.target.value;
    setSelectedPatientId(patientId);
    
    if (patientId) {
      const selectedPatient = patients.find((p) => p.id === patientId);
      if (selectedPatient?.primary_diagnosis) {
        setDiagnosis(selectedPatient.primary_diagnosis);
      } else {
        setDiagnosis('');
      }
    } else {
      setDiagnosis('');
    }
  };

  const getSelectedPatientName = () => {
    if (!selectedPatientId) return '';
    const patient = patients.find((p) => p.id === selectedPatientId);
    return patient?.name || '';
  };

  useEffect(() => {
    if (sTextareaRef.current) {
      sTextareaRef.current.style.height = 'auto';
      const scrollHeight = sTextareaRef.current.scrollHeight;
      const newHeight = Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT);
      sTextareaRef.current.style.height = `${newHeight}px`;
    }
  }, [sText]);

  useEffect(() => {
    if (oTextareaRef.current) {
      oTextareaRef.current.style.height = 'auto';
      const scrollHeight = oTextareaRef.current.scrollHeight;
      const newHeight = Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT);
      oTextareaRef.current.style.height = `${newHeight}px`;
    }
  }, [oText]);

  const canSubmit = useMemo(() => {
    return Boolean(sText.trim() || oText.trim());
  }, [sText, oText]);

  // Stepper configuration
  const steps = [
    { label: '利用者情報', shortLabel: '利用者' },
    { label: '訪問情報', shortLabel: '訪問' },
    { label: 'SOAP入力', shortLabel: 'SOAP' },
  ];

  // Step validation
  const validateStep = (step) => {
    switch (step) {
      case 0: // Patient Information
        return !!selectedPatientId?.trim();
      case 1: // Visit Information (optional)
        return true;
      case 2: // SOAP Input
        return canSubmit;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep) && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === steps.length - 1 && validateStep(currentStep)) {
      // Last step - trigger generate
      handleGenerate();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const scrollToResults = () => {
    if (resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleGenerate = async () => {
    // Validate patient selection first
    if (!selectedPatientId || !selectedPatientId.trim()) {
      setError('利用者を選択してください');
      return;
    }

    if (!canSubmit) {
      setError('S（主観）またはO（客観）のいずれかを入力してください');
      return;
    }

    if (!BACKEND_URL) {
      setError('バックエンドURLが設定されていません');
      return;
    }

    setLoading(true);
    setError(null);
    setCopyState('idle');

    const defaults = getDefaultValues();

    const session = getSessionFromStorage();
    if (!session) {
      setError('認証が必要です。再度ログインしてください。');
      setLoading(false);
      return;
    }
    try {
      // Build request body - prefer patient_id if available
      const requestBody = {
        nurses: selectedNurses.length > 0 ? selectedNurses : defaults.selectedNurses,
        visitDate: visitDate || defaults.visitDate,
        startTime: startTime || defaults.startTime,
        endTime: endTime || defaults.endTime,
        chiefComplaint: chiefComplaint.trim() || defaults.chiefComplaint,
        sText,
        oText,
      };

      // If patient is selected, send patient_id (backend will fetch patient data)
      if (selectedPatientId && selectedPatientId.trim()) {
        requestBody.patient_id = selectedPatientId;
        // Still send diagnosis in case user wants to override patient's primary_diagnosis
        requestBody.diagnosis = diagnosis || '';
      } else {
        // No patient selected - send userName and diagnosis (both required by backend)
        requestBody.userName = getSelectedPatientName() || defaults.patientName;
        requestBody.diagnosis = diagnosis || defaults.diagnosis;
      }

      const response = await fetch(`${BACKEND_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'エラーが発生しました' }));
        throw new Error(errorData.error || errorData.detail || `APIエラー: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let responseText = '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        responseText = data.output || '';
      } else {
        responseText = await response.text();
      }

      const { soap, plan } = parseApiResponse(responseText);
      setSoapOutput(soap);
      setPlanOutput(plan);
      setShowForm(false); // Hide form, show results
      scrollToResults();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedPatientId('');
    setDiagnosis('');
    setSelectedNurses([]);
    setVisitDate('');
    setStartTime('');
    setEndTime('');
    setChiefComplaint('');
    setSText('');
    setOText('');
    setSoapOutput(null);
    setPlanOutput(null);
    setError(null);
    setCopyState('idle');
    setCurrentStep(0);
    setShowForm(true);
  };

  const handleCopy = async () => {
    if (!soapOutput) return;

    const lines = [];

    lines.push('S（主観）');
    lines.push(soapOutput.s || '（未入力）');
    lines.push('');
    lines.push('O（客観）');
    lines.push(soapOutput.o || '（未入力）');
    lines.push('');
    lines.push('A（アセスメント）');
    lines.push('【症状推移】');
    lines.push(soapOutput.a.症状推移 || '（未入力）');
    lines.push('');
    lines.push('【リスク評価（自殺・他害・服薬）】');
    lines.push(soapOutput.a.リスク評価 || '（未入力）');
    lines.push('');
    lines.push('【背景要因】');
    lines.push(soapOutput.a.背景要因 || '（未入力）');
    lines.push('');
    lines.push('【次回観察ポイント】');
    lines.push(soapOutput.a.次回観察ポイント || '（未入力）');
    lines.push('');
    lines.push('P（計画）');
    lines.push('【本日実施した援助】');
    lines.push(soapOutput.p.本日実施した援助 || '（未入力）');
    lines.push('');
    lines.push('【次回以降の方針】');
    lines.push(soapOutput.p.次回以降の方針 || '（未入力）');
    lines.push('');

    if (planOutput) {
      lines.push('');
      lines.push('訪問看護計画書');
      lines.push('');
      lines.push('【長期目標】');
      lines.push(planOutput.長期目標 || '（未入力）');
      lines.push('');
      lines.push('【短期目標】');
      lines.push(planOutput.短期目標 || '（未入力）');
      lines.push('');
      lines.push('【看護援助の方針】');
      lines.push(planOutput.看護援助の方針 || '（未入力）');
      lines.push('');
    }

    const defaults = getDefaultValues();
    const finalVisitDate = visitDate || defaults.visitDate;
    const finalStartTime = startTime || defaults.startTime;
    const finalEndTime = endTime || defaults.endTime;
    const finalSelectedNurses = selectedNurses.length > 0 ? selectedNurses : defaults.selectedNurses;
    const finalDiagnosis = diagnosis || defaults.diagnosis;
    const finalPatientName = getSelectedPatientName() || defaults.patientName;

    lines.push('【訪問情報】');
    if (finalVisitDate) {
      const date = new Date(finalVisitDate);
      const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
      const weekday = weekdays[date.getDay()];
      const formattedDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}（${weekday}）`;
      lines.push(`訪問日：${formattedDate}`);
    }
    if (finalStartTime && finalEndTime) {
      lines.push(`訪問時間：${finalStartTime}〜${finalEndTime}`);
    }
    if (finalPatientName) {
      lines.push(`利用者名：${finalPatientName}`);
    }
    if (finalSelectedNurses.length > 0) {
      lines.push(`担当看護師：${finalSelectedNurses.join('・')}`);
    }
    if (finalDiagnosis) {
      lines.push(`主疾患：${finalDiagnosis}`);
    }

    const success = await copyToClipboard(lines.join('\n'));
    if (success) {
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } else {
      setError('コピーに失敗しました');
    }
  };

  const toggleNurse = (nurse) => {
    setSelectedNurses((prev) => (prev.includes(nurse) ? prev.filter((n) => n !== nurse) : [...prev, nurse]));
  };

  const handleVoiceResultS = (text) => {
    setSText((prev) => prev + (prev ? '\n' : '') + text);
  };

  const handleVoiceResultO = (text) => {
    setOText((prev) => prev + (prev ? '\n' : '') + text);
  };

  return (
    <div className="space-y-6" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      {showForm ? (
        <div className="card" style={{ minHeight: 'calc(100vh - 200px)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <div className="card-header" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <div className="flex items-center justify-between gap-2" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <h5 className="text-sm sm:text-base truncate flex-shrink min-w-0">入力情報</h5>
              {/* Mobile: mini clear button */}
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 text-lg shadow-sm active:scale-95 transition sm:hidden disabled:opacity-60"
                aria-label="クリア"
              >
                <i className="ph ph-x" />
              </button>
              {/* Desktop: normal clear button */}
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                className="btn btn-sm btn-outline-secondary hidden sm:inline-flex"
              >
                <i className="ph ph-x me-1"></i>
                クリア
              </button>
            </div>
          </div>
          <form className="flex flex-col" style={{ height: 'calc(100vh - 280px)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Stepper steps={steps} currentStep={currentStep}>
              <div className="card-body p-4 md:p-6" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
                {/* Step 0: Patient Information */}
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">利用者情報</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          利用者名 <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedPatientId}
                          onChange={handlePatientChange}
                          className="form-select"
                          disabled={loading}
                          required
                        >
                          <option value="">選択してください</option>
                          {patients.map((patient) => (
                            <option key={patient.id} value={patient.id}>
                              {patient.name}
                            </option>
                          ))}
                        </select>
                        {patients.length === 0 && (
                          <p className="mt-1 text-xs text-gray-500">
                            患者が登録されていません。
                            <a href="/patients" className="text-blue-600 hover:underline ml-1">
                              患者を登録
                            </a>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">主疾患</label>
                        <input
                          type="text"
                          value={diagnosis}
                          onChange={(e) => setDiagnosis(e.target.value)}
                          className="form-control"
                          placeholder="主疾患（患者を選択すると自動入力、編集可能）"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 1: Visit Information */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">訪問情報</h3>
                    <div className="space-y-4">
                      <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <label className="mb-2 block text-sm font-medium">看護師名</label>
                        <div className="flex flex-wrap gap-3" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                          {NURSE_OPTIONS.map((nurse) => (
                            <label key={nurse} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedNurses.includes(nurse)}
                                onChange={() => toggleNurse(nurse)}
                                className="form-check-input input-primary"
                                disabled={loading}
                              />
                              <span>{nurse}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">訪問日</label>
                        <input
                          type="date"
                          value={visitDate}
                          onChange={(e) => setVisitDate(e.target.value)}
                          className="form-control"
                          disabled={loading}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                          <label className="mb-2 block text-sm font-medium">訪問開始時間</label>
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="form-control"
                            disabled={loading}
                            style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                          <label className="mb-2 block text-sm font-medium">訪問終了時間</label>
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="form-control"
                            disabled={loading}
                            style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      {/* <div>
                        <label className="mb-2 block text-sm font-medium">主訴</label>
                        <input
                          type="text"
                          value={chiefComplaint}
                          onChange={(e) => setChiefComplaint(e.target.value)}
                          className="form-control"
                          placeholder="主訴を入力"
                          disabled={loading}
                        />
                      </div> */}
                    </div>
                  </div>
                )}

                {/* Step 2: SOAP Input */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">SOAP入力</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium">S（主観）</label>
                        <div className="relative">
                          <textarea
                            ref={sTextareaRef}
                            value={sText}
                            onChange={(e) => setSText(e.target.value)}
                            className="form-control resize-none"
                            style={{ maxHeight: `${MAX_TEXTAREA_HEIGHT}px` }}
                            placeholder="S（任意）"
                            rows={4}
                            disabled={loading}
                          />
                          <div className="absolute bottom-3 right-3">
                            <VoiceInputButton onResult={handleVoiceResultS} disabled={loading} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">O（客観）</label>
                        <div className="relative">
                          <textarea
                            ref={oTextareaRef}
                            value={oText}
                            onChange={(e) => setOText(e.target.value)}
                            className="form-control resize-none"
                            style={{ maxHeight: `${MAX_TEXTAREA_HEIGHT}px` }}
                            placeholder="O（任意）"
                            rows={4}
                            disabled={loading}
                          />
                          <div className="absolute bottom-3 right-3">
                            <VoiceInputButton onResult={handleVoiceResultO} disabled={loading} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Stepper>
            <StepperNavigation
              currentStep={currentStep}
              totalSteps={steps.length}
              onPrevious={handlePreviousStep}
              onNext={handleNextStep}
              onSave={handleGenerate}
              canGoNext={validateStep(currentStep)}
              isSubmitting={loading}
              showSave={currentStep === steps.length - 1}
            />
          </form>
        </div>
      ) : (
        <div className="flex gap-3 justify-end" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
          {/* Back to input - mini button on mobile, normal on desktop */}
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 text-lg shadow-sm active:scale-95 transition sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:rounded-md sm:border sm:bg-white sm:text-gray-700 flex-shrink-0"
            aria-label="入力に戻る"
          >
            <i className="ph ph-arrow-left sm:me-1" />
            <span className="hidden sm:inline">入力に戻る</span>
          </button>
          {/* New record - mini plus on mobile, text on desktop */}
          <button
            type="button"
            onClick={handleClear}
            className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 text-lg shadow-sm active:scale-95 transition sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:rounded-md sm:border sm:bg-white sm:text-gray-700 flex-shrink-0"
          >
            <i className="ph ph-plus sm:me-1" />
            <span className="hidden sm:inline">新規作成</span>
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <i className="ph ph-warning-circle"></i>
          <p>{error}</p>
        </div>
      )}

      {soapOutput && (
        <div ref={resultsRef} className="flex flex-col" style={{ height: 'calc(100vh - 200px)', maxHeight: 'calc(100vh - 200px)', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
          <div className="card flex-1 flex flex-col overflow-hidden p-0" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <div className="flex-1 flex flex-col min-h-0" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <SOAPOutput
                soapOutput={soapOutput}
                planOutput={planOutput}
                visitDate={visitDate || getDefaultValues().visitDate}
                startTime={startTime || getDefaultValues().startTime}
                endTime={endTime || getDefaultValues().endTime}
                selectedNurses={selectedNurses.length > 0 ? selectedNurses : getDefaultValues().selectedNurses}
                diagnosis={diagnosis || getDefaultValues().diagnosis}
                patientName={getSelectedPatientName() || getDefaultValues().patientName}
                onSoapUpdate={setSoapOutput}
                onPlanUpdate={setPlanOutput}
              />
            </div>
          </div>

          {/* Fixed Action Bar - Always Visible */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 p-3 sm:p-4 shadow-lg flex justify-end" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            {/* Mini confirm button on mobile, full label on desktop */}
            <button
              type="button"
              onClick={handleCopy}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-500 text-white text-xl shadow-md active:scale-95 transition sm:h-auto sm:w-auto sm:px-4 sm:py-2 sm:rounded-md sm:text-sm sm:min-h-[40px] flex-shrink-0"
            >
              {copyState === 'copied' ? (
                <>
                  <i className="ph ph-check" />
                  <span className="hidden sm:inline ms-2">記録確定しました</span>
                </>
              ) : (
                <>
                  <i className="ph ph-check" />
                  <span className="hidden sm:inline ms-2">記録確定</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


