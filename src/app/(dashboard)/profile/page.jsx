'use client';

import { useState, useEffect } from 'react';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { supabase } from '@/lib/supabase';

// ==============================|| PROFILE PAGE ||============================== //

export default function ProfilePage() {
  const { profile, loading: profileLoading, refetchProfile } = useAuthProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birthday: '',
    gender: '',
    address: ''
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      // Handle birthday timezone - convert to local date string (YYYY-MM-DD)
      let birthdayValue = '';
      if (profile.birthday) {
        // If birthday is a date string, parse it and format as YYYY-MM-DD
        // This ensures we get the correct date regardless of timezone
        const date = new Date(profile.birthday);
        if (!isNaN(date.getTime())) {
          // Get local date components to avoid timezone issues
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          birthdayValue = `${year}-${month}-${day}`;
        }
      }

      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        birthday: birthdayValue,
        gender: profile.gender || '',
        address: profile.address || ''
      });
    }
  }, [profile]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCancel = () => {
    // Reset form data to original profile values
    if (profile) {
      // Handle birthday timezone - convert to local date string (YYYY-MM-DD)
      let birthdayValue = '';
      if (profile.birthday) {
        const date = new Date(profile.birthday);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          birthdayValue = `${year}-${month}-${day}`;
        }
      }

      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        birthday: birthdayValue,
        gender: profile.gender || '',
        address: profile.address || ''
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build update object with only fields that have values
      const updateData = {};
      
      // Handle first_name
      if (formData.first_name !== undefined) {
        updateData.first_name = formData.first_name.trim() || null;
      }
      
      // Handle last_name
      if (formData.last_name !== undefined) {
        updateData.last_name = formData.last_name.trim() || null;
      }
      
      // Handle birthday - ensure we send it as a date string in YYYY-MM-DD format
      // This avoids timezone issues since DATE type doesn't store timezone
      if (formData.birthday !== undefined && formData.birthday !== '') {
        // Validate the date format and ensure it's in YYYY-MM-DD format
        const dateMatch = formData.birthday.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateMatch) {
          updateData.birthday = formData.birthday;
        } else {
          showToast('生年月日の形式が正しくありません', 'error');
          setSaving(false);
          return;
        }
      } else if (formData.birthday === '') {
        updateData.birthday = null;
      }
      
      // Handle gender
      if (formData.gender !== undefined) {
        updateData.gender = formData.gender || null;
      }
      
      // Handle address
      if (formData.address !== undefined) {
        updateData.address = formData.address.trim() || null;
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        showToast('変更がありません', 'error');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id)
        .select();

      if (error) {
        console.error('Profile update error:', error);
        showToast('更新に失敗しました: ' + (error.message || '不明なエラー'), 'error');
        return;
      }

      showToast('プロフィールを更新しました', 'success');
      setIsEditing(false);
      await refetchProfile();
    } catch (error) {
      console.error('Profile update error:', error);
      showToast('更新に失敗しました: ' + (error.message || '不明なエラー'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '未設定';
    // Handle date string (YYYY-MM-DD) or Date object
    // Parse as local date to avoid timezone issues
    const date = new Date(dateString + 'T00:00:00'); // Add time to avoid UTC conversion
    if (isNaN(date.getTime())) return '未設定';
    
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Tokyo'
    });
  };

  // Helper function to get full name
  const getFullName = () => {
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    const fullName = `${lastName} ${firstName}`.trim();
    return fullName || '名前未設定';
  };

  // Helper function to get name initial
  const getNameInitial = () => {
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    if (lastName) return lastName.charAt(0).toUpperCase();
    if (firstName) return firstName.charAt(0).toUpperCase();
    return profile.email.charAt(0).toUpperCase();
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    const labels = {
      pending: '承認待ち',
      approved: '承認済み',
      rejected: '却下'
    };
    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getRoleLabel = (role) => {
    return role === 'admin' ? '管理者' : '看護師';
  };

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">プロフィールが見つかりません</h3>
          <p className="text-gray-600">プロフィール情報を取得できませんでした。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {toast && (
        <div
          className={`alert mb-6 ${toast.type === 'success' ? 'alert-success' : 'alert-danger'}`}
          role="alert"
        >
          <i className={`ph ${toast.type === 'success' ? 'ph-check-circle' : 'ph-x-circle'}`}></i>
          <div>{toast.message}</div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">プロフィール</h1>
          <p className="mt-2 text-gray-600">あなたのプロフィール情報を管理します</p>
        </div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="btn btn-primary">
            <i className="ph ph-pencil me-2"></i>
            編集
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-blue-100">
                <span className="text-3xl font-bold text-blue-600">
                  {getNameInitial()}
                </span>
              </div>
              <h2 className="mb-1 text-xl font-semibold text-gray-900">{getFullName()}</h2>
              <p className="mb-4 text-sm text-gray-500">{profile.email}</p>
              <div className="space-y-2">
                {getStatusBadge(profile.status)}
                <div className="text-sm text-gray-600">
                  <span className="font-medium">役割:</span> {getRoleLabel(profile.role)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="space-y-6">
              {/* Email - Read Only */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">メールアドレス</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="form-control cursor-not-allowed bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-500">メールアドレスは変更できません</p>
              </div>

              {/* Role - Read Only */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">役割</label>
                <input
                  type="text"
                  value={getRoleLabel(profile.role)}
                  disabled
                  className="form-control cursor-not-allowed bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-500">役割は管理者のみ変更可能です</p>
              </div>

              {/* Status - Read Only */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">ステータス</label>
                <div className="mt-2">{getStatusBadge(profile.status)}</div>
                <p className="mt-1 text-xs text-gray-500">ステータスは管理者のみ変更可能です</p>
              </div>

              {/* Name - First Name and Last Name on one line */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Last Name - Editable */}
                <div>
                  <label htmlFor="last_name" className="mb-2 block text-sm font-medium text-gray-700">
                    姓（名字） <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      id="last_name"
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="姓を入力してください"
                    />
                  ) : (
                    <div className="rounded border border-gray-200 bg-gray-50 px-4 py-2.5 text-base">
                      {profile.last_name || '未設定'}
                    </div>
                  )}
                </div>

                {/* First Name - Editable */}
                <div>
                  <label htmlFor="first_name" className="mb-2 block text-sm font-medium text-gray-700">
                    名（名前） <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      id="first_name"
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="名を入力してください"
                    />
                  ) : (
                    <div className="rounded border border-gray-200 bg-gray-50 px-4 py-2.5 text-base">
                      {profile.first_name || '未設定'}
                    </div>
                  )}
                </div>
              </div>

              {/* Birthday - Editable */}
              <div>
                <label htmlFor="birthday" className="mb-2 block text-sm font-medium text-gray-700">
                  生年月日
                </label>
                {isEditing ? (
                  <input
                    id="birthday"
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleInputChange}
                    className="form-control"
                    max={new Date().toISOString().split('T')[0]}
                  />
                ) : (
                  <div className="rounded border border-gray-200 bg-gray-50 px-4 py-2.5 text-base">
                    {formatDate(profile.birthday)}
                  </div>
                )}
              </div>

              {/* Gender - Editable */}
              <div>
                <label htmlFor="gender" className="mb-2 block text-sm font-medium text-gray-700">
                  性別
                </label>
                {isEditing ? (
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
                    <option value="prefer_not_to_say">回答しない</option>
                  </select>
                ) : (
                  <div className="rounded border border-gray-200 bg-gray-50 px-4 py-2.5 text-base">
                    {profile.gender === 'male'
                      ? '男性'
                      : profile.gender === 'female'
                        ? '女性'
                        : profile.gender === 'other'
                          ? 'その他'
                          : profile.gender === 'prefer_not_to_say'
                            ? '回答しない'
                            : '未設定'}
                  </div>
                )}
              </div>

              {/* Address - Editable */}
              <div>
                <label htmlFor="address" className="mb-2 block text-sm font-medium text-gray-700">
                  住所
                </label>
                {isEditing ? (
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    className="form-control"
                    placeholder="住所を入力してください"
                  />
                ) : (
                  <div className="rounded border border-gray-200 bg-gray-50 px-4 py-2.5 text-base whitespace-pre-wrap">
                    {profile.address || '未設定'}
                  </div>
                )}
              </div>

              {/* Account Info - Read Only */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">アカウント情報</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-500">登録日</label>
                    <div className="text-sm text-gray-900">{formatDate(profile.created_at)}</div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-500">最終更新日</label>
                    <div className="text-sm text-gray-900">{formatDate(profile.updated_at)}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="btn btn-secondary"
                    type="button"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                    type="button"
                  >
                    {saving ? (
                      <>
                        <span className="me-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                        保存中...
                      </>
                    ) : (
                      <>
                        <i className="ph ph-check me-2"></i>
                        保存
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

