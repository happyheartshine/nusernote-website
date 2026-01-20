'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import ConfirmDialog from '@/components/ConfirmDialog';
import { supabase } from '@/lib/supabase';
import PatientPlansModal from '@/components/plans/PatientPlansModal';
import PatientReportsModal from '@/components/reports/PatientReportsModal';
import Stepper from '@/components/Stepper';
import StepperNavigation from '@/components/StepperNavigation';
import PatientCard from '@/components/PatientCard';
import CollapsibleSearchBar from '@/components/CollapsibleSearchBar';
import FloatingActionButton from '@/components/FloatingActionButton';
import PDFPreviewModal from '@/components/PDFPreviewModal';

// ==============================|| PATIENTS PAGE ||============================== //

export default function PatientsPage() {
  const { user } = useAuthProfile();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [displayedRecords, setDisplayedRecords] = useState([]); // Paginated records
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [previewPatientId, setPreviewPatientId] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [plansModalPatient, setPlansModalPatient] = useState(null);
  const [reportsModalPatient, setReportsModalPatient] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [formData, setFormData] = useState({
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
    setLoading(true);
    try {
      // Fetch patients directly from patients table
      const { data, error } = await supabase.from('patients').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      // Map patient data to display format - include all fields
      const mappedData = (data || []).map((patient) => ({
        ...patient,
        patient_name: patient.name || '',
        main_disease: patient.primary_diagnosis || '',
        patient_address: patient.address || '',
        patient_contact: patient.contact || '',
        // Map all fields to match formData structure
        birth_date: patient.birth_date || '',
        key_person_name: patient.key_person_name || '',
        key_person_relationship: patient.key_person_relationship || '',
        key_person_address: patient.key_person_address || '',
        key_person_contact1: patient.key_person_contact1 || '',
        key_person_contact2: patient.key_person_contact2 || '',
        initial_visit_date: patient.initial_visit_date || '',
        initial_visit_start_hour: patient.initial_visit_start_hour || '',
        initial_visit_start_minute: patient.initial_visit_start_minute || '',
        initial_visit_end_hour: patient.initial_visit_end_hour || '',
        initial_visit_end_minute: patient.initial_visit_end_minute || '',
        medical_history: patient.medical_history || '',
        current_illness_history: patient.current_illness_history || '',
        family_structure: patient.family_structure || '',
        daily_life_meal_nutrition: patient.daily_life_meal_nutrition || '',
        daily_life_hygiene: patient.daily_life_hygiene || '',
        daily_life_medication: patient.daily_life_medication || '',
        daily_life_sleep: patient.daily_life_sleep || '',
        daily_life_living_environment: patient.daily_life_living_environment || '',
        daily_life_family_environment: patient.daily_life_family_environment || '',
        doctor_name: patient.doctor_name || '',
        hospital_name: patient.hospital_name || '',
        hospital_address: patient.hospital_address || '',
        hospital_phone: patient.hospital_phone || '',
        recorder_name: patient.recorder_name || '',
        notes: patient.individual_notes || ''
      }));
      setPatients(mappedData || []);
    } catch (error) {
      console.error('Fetch patients error:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      });
      const errorMessage = error?.message || error?.details || error?.hint || '不明なエラー';
      showToast(`患者情報の取得に失敗しました: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const filterPatients = useCallback(() => {
    let filtered = [...patients];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((patient) => patient.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (patient) =>
          patient.patient_name.toLowerCase().includes(query) ||
          (patient.main_disease && patient.main_disease.toLowerCase().includes(query)) ||
          (patient.individual_notes && patient.individual_notes.toLowerCase().includes(query))
      );
    }

    setFilteredPatients(filtered);

    // Apply pagination to filtered results
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (validPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setDisplayedRecords(filtered.slice(startIndex, endIndex));

    // Reset to page 1 if current page is out of bounds
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [patients, statusFilter, searchQuery, currentPage, pageSize]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    filterPatients();
  }, [filterPatients]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreate = () => {
    setEditingRecord(null);
    setCurrentStep(0);
    setFormData({
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
    setCurrentStep(0);
    setFormData({
      patient_name: record.patient_name || record.name || '',
      gender: record.gender || '',
      birth_date: record.birth_date || '',
      age: record.age ? String(record.age) : '',
      patient_address: record.patient_address || record.address || '',
      patient_contact: record.patient_contact || record.contact || '',
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
      main_disease: record.main_disease || record.primary_diagnosis || '',
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
      notes: record.notes || record.individual_notes || '',
      recorder_name: record.recorder_name || '',
      status: record.status || 'active'
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setProcessingId(null);
    setShowForm(false);
    setEditingRecord(null);
    setCurrentStep(0);
  };

  // Stepper configuration
  const steps = [
    { label: '患者情報', shortLabel: '患者' },
    { label: 'キーパーソン', shortLabel: 'キー' },
    { label: '初回訪問', shortLabel: '訪問' },
    { label: '医療情報', shortLabel: '医療' },
    { label: '日常生活', shortLabel: '生活' },
    { label: '主治医', shortLabel: '医師' },
    { label: 'その他', shortLabel: 'その他' },
  ];

  // Step validation
  const validateStep = (step) => {
    switch (step) {
      case 0: // Patient Information
        return !!formData.patient_name?.trim();
      case 1: // Key Person (optional)
        return true;
      case 2: // Initial Visit (optional)
        return true;
      case 3: // Medical Information (optional)
        return true;
      case 4: // Daily Life (optional)
        return true;
      case 5: // Doctor Information (optional)
        return true;
      case 6: // Additional Information (optional)
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
    if (e) e.preventDefault();
    if (!user?.id) return;

    // Validate required fields
    if (!formData.patient_name || !formData.patient_name.trim()) {
      showToast('利用者名は必須です', 'error');
      setCurrentStep(0); // Go back to first step if validation fails
      return;
    }

    setProcessingId(editingRecord?.id || 'new');
    try {
      // Prepare patient data - include ALL fields
      const patientData = {
        name: formData.patient_name.trim(),
        gender: formData.gender || null,
        age: formData.age ? parseInt(formData.age, 10) : null,
        primary_diagnosis: formData.main_disease?.trim() || null,
        birth_date: formData.birth_date || null,
        address: formData.patient_address?.trim() || null,
        contact: formData.patient_contact?.trim() || null,
        key_person_name: formData.key_person_name?.trim() || null,
        key_person_relationship: formData.key_person_relationship?.trim() || null,
        key_person_address: formData.key_person_address?.trim() || null,
        key_person_contact1: formData.key_person_contact1?.trim() || null,
        key_person_contact2: formData.key_person_contact2?.trim() || null,
        medical_history: formData.medical_history?.trim() || null,
        current_illness_history: formData.current_illness_history?.trim() || null,
        family_structure: formData.family_structure?.trim() || null,
        doctor_name: formData.doctor_name?.trim() || null,
        hospital_name: formData.hospital_name?.trim() || null,
        hospital_address: formData.hospital_address?.trim() || null,
        hospital_phone: formData.hospital_phone?.trim() || null,
        initial_visit_date: formData.initial_visit_date || null,
        initial_visit_start_hour: formData.initial_visit_start_hour ? parseInt(formData.initial_visit_start_hour, 10) : null,
        initial_visit_start_minute: formData.initial_visit_start_minute ? parseInt(formData.initial_visit_start_minute, 10) : null,
        initial_visit_end_hour: formData.initial_visit_end_hour ? parseInt(formData.initial_visit_end_hour, 10) : null,
        initial_visit_end_minute: formData.initial_visit_end_minute ? parseInt(formData.initial_visit_end_minute, 10) : null,
        daily_life_meal_nutrition: formData.daily_life_meal_nutrition?.trim() || null,
        daily_life_hygiene: formData.daily_life_hygiene?.trim() || null,
        daily_life_medication: formData.daily_life_medication?.trim() || null,
        daily_life_sleep: formData.daily_life_sleep?.trim() || null,
        daily_life_living_environment: formData.daily_life_living_environment?.trim() || null,
        daily_life_family_environment: formData.daily_life_family_environment?.trim() || null,
        recorder_name: formData.recorder_name?.trim() || null,
        individual_notes: formData.notes?.trim() || null,
        status: formData.status || 'active'
      };

      // Convert empty strings to null, but keep null values for updates
      // This allows clearing fields when updating
      Object.keys(patientData).forEach(key => {
        if (patientData[key] === '') {
          patientData[key] = null;
        }
      });
      
      // For create: remove null values (optional fields)
      // For update: keep null values to allow clearing fields
      if (!editingRecord) {
        Object.keys(patientData).forEach(key => {
          if (patientData[key] === null || patientData[key] === undefined) {
            delete patientData[key];
          }
        });
      }

      if (editingRecord) {
        // Update existing patient
        const { data, error } = await supabase
          .from('patients')
          .update(patientData)
          .eq('id', editingRecord.id)
          .eq('user_id', user.id)
          .select();

        if (error) {
          throw {
            message: error.message || '患者情報の更新に失敗しました',
            details: error.details || null,
            hint: error.hint || null,
            code: error.code || null,
          };
        }
        if (!data || data.length === 0) {
          throw { message: '更新されたデータが見つかりませんでした' };
        }
        showToast('患者情報を更新しました', 'success');
      } else {
        // Create new patient
        const { data, error } = await supabase
          .from('patients')
          .insert({
            user_id: user.id,
            ...patientData
          })
          .select();

        if (error) {
          throw {
            message: error.message || '患者情報の作成に失敗しました',
            details: error.details || null,
            hint: error.hint || null,
            code: error.code || null,
          };
        }
        if (!data || data.length === 0) {
          throw { message: '作成されたデータが見つかりませんでした' };
        }
        showToast('患者情報を作成しました', 'success');
      }

      handleCancel();
      await fetchPatients();
    } catch (error) {
      // Log full error details for debugging
      console.error('Save patient error:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', error ? Object.keys(error) : 'no keys');
      console.error('Error stringified:', JSON.stringify(error, null, 2));

      // Extract error message from error object
      let errorMessage = '不明なエラー';
      if (error) {
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.message) {
          errorMessage = error.message;
          // Add additional context if available
          if (error.details) {
            errorMessage += ` (詳細: ${error.details})`;
          } else if (error.hint) {
            errorMessage += ` (ヒント: ${error.hint})`;
          } else if (error.code) {
            errorMessage += ` (コード: ${error.code})`;
          }
        } else if (error.details) {
          errorMessage = error.details;
        } else if (error.hint) {
          errorMessage = error.hint;
        } else if (error.code) {
          errorMessage = `エラーコード: ${error.code}`;
        } else if (error.originalError) {
          // Try to extract from originalError
          const orig = error.originalError;
          if (orig.message) {
            errorMessage = orig.message;
          } else if (orig.details) {
            errorMessage = orig.details;
          } else if (orig.hint) {
            errorMessage = orig.hint;
          }
        } else {
          // Try toString as last resort
          try {
            const errorStr = String(error);
            if (errorStr !== '[object Object]') {
              errorMessage = errorStr;
            } else {
              // If it's an empty object, check if it's a database constraint error
              errorMessage = 'データベースエラーが発生しました。マイグレーションが実行されているか確認してください。';
            }
          } catch {
            // If all else fails, use default
            errorMessage = 'データベースエラーが発生しました。マイグレーションが実行されているか確認してください。';
          }
        }
      }
      showToast('保存に失敗しました: ' + errorMessage, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = (record) => {
    setConfirmDialog({
      isOpen: true,
      title: '患者情報の削除',
      message: `「${record.patient_name}」の患者情報を削除しますか？この操作は取り消せません。`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setProcessingId(record.id);
        try {
          if (!user?.id) {
            showToast('ユーザーが認証されていません', 'error');
            return;
          }
          
          // Try using backend API endpoint first (preferred)
          try {
            const { getSessionFromStorage } = await import('@/lib/sessionStorage');
            const session = getSessionFromStorage();
            if (session?.access_token) {
              const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
              const response = await fetch(`${BACKEND_URL}/patients/${record.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'ngrok-skip-browser-warning': 'true',
                },
              });
              
              if (response.ok || response.status === 204) {
                // 204 No Content means success
                showToast('患者情報を削除しました', 'success');
                fetchPatients();
                return;
              }
              
              // If not successful, try to get error message
              let errorMessage = `削除に失敗しました: ${response.status}`;
              try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
              } catch {
                // If JSON parsing fails, use status text
                errorMessage = response.statusText || errorMessage;
              }
              throw new Error(errorMessage);
            }
          } catch (apiError) {
            // If backend API is not available or failed, fallback to Supabase direct call
            console.warn('Backend API delete failed, trying Supabase direct:', apiError);
            // Continue to Supabase fallback below
          }
          
          // Fallback: Use Supabase directly
          const { data, error } = await supabase
            .from('patients')
            .delete()
            .eq('id', record.id)
            .eq('user_id', user.id)
            .select(); // Select to verify deletion

          if (error) {
            throw new Error(error.message || '削除に失敗しました');
          }
          
          // Check if any rows were actually deleted
          if (!data || data.length === 0) {
            throw new Error('削除する患者が見つかりませんでした');
          }
          
          showToast('患者情報を削除しました', 'success');
          fetchPatients();
        } catch (error) {
          console.error('Delete patient error:', error);
          const errorMessage = error instanceof Error ? error.message : (error?.message || '不明なエラー');
          showToast('削除に失敗しました: ' + errorMessage, 'error');
        } finally {
          setProcessingId(null);
        }
      },
      onCancel: () => {
        setConfirmDialog(null);
      }
    });
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
      {plansModalPatient && (
        <PatientPlansModal
          patientId={plansModalPatient.id}
          patientName={plansModalPatient.name}
          isOpen={!!plansModalPatient}
          onClose={() => setPlansModalPatient(null)}
        />
      )}
      {reportsModalPatient && (
        <PatientReportsModal
          patientId={reportsModalPatient.id}
          patientName={reportsModalPatient.name}
          isOpen={!!reportsModalPatient}
          onClose={() => setReportsModalPatient(null)}
        />
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">利用者基本情報</h1>
              <p className="mt-2 text-gray-600">患者情報の作成、編集、削除</p>
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
            <div className="mb-6 rounded-lg bg-white shadow" style={{ minHeight: 'calc(100vh - 200px)' }}>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingRecord ? '患者情報の編集' : '新規患者情報の作成'}
                  </h2>
                  <button
                    onClick={handleCancel}
                    className="btn btn-sm btn-outline-secondary"
                    disabled={!!processingId}
                  >
                    <i className="ph ph-x me-1"></i>
                    キャンセル
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
                <Stepper steps={steps} currentStep={currentStep}>
                  <div className="p-4 md:p-6">
                    {/* Step 0: Patient Information */}
                    {currentStep === 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">患者情報</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    )}

                    {/* Step 1: Key Person */}
                    {currentStep === 1 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">キーパーソン情報</h3>
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
                    )}

                    {/* Step 2: Initial Visit */}
                    {currentStep === 2 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">初回訪問情報</h3>
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
                    )}

                    {/* Step 3: Medical Information */}
                    {currentStep === 3 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">医療情報</h3>
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
                    )}

                    {/* Step 4: Daily Life Status */}
                    {currentStep === 4 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">日常生活状況</h3>
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
                    )}

                    {/* Step 5: Doctor Information */}
                    {currentStep === 5 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">主治医情報</h3>
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
                    )}

                    {/* Step 6: Additional Information */}
                    {currentStep === 6 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">その他</h3>
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
                  isSubmitting={!!processingId}
                  showSave={currentStep === steps.length - 1}
                />
              </form>
            </div>
          ) : (
            <>
              <CollapsibleSearchBar
                searchQuery={searchQuery}
                onSearchChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPage(1);
                }}
                statusFilter={statusFilter}
                onStatusFilterChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              />
            </>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <i className="ph ph-user text-4xl text-gray-400"></i>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">患者情報が見つかりません</h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== 'all'
                ? '検索条件に一致する患者情報がありません。'
                : '患者情報を作成してください。'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop: Table View */}
            <div className="hidden md:block overflow-hidden rounded-lg bg-white shadow">
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
                    {displayedRecords.map((record) => (
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
                              onClick={() => setPlansModalPatient({ id: record.id, name: record.patient_name })}
                              className="text-green-600 hover:text-green-900"
                              title="計画書"
                            >
                              <i className="ph ph-file-text"></i>
                            </button>
                            <button
                              onClick={() => setReportsModalPatient({ id: record.id, name: record.patient_name })}
                              className="text-blue-600 hover:text-blue-900"
                              title="月次報告書"
                            >
                              <i className="ph ph-file-doc"></i>
                            </button>
                            <button
                              onClick={() => {
                                setPreviewPatientId(record.id);
                                setShowPdfModal(true);
                              }}
                              className="text-purple-600 hover:text-purple-900"
                              title="PDF操作を表示"
                            >
                              <i className="ph ph-file-pdf"></i>
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
            </div>

            {/* Mobile: Card View */}
            <div className="md:hidden space-y-4">
              {displayedRecords.map((record) => (
                <PatientCard
                  key={record.id}
                  patient={record}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPlans={() => setPlansModalPatient({ id: record.id, name: record.patient_name })}
                  onReports={() => setReportsModalPatient({ id: record.id, name: record.patient_name })}
                  onPdfPreview={() => {
                    setPreviewPatientId(record.id);
                    setShowPdfModal(true);
                  }}
                  isProcessing={processingId === record.id}
                  showPdfControls={previewPatientId === record.id && showPdfModal}
                />
              ))}
            </div>

            {/* PDF Preview Modal */}
            {previewPatientId && (
              <PDFPreviewModal
                patientId={previewPatientId}
                isOpen={showPdfModal}
                onClose={() => {
                  setShowPdfModal(false);
                  setPreviewPatientId(null);
                  setPdfPreviewUrl(null);
                }}
                pdfPreviewUrl={pdfPreviewUrl}
                onPreviewReady={setPdfPreviewUrl}
              />
            )}

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 rounded-lg">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-500">
                  全 {filteredPatients.length} 件中 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredPatients.length)} 件を表示
                </div>
                
                {/* Pagination Controls */}
                {Math.ceil(filteredPatients.length / pageSize) > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="btn btn-outline-secondary btn-sm"
                    >
                      <i className="ph ph-arrow-left me-1"></i>
                      前へ
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, Math.ceil(filteredPatients.length / pageSize)) }, (_, i) => {
                        const totalPages = Math.ceil(filteredPatients.length / pageSize);
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`btn btn-sm ${
                              currentPage === pageNum
                                ? 'btn-primary'
                                : 'btn-outline-secondary'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredPatients.length / pageSize), prev + 1))}
                      disabled={currentPage >= Math.ceil(filteredPatients.length / pageSize)}
                      className="btn btn-outline-secondary btn-sm"
                    >
                      次へ
                      <i className="ph ph-arrow-right ms-1"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (Mobile Only) */}
      {!showForm && <FloatingActionButton onClick={handleCreate} />}
    </>
  );
}
