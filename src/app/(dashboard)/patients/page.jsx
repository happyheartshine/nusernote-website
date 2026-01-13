'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import ConfirmDialog from '@/components/ConfirmDialog';
import { supabase } from '@/lib/supabase';

// ==============================|| PATIENTS PAGE ||============================== //

export default function PatientsPage() {
  const { user } = useAuthProfile();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    primary_diagnosis: '',
    individual_notes: '',
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
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Fetch patients error:', error);
      showToast('患者の取得に失敗しました', 'error');
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
          patient.name.toLowerCase().includes(query) ||
          (patient.primary_diagnosis && patient.primary_diagnosis.toLowerCase().includes(query)) ||
          (patient.individual_notes && patient.individual_notes.toLowerCase().includes(query))
      );
    }

    setFilteredPatients(filtered);
  }, [patients, statusFilter, searchQuery]);

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
    setEditingPatient(null);
    setFormData({
      name: '',
      age: '',
      gender: '',
      primary_diagnosis: '',
      individual_notes: '',
      status: 'active'
    });
    setShowForm(true);
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name || '',
      age: patient.age ? String(patient.age) : '',
      gender: patient.gender || '',
      primary_diagnosis: patient.primary_diagnosis || '',
      individual_notes: patient.individual_notes || '',
      status: patient.status || 'active'
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPatient(null);
    setFormData({
      name: '',
      age: '',
      gender: '',
      primary_diagnosis: '',
      individual_notes: '',
      status: 'active'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    setProcessingId(editingPatient?.id || 'new');
    try {
      const updateData = {
        name: formData.name.trim(),
        age: formData.age ? parseInt(formData.age, 10) : null,
        gender: formData.gender || null,
        primary_diagnosis: formData.primary_diagnosis.trim() || null,
        individual_notes: formData.individual_notes.trim() || null,
        status: formData.status
      };

      if (editingPatient) {
        // Update existing patient
        const { error } = await supabase
          .from('patients')
          .update(updateData)
          .eq('id', editingPatient.id)
          .eq('user_id', user.id);

        if (error) throw error;
        showToast('患者を更新しました', 'success');
      } else {
        // Create new patient
        const { error } = await supabase.from('patients').insert({
          user_id: user.id,
          ...updateData
        });

        if (error) throw error;
        showToast('患者を作成しました', 'success');
      }

      handleCancel();
      fetchPatients();
    } catch (error) {
      console.error('Save patient error:', error);
      showToast('保存に失敗しました: ' + (error.message || '不明なエラー'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = (patient) => {
    setConfirmDialog({
      isOpen: true,
      title: '患者の削除',
      message: `「${patient.name}」を削除しますか？この操作は取り消せません。`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setProcessingId(patient.id);
        try {
          const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', patient.id)
            .eq('user_id', user.id);

          if (error) throw error;
          showToast('患者を削除しました', 'success');
          fetchPatients();
        } catch (error) {
          console.error('Delete patient error:', error);
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

  const formatDate = (dateString) => {
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
              <h1 className="text-3xl font-bold text-gray-900">患者管理</h1>
              <p className="mt-2 text-gray-600">患者の作成、編集、削除</p>
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
                {editingPatient ? '患者の編集' : '新規患者の作成'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                      患者名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="患者名を入力してください"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                        placeholder="年齢"
                        min="0"
                        max="150"
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
                        <option value="other">その他</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="primary_diagnosis" className="mb-2 block text-sm font-medium text-gray-700">
                      主疾患
                    </label>
                    <input
                      id="primary_diagnosis"
                      type="text"
                      name="primary_diagnosis"
                      value={formData.primary_diagnosis}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="主疾患を入力してください"
                    />
                  </div>

                  <div>
                    <label htmlFor="individual_notes" className="mb-2 block text-sm font-medium text-gray-700">
                      個別メモ
                    </label>
                    <textarea
                      id="individual_notes"
                      name="individual_notes"
                      value={formData.individual_notes}
                      onChange={handleInputChange}
                      rows={4}
                      className="form-control"
                      placeholder="個別メモを入力してください（任意）"
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

                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={handleCancel} className="btn btn-secondary" disabled={processingId}>
                    キャンセル
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={processingId}>
                    {processingId ? (
                      <span className="flex items-center">
                        <span className="me-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                        保存中...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <i className="ph ph-check me-2"></i>
                        {editingPatient ? '更新' : '作成'}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        ) : filteredPatients.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <i className="ph ph-user text-4xl text-gray-400"></i>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">患者が見つかりません</h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== 'all' ? '検索条件に一致する患者がいません。' : '患者を作成してください。'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">患者名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">年齢</th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">性別</th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">主疾患</th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">ステータス</th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">作成日</th>
                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{patient.age ? `${patient.age}歳` : '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {patient.gender === 'male' ? '男性' : patient.gender === 'female' ? '女性' : patient.gender === 'other' ? 'その他' : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs text-sm text-gray-500">
                          {patient.primary_diagnosis || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(patient.status)}</td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{formatDate(patient.created_at)}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(patient)}
                            disabled={processingId === patient.id}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title="編集"
                          >
                            <i className="ph ph-pencil"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(patient)}
                            disabled={processingId === patient.id}
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
            <div className="bg-gray-50 px-6 py-3 text-sm text-gray-500">全 {filteredPatients.length} 件の患者</div>
          </div>
        )}
      </div>
    </>
  );
}

