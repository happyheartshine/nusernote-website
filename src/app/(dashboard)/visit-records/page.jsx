'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import ConfirmDialog from '@/components/ConfirmDialog';
import { supabase } from '@/lib/supabase';

// ==============================|| VISIT RECORDS PAGE ||============================== //

export default function VisitRecordsPage() {
  const { user } = useAuthProfile();
  const router = useRouter();
  const [visitRecords, setVisitRecords] = useState([]);
  const [filteredVisitRecords, setFilteredVisitRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [patientFilter, setPatientFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    patient_name: '',
    gender: '',
    birth_date: '',
    age: '',
    patient_address: '',
    patient_contact: '',
    key_person_name: '',
    key_person_relationship: '',
    key_person_address: '',
    key_person_contact1: '',
    key_person_contact2: '',
    initial_visit_date: '',
    initial_visit_start_hour: '',
    initial_visit_start_minute: '',
    initial_visit_end_hour: '',
    initial_visit_end_minute: '',
    main_disease: '',
    medical_history: '',
    current_illness_history: '',
    family_structure: '',
    daily_life_meal_nutrition: '',
    daily_life_hygiene: '',
    daily_life_medication: '',
    daily_life_sleep: '',
    daily_life_living_environment: '',
    daily_life_family_environment: '',
    doctor_name: '',
    hospital_name: '',
    hospital_address: '',
    hospital_phone: '',
    notes: '',
    recorder_name: '',
    status: 'active'
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPatients = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) {
        console.error('Supabase error fetching patients:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      setPatients(data || []);
    } catch (error) {
      console.error('Fetch patients error:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      });
      // Don't show toast for patients fetch errors as it's not critical for the page
    }
  }, [user]);

  const fetchVisitRecords = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visit_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.hint?.includes('visit_records')) {
          console.error('Table visit_records does not exist. Please run the migration: supabase/migrations/20260111000001_create_visit_records_table.sql');
        }
        throw error;
      }
      setVisitRecords(data || []);
    } catch (error) {
      console.error('Fetch visit records error:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      });
      const errorMessage = error?.message || error?.details || error?.hint || '不明なエラー';
      showToast(`訪問記録の取得に失敗しました: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const filterVisitRecords = useCallback(() => {
    let filtered = [...visitRecords];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((record) => record.status === statusFilter);
    }

    if (patientFilter !== 'all') {
      filtered = filtered.filter((record) => record.patient_id === patientFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.patient_name.toLowerCase().includes(query) ||
          (record.main_disease && record.main_disease.toLowerCase().includes(query)) ||
          (record.notes && record.notes.toLowerCase().includes(query))
      );
    }

    setFilteredVisitRecords(filtered);
  }, [visitRecords, statusFilter, patientFilter, searchQuery]);

  useEffect(() => {
    fetchPatients();
    fetchVisitRecords();
  }, [fetchPatients, fetchVisitRecords]);

  useEffect(() => {
    filterVisitRecords();
  }, [filterVisitRecords]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePatientSelect = (e) => {
    const patientId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      patient_id: patientId
    }));

    // Auto-fill patient_name from selected patient
    if (patientId) {
      const selectedPatient = patients.find((p) => p.id === patientId);
      if (selectedPatient) {
        setFormData((prev) => ({
          ...prev,
          patient_name: selectedPatient.name
        }));
      }
    }
  };

  const handleCreate = () => {
    setEditingRecord(null);
    setFormData({
      patient_id: '',
      patient_name: '',
      gender: '',
      birth_date: '',
      age: '',
      patient_address: '',
      patient_contact: '',
      key_person_name: '',
      key_person_relationship: '',
      key_person_address: '',
      key_person_contact1: '',
      key_person_contact2: '',
      initial_visit_date: '',
      initial_visit_start_hour: '',
      initial_visit_start_minute: '',
      initial_visit_end_hour: '',
      initial_visit_end_minute: '',
      main_disease: '',
      medical_history: '',
      current_illness_history: '',
      family_structure: '',
      daily_life_meal_nutrition: '',
      daily_life_hygiene: '',
      daily_life_medication: '',
      daily_life_sleep: '',
      daily_life_living_environment: '',
      daily_life_family_environment: '',
      doctor_name: '',
      hospital_name: '',
      hospital_address: '',
      hospital_phone: '',
      notes: '',
      recorder_name: '',
      status: 'active'
    });
    setShowForm(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      patient_id: record.patient_id || '',
      patient_name: record.patient_name || '',
      gender: record.gender || '',
      birth_date: record.birth_date || '',
      age: record.age ? String(record.age) : '',
      patient_address: record.patient_address || '',
      patient_contact: record.patient_contact || '',
      key_person_name: record.key_person_name || '',
      key_person_relationship: record.key_person_relationship || '',
      key_person_address: record.key_person_address || '',
      key_person_contact1: record.key_person_contact1 || '',
      key_person_contact2: record.key_person_contact2 || '',
      initial_visit_date: record.initial_visit_date || '',
      initial_visit_start_hour: record.initial_visit_start_hour ? String(record.initial_visit_start_hour) : '',
      initial_visit_start_minute: record.initial_visit_start_minute ? String(record.initial_visit_start_minute) : '',
      initial_visit_end_hour: record.initial_visit_end_hour ? String(record.initial_visit_end_hour) : '',
      initial_visit_end_minute: record.initial_visit_end_minute ? String(record.initial_visit_end_minute) : '',
      main_disease: record.main_disease || '',
      medical_history: record.medical_history || '',
      current_illness_history: record.current_illness_history || '',
      family_structure: record.family_structure || '',
      daily_life_meal_nutrition: record.daily_life_meal_nutrition || '',
      daily_life_hygiene: record.daily_life_hygiene || '',
      daily_life_medication: record.daily_life_medication || '',
      daily_life_sleep: record.daily_life_sleep || '',
      daily_life_living_environment: record.daily_life_living_environment || '',
      daily_life_family_environment: record.daily_life_family_environment || '',
      doctor_name: record.doctor_name || '',
      hospital_name: record.hospital_name || '',
      hospital_address: record.hospital_address || '',
      hospital_phone: record.hospital_phone || '',
      notes: record.notes || '',
      recorder_name: record.recorder_name || '',
      status: record.status || 'active'
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setProcessingId(null);
    setShowForm(false);
    setEditingRecord(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    setProcessingId(editingRecord?.id || 'new');
    try {
      const updateData = {
        patient_id: formData.patient_id,
        patient_name: formData.patient_name.trim(),
        gender: formData.gender || null,
        birth_date: formData.birth_date || null,
        age: formData.age ? parseInt(formData.age, 10) : null,
        patient_address: formData.patient_address.trim() || null,
        patient_contact: formData.patient_contact.trim() || null,
        key_person_name: formData.key_person_name.trim() || null,
        key_person_relationship: formData.key_person_relationship.trim() || null,
        key_person_address: formData.key_person_address.trim() || null,
        key_person_contact1: formData.key_person_contact1.trim() || null,
        key_person_contact2: formData.key_person_contact2.trim() || null,
        initial_visit_date: formData.initial_visit_date || null,
        initial_visit_start_hour: formData.initial_visit_start_hour ? parseInt(formData.initial_visit_start_hour, 10) : null,
        initial_visit_start_minute: formData.initial_visit_start_minute ? parseInt(formData.initial_visit_start_minute, 10) : null,
        initial_visit_end_hour: formData.initial_visit_end_hour ? parseInt(formData.initial_visit_end_hour, 10) : null,
        initial_visit_end_minute: formData.initial_visit_end_minute ? parseInt(formData.initial_visit_end_minute, 10) : null,
        main_disease: formData.main_disease.trim() || null,
        medical_history: formData.medical_history.trim() || null,
        current_illness_history: formData.current_illness_history.trim() || null,
        family_structure: formData.family_structure.trim() || null,
        daily_life_meal_nutrition: formData.daily_life_meal_nutrition.trim() || null,
        daily_life_hygiene: formData.daily_life_hygiene.trim() || null,
        daily_life_medication: formData.daily_life_medication.trim() || null,
        daily_life_sleep: formData.daily_life_sleep.trim() || null,
        daily_life_living_environment: formData.daily_life_living_environment.trim() || null,
        daily_life_family_environment: formData.daily_life_family_environment.trim() || null,
        doctor_name: formData.doctor_name.trim() || null,
        hospital_name: formData.hospital_name.trim() || null,
        hospital_address: formData.hospital_address.trim() || null,
        hospital_phone: formData.hospital_phone.trim() || null,
        notes: formData.notes.trim() || null,
        recorder_name: formData.recorder_name.trim() || null,
        status: formData.status
      };

      if (editingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('visit_records')
          .update(updateData)
          .eq('id', editingRecord.id)
          .eq('user_id', user.id);

        if (error) throw error;
        showToast('訪問記録を更新しました', 'success');
      } else {
        // Create new record
        const { error } = await supabase.from('visit_records').insert({
          user_id: user.id,
          ...updateData
        });

        if (error) throw error;
        showToast('訪問記録を作成しました', 'success');
      }

      handleCancel();
      fetchVisitRecords();
    } catch (error) {
      console.error('Save visit record error:', error);
      showToast('保存に失敗しました: ' + (error.message || '不明なエラー'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = (record) => {
    setConfirmDialog({
      isOpen: true,
      title: '訪問記録の削除',
      message: `「${record.patient_name}」の訪問記録を削除しますか？この操作は取り消せません。`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setProcessingId(record.id);
        try {
          const { error } = await supabase
            .from('visit_records')
            .delete()
            .eq('id', record.id)
            .eq('user_id', user.id);

          if (error) throw error;
          showToast('訪問記録を削除しました', 'success');
          fetchVisitRecords();
        } catch (error) {
          console.error('Delete visit record error:', error);
          showToast('削除に失敗しました: ' + (error.message || '不明なエラー'), 'error');
        } finally {
          setProcessingId(null);
        }
      },
      onCancel: () => {
        setConfirmDialog(null);
      }
    });
  };

  const fetchPDFBlob = async (recordId) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    if (!API_URL || API_URL === 'http://localhost:8000') {
      throw new Error('API URLが設定されていません。環境変数 NEXT_PUBLIC_API_URL または NEXT_PUBLIC_BACKEND_URL を設定してください。');
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('認証が必要です');
    }

    const response = await fetch(`${API_URL}/pdf/visit-record/${recordId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = 'PDF生成に失敗しました';
      try {
        const errorData = await response.json().catch(() => ({}));
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = `PDF生成に失敗しました (HTTP ${response.status})`;
      }
      throw new Error(errorMessage);
    }

    return await response.blob();
  };

  const handleDownloadPDF = async (record) => {
    setProcessingId(record.id + '-pdf');
    try {
      const blob = await fetchPDFBlob(record.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `visit_record_${record.patient_name}_${record.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('PDFをダウンロードしました', 'success');
    } catch (error) {
      console.error('PDF download error:', error);
      showToast('PDFダウンロードに失敗しました', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePreviewPDF = (record) => {
    router.push(`/visit-records/${record.id}/preview`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      archived: 'bg-yellow-100 text-yellow-800'
    };
    const labels = {
      active: '有効',
      inactive: '無効',
      archived: 'アーカイブ'
    };
    return (
      <span className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${badges[status]}`}>
        {labels[status]}
      </span>
    );
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
        />
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">訪問記録管理</h1>
              <p className="mt-2 text-gray-600">訪問記録の作成、編集、削除、PDF出力</p>
            </div>
            {!showForm && (
              <button onClick={handleCreate} className="btn btn-primary">
                <i className="ph ph-plus me-2"></i>
                新規作成
              </button>
            )}
          </div>

          {toast && (
            <div className={`alert mb-6 ${toast.type === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
              <i className={`ph ${toast.type === 'success' ? 'ph-check-circle' : 'ph-x-circle'}`}></i>
              <div>{toast.message}</div>
            </div>
          )}

          {showForm ? (
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                {editingRecord ? '訪問記録の編集' : '新規訪問記録の作成'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* Patient Selection */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="mb-3 font-semibold text-gray-700">患者情報</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="patient_id" className="mb-2 block text-sm font-medium text-gray-700">
                          患者選択 <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="patient_id"
                          name="patient_id"
                          value={formData.patient_id}
                          onChange={handlePatientSelect}
                          className="form-select"
                          required
                        >
                          <option value="">選択してください</option>
                          {patients.map((patient) => (
                            <option key={patient.id} value={patient.id}>
                              {patient.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="patient_name" className="mb-2 block text-sm font-medium text-gray-700">
                          患者名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="patient_name"
                          type="text"
                          name="patient_name"
                          value={formData.patient_name}
                          onChange={handleInputChange}
                          className="form-control"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="gender" className="mb-2 block text-sm font-medium text-gray-700">
                          性別
                        </label>
                        <select
                          id="gender"
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          <option value="">選択してください</option>
                          <option value="male">男性</option>
                          <option value="female">女性</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="birth_date" className="mb-2 block text-sm font-medium text-gray-700">
                          生年月日
                        </label>
                        <input
                          id="birth_date"
                          type="date"
                          name="birth_date"
                          value={formData.birth_date}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="age" className="mb-2 block text-sm font-medium text-gray-700">
                          年齢
                        </label>
                        <input
                          id="age"
                          type="number"
                          name="age"
                          value={formData.age}
                          onChange={handleInputChange}
                          className="form-control"
                          min="0"
                          max="150"
                        />
                      </div>
                      <div>
                        <label htmlFor="patient_contact" className="mb-2 block text-sm font-medium text-gray-700">
                          連絡先
                        </label>
                        <input
                          id="patient_contact"
                          type="text"
                          name="patient_contact"
                          value={formData.patient_contact}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="patient_address" className="mb-2 block text-sm font-medium text-gray-700">
                        住所
                      </label>
                      <input
                        id="patient_address"
                        type="text"
                        name="patient_address"
                        value={formData.patient_address}
                        onChange={handleInputChange}
                        className="form-control"
                      />
                    </div>
                  </div>

                  {/* Key Person */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="mb-3 font-semibold text-gray-700">キーパーソン情報</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="key_person_name" className="mb-2 block text-sm font-medium text-gray-700">
                          氏名
                        </label>
                        <input
                          id="key_person_name"
                          type="text"
                          name="key_person_name"
                          value={formData.key_person_name}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="key_person_relationship" className="mb-2 block text-sm font-medium text-gray-700">
                          続柄
                        </label>
                        <input
                          id="key_person_relationship"
                          type="text"
                          name="key_person_relationship"
                          value={formData.key_person_relationship}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="key_person_address" className="mb-2 block text-sm font-medium text-gray-700">
                          住所
                        </label>
                        <input
                          id="key_person_address"
                          type="text"
                          name="key_person_address"
                          value={formData.key_person_address}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="key_person_contact1" className="mb-2 block text-sm font-medium text-gray-700">
                          連絡先1
                        </label>
                        <input
                          id="key_person_contact1"
                          type="text"
                          name="key_person_contact1"
                          value={formData.key_person_contact1}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="key_person_contact2" className="mb-2 block text-sm font-medium text-gray-700">
                          連絡先2
                        </label>
                        <input
                          id="key_person_contact2"
                          type="text"
                          name="key_person_contact2"
                          value={formData.key_person_contact2}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Initial Visit */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="mb-3 font-semibold text-gray-700">初回訪問情報</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="initial_visit_date" className="mb-2 block text-sm font-medium text-gray-700">
                          初回訪問日
                        </label>
                        <input
                          id="initial_visit_date"
                          type="date"
                          name="initial_visit_date"
                          value={formData.initial_visit_date}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <label htmlFor="initial_visit_start_hour" className="mb-2 block text-sm font-medium text-gray-700">
                          開始時
                        </label>
                        <input
                          id="initial_visit_start_hour"
                          type="number"
                          name="initial_visit_start_hour"
                          value={formData.initial_visit_start_hour}
                          onChange={handleInputChange}
                          className="form-control"
                          min="0"
                          max="23"
                        />
                      </div>
                      <div>
                        <label htmlFor="initial_visit_start_minute" className="mb-2 block text-sm font-medium text-gray-700">
                          開始分
                        </label>
                        <input
                          id="initial_visit_start_minute"
                          type="number"
                          name="initial_visit_start_minute"
                          value={formData.initial_visit_start_minute}
                          onChange={handleInputChange}
                          className="form-control"
                          min="0"
                          max="59"
                        />
                      </div>
                      <div>
                        <label htmlFor="initial_visit_end_hour" className="mb-2 block text-sm font-medium text-gray-700">
                          終了時
                        </label>
                        <input
                          id="initial_visit_end_hour"
                          type="number"
                          name="initial_visit_end_hour"
                          value={formData.initial_visit_end_hour}
                          onChange={handleInputChange}
                          className="form-control"
                          min="0"
                          max="23"
                        />
                      </div>
                      <div>
                        <label htmlFor="initial_visit_end_minute" className="mb-2 block text-sm font-medium text-gray-700">
                          終了分
                        </label>
                        <input
                          id="initial_visit_end_minute"
                          type="number"
                          name="initial_visit_end_minute"
                          value={formData.initial_visit_end_minute}
                          onChange={handleInputChange}
                          className="form-control"
                          min="0"
                          max="59"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="mb-3 font-semibold text-gray-700">医療情報</h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="main_disease" className="mb-2 block text-sm font-medium text-gray-700">
                          主たる傷病名
                        </label>
                        <input
                          id="main_disease"
                          type="text"
                          name="main_disease"
                          value={formData.main_disease}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="medical_history" className="mb-2 block text-sm font-medium text-gray-700">
                          既往歴
                        </label>
                        <textarea
                          id="medical_history"
                          name="medical_history"
                          value={formData.medical_history}
                          onChange={handleInputChange}
                          rows={3}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="current_illness_history" className="mb-2 block text-sm font-medium text-gray-700">
                          現病歴
                        </label>
                        <textarea
                          id="current_illness_history"
                          name="current_illness_history"
                          value={formData.current_illness_history}
                          onChange={handleInputChange}
                          rows={3}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="family_structure" className="mb-2 block text-sm font-medium text-gray-700">
                          家族構成
                        </label>
                        <textarea
                          id="family_structure"
                          name="family_structure"
                          value={formData.family_structure}
                          onChange={handleInputChange}
                          rows={2}
                          className="form-control"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Daily Life Status */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="mb-3 font-semibold text-gray-700">日常生活状況</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="daily_life_meal_nutrition" className="mb-2 block text-sm font-medium text-gray-700">
                          食事・栄養
                        </label>
                        <input
                          id="daily_life_meal_nutrition"
                          type="text"
                          name="daily_life_meal_nutrition"
                          value={formData.daily_life_meal_nutrition}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="daily_life_hygiene" className="mb-2 block text-sm font-medium text-gray-700">
                          清潔・整容
                        </label>
                        <input
                          id="daily_life_hygiene"
                          type="text"
                          name="daily_life_hygiene"
                          value={formData.daily_life_hygiene}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="daily_life_medication" className="mb-2 block text-sm font-medium text-gray-700">
                          服薬
                        </label>
                        <input
                          id="daily_life_medication"
                          type="text"
                          name="daily_life_medication"
                          value={formData.daily_life_medication}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="daily_life_sleep" className="mb-2 block text-sm font-medium text-gray-700">
                          睡眠
                        </label>
                        <input
                          id="daily_life_sleep"
                          type="text"
                          name="daily_life_sleep"
                          value={formData.daily_life_sleep}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="daily_life_living_environment" className="mb-2 block text-sm font-medium text-gray-700">
                          生活環境
                        </label>
                        <input
                          id="daily_life_living_environment"
                          type="text"
                          name="daily_life_living_environment"
                          value={formData.daily_life_living_environment}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="daily_life_family_environment" className="mb-2 block text-sm font-medium text-gray-700">
                          家族環境
                        </label>
                        <input
                          id="daily_life_family_environment"
                          type="text"
                          name="daily_life_family_environment"
                          value={formData.daily_life_family_environment}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Doctor Information */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="mb-3 font-semibold text-gray-700">主治医情報</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="doctor_name" className="mb-2 block text-sm font-medium text-gray-700">
                          医師氏名
                        </label>
                        <input
                          id="doctor_name"
                          type="text"
                          name="doctor_name"
                          value={formData.doctor_name}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="hospital_name" className="mb-2 block text-sm font-medium text-gray-700">
                          医療機関名
                        </label>
                        <input
                          id="hospital_name"
                          type="text"
                          name="hospital_name"
                          value={formData.hospital_name}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="hospital_address" className="mb-2 block text-sm font-medium text-gray-700">
                          医療機関所在地
                        </label>
                        <input
                          id="hospital_address"
                          type="text"
                          name="hospital_address"
                          value={formData.hospital_address}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                      <div>
                        <label htmlFor="hospital_phone" className="mb-2 block text-sm font-medium text-gray-700">
                          電話番号
                        </label>
                        <input
                          id="hospital_phone"
                          type="text"
                          name="hospital_phone"
                          value={formData.hospital_phone}
                          onChange={handleInputChange}
                          className="form-control"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="mb-3 font-semibold text-gray-700">その他</h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="notes" className="mb-2 block text-sm font-medium text-gray-700">
                          備考
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          rows={3}
                          className="form-control"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label htmlFor="recorder_name" className="mb-2 block text-sm font-medium text-gray-700">
                            記載者
                          </label>
                          <input
                            id="recorder_name"
                            type="text"
                            name="recorder_name"
                            value={formData.recorder_name}
                            onChange={handleInputChange}
                            className="form-control"
                          />
                        </div>
                        <div>
                          <label htmlFor="status" className="mb-2 block text-sm font-medium text-gray-700">
                            ステータス
                          </label>
                          <select
                            id="status"
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className="form-select"
                          >
                            <option value="active">有効</option>
                            <option value="inactive">無効</option>
                            <option value="archived">アーカイブ</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={handleCancel} className="btn btn-secondary" disabled={processingId}>
                    キャンセル
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={!!processingId}>
                    {processingId ? (
                      <span key="loading" className="flex items-center">
                        <span className="me-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                        保存中...
                      </span>
                    ) : (
                      <span key="ready" className="flex items-center">
                        <i className="ph ph-check me-2"></i>
                        {editingRecord ? '更新' : '作成'}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="search" className="mb-2 block text-sm font-medium text-gray-700">
                    検索
                  </label>
                  <input
                    id="search"
                    type="text"
                    placeholder="患者名、主疾患、メモで検索"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-control w-full"
                  />
                </div>
                <div>
                  <label htmlFor="patient-filter" className="mb-2 block text-sm font-medium text-gray-700">
                    患者
                  </label>
                  <select
                    id="patient-filter"
                    value={patientFilter}
                    onChange={(e) => setPatientFilter(e.target.value)}
                    className="form-select w-full"
                  >
                    <option value="all">すべて</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="status-filter" className="mb-2 block text-sm font-medium text-gray-700">
                    ステータス
                  </label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="form-select w-full"
                  >
                    <option value="all">すべて</option>
                    <option value="active">有効</option>
                    <option value="inactive">無効</option>
                    <option value="archived">アーカイブ</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : filteredVisitRecords.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <i className="ph ph-notebook text-4xl text-gray-400"></i>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">訪問記録が見つかりません</h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== 'all' || patientFilter !== 'all'
                ? '検索条件に一致する訪問記録がありません。'
                : '訪問記録を作成してください。'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      患者名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      主たる傷病名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      初回訪問日
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
                  {filteredVisitRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{record.patient_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs text-sm text-gray-500">{record.main_disease || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                        {formatDate(record.initial_visit_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(record.status)}</td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePreviewPDF(record)}
                            disabled={processingId === record.id + '-pdf'}
                            className="text-blue-500 hover:text-blue-900 disabled:opacity-50"
                            title="PDFプレビュー"
                          >
                            <i className="ph ph-eye"></i>
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(record)}
                            disabled={processingId === record.id + '-pdf'}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="PDF出力"
                          >
                            {processingId === record.id + '-pdf' ? (
                              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></span>
                            ) : (
                              <i className="ph ph-file-pdf"></i>
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(record)}
                            disabled={processingId === record.id}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title="編集"
                          >
                            <i className="ph ph-pencil"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            disabled={processingId === record.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="削除"
                          >
                            <i className="ph ph-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-6 py-3 text-sm text-gray-500">
              全 {filteredVisitRecords.length} 件の訪問記録
            </div>
          </div>
        )}
      </div>
    </>
  );
}
