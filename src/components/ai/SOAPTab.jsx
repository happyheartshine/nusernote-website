'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { parseApiResponse } from '@/utils/parseApiResponse';
import { copyToClipboard } from '@/lib/copyToClipboard';
import { supabase } from '@/lib/supabase';
import { getSessionFromStorage } from '@/lib/sessionStorage';
import VoiceInputButton from './VoiceInputButton';
import SOAPOutput from './SOAPOutput';
import { DIAGNOSIS_OPTIONS, NURSE_OPTIONS } from './types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
const MAX_TEXTAREA_HEIGHT = 200;

const getDefaultValues = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  return {
    userName: '利用者',
    diagnosis: DIAGNOSIS_OPTIONS[0] || '',
    selectedNurses: NURSE_OPTIONS[0] ? [NURSE_OPTIONS[0]] : [],
    visitDate: todayStr,
    startTime: '09:00',
    endTime: '10:00',
    chiefComplaint: '',
  };
};

export default function SOAPTab() {
  const [userName, setUserName] = useState('');
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

  const resultsRef = useRef(null);
  const sTextareaRef = useRef(null);
  const oTextareaRef = useRef(null);

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

  const scrollToResults = () => {
    if (resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleGenerate = async () => {
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
      const response = await fetch(`${BACKEND_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          userName: userName.trim() || defaults.userName,
          diagnosis: diagnosis || defaults.diagnosis,
          nurses: selectedNurses.length > 0 ? selectedNurses : defaults.selectedNurses,
          visitDate: visitDate || defaults.visitDate,
          startTime: startTime || defaults.startTime,
          endTime: endTime || defaults.endTime,
          chiefComplaint: chiefComplaint.trim() || defaults.chiefComplaint,
          sText,
          oText,
        }),
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
      scrollToResults();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUserName('');
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
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h5>入力情報</h5>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">利用者名</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="form-control"
                placeholder="利用者名を入力"
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">主疾患</label>
              <select
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="form-control"
                disabled={loading}
              >
                <option value="">選択してください</option>
                {DIAGNOSIS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">看護師名</label>
              <div className="flex flex-wrap gap-3">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">訪問開始時間</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="form-control"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">訪問終了時間</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="form-control"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">主訴</label>
              <input
                type="text"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="form-control"
                placeholder="主訴を入力"
                disabled={loading}
              />
            </div>

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
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !canSubmit}
          className="btn btn-primary flex-1"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              生成中...
            </span>
          ) : (
            '要約する（AI）'
          )}
        </button>
        <button type="button" onClick={handleClear} disabled={loading} className="btn btn-outline-secondary flex-1">
          入力をクリア
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="ph ph-warning-circle"></i>
          <p>{error}</p>
        </div>
      )}

      {soapOutput && (
        <div ref={resultsRef} className="space-y-6">
          <SOAPOutput
            soapOutput={soapOutput}
            planOutput={planOutput}
            visitDate={visitDate || getDefaultValues().visitDate}
            startTime={startTime || getDefaultValues().startTime}
            endTime={endTime || getDefaultValues().endTime}
            selectedNurses={selectedNurses.length > 0 ? selectedNurses : getDefaultValues().selectedNurses}
            diagnosis={diagnosis || getDefaultValues().diagnosis}
            onSoapUpdate={setSoapOutput}
            onPlanUpdate={setPlanOutput}
          />

          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-success w-full"
          >
            {copyState === 'copied' ? (
              <span className="flex items-center justify-center gap-2">
                <i className="ph ph-check"></i>
                コピーしました
              </span>
            ) : (
              'すべてをコピー'
            )}
          </button>
        </div>
      )}
    </div>
  );
}


