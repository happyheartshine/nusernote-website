'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSessionFromStorage } from '@/lib/sessionStorage';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
const FILTERS_STORAGE_KEY = 'nursenote_records_filters';

function formatDate(dateString) {
  try {
    // Handle YYYY-MM-DD format directly to avoid timezone issues
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateString)) {
      const [year, month, day] = dateString.split('T')[0].split('-');
      return `${year}/${month}/${day}`;
    }
    // Fallback for other formats
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  } catch {
    return dateString;
  }
}

// Load filters from localStorage
function loadFiltersFromStorage() {
  if (typeof window === 'undefined') return { dateFrom: '', dateTo: '', assignedNurse: '' };
  
  try {
    const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading filters from localStorage:', error);
  }
  return { dateFrom: '', dateTo: '', assignedNurse: '' };
}

// Save filters to localStorage
function saveFiltersToStorage(filters) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.error('Error saving filters to localStorage:', error);
  }
}

export default function RecordsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]); // Store all records to extract unique nurses
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Initialize filters from URL params or localStorage
  const savedFilters = useMemo(() => loadFiltersFromStorage(), []);
  const [dateFrom, setDateFrom] = useState(() => {
    return searchParams.get('dateFrom') || savedFilters.dateFrom;
  });
  const [dateTo, setDateTo] = useState(() => {
    return searchParams.get('dateTo') || savedFilters.dateTo;
  });
  const [assignedNurse, setAssignedNurse] = useState(() => {
    return searchParams.get('assignedNurse') || savedFilters.assignedNurse;
  });

  // Extract unique nurse names from all records
  const nurseNames = useMemo(() => {
    const nurses = new Set();
    allRecords.forEach((record) => {
      if (record.nurses && Array.isArray(record.nurses)) {
        record.nurses.forEach((nurse) => nurses.add(nurse));
      }
    });
    return Array.from(nurses).sort();
  }, [allRecords]);

  const patientNames = useMemo(() => {
    const uniqueNames = Array.from(new Set(records.map((r) => r.patient_name)));
    return uniqueNames.sort();
  }, [records]);

  const fetchRecords = useCallback(async (filterParams = {}) => {
    if (!BACKEND_URL) {
      setError('バックエンドURLが設定されていません');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const session = getSessionFromStorage();
      if (!session) {
        setError('認証が必要です。再度ログインしてください。');
        setLoading(false);
        return;
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (filterParams.dateFrom) {
        params.append('date_from', filterParams.dateFrom);
      }
      if (filterParams.dateTo) {
        params.append('date_to', filterParams.dateTo);
      }
      if (filterParams.assignedNurse) {
        params.append('nurse_name', filterParams.assignedNurse);
      }

      const url = `${BACKEND_URL}/records${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', {
          url,
          status: response.status,
          contentType,
          preview: text.substring(0, 200),
        });
        throw new Error(
          `バックエンドサーバーに接続できません。URLを確認してください: ${BACKEND_URL || '未設定'}`
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'エラーが発生しました' }));
        throw new Error(errorData.error || errorData.detail || `APIエラー: ${response.status}`);
      }

      const data = await response.json();
      setRecords(data.records || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching records:', err);
      setError(err instanceof Error ? err.message : '記録の取得中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all records on initial mount (to populate nurse filter dropdown)
  useEffect(() => {
    const fetchAllRecords = async () => {
      if (!BACKEND_URL) return;

      try {
        const session = getSessionFromStorage();
        if (!session) return;

        const response = await fetch(`${BACKEND_URL}/records`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'ngrok-skip-browser-warning': 'true',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAllRecords(data.records || []);
        }
      } catch (err) {
        console.error('Error fetching all records for nurse list:', err);
      }
    };

    fetchAllRecords();
  }, []);

  // Fetch records with current filters on mount and when returning from detail view
  useEffect(() => {
    const filters = { dateFrom, dateTo, assignedNurse };
    fetchRecords(filters);
  }, [fetchRecords, dateFrom, dateTo, assignedNurse]);

  // Handle filter changes
  const handleApplyFilters = () => {
    const filters = { dateFrom, dateTo, assignedNurse };
    saveFiltersToStorage(filters);
    
    // Update URL with filter params
    updateURLWithFilters(filters);
    
    fetchRecords(filters);
  };

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setAssignedNurse('');
    const emptyFilters = { dateFrom: '', dateTo: '', assignedNurse: '' };
    saveFiltersToStorage(emptyFilters);
    
    // Clear URL params
    updateURLWithFilters(emptyFilters);
    
    fetchRecords(emptyFilters);
  };

  // Update URL with current filter state
  const updateURLWithFilters = (filters) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'records');
    
    if (filters.dateFrom) {
      params.set('dateFrom', filters.dateFrom);
    } else {
      params.delete('dateFrom');
    }
    
    if (filters.dateTo) {
      params.set('dateTo', filters.dateTo);
    } else {
      params.delete('dateTo');
    }
    
    if (filters.assignedNurse) {
      params.set('assignedNurse', filters.assignedNurse);
    } else {
      params.delete('assignedNurse');
    }
    
    router.push(`/ai?${params.toString()}`, { scroll: false });
  };

  // Handle record click - navigate to detail page with filter state
  const handleRecordClick = (recordId) => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (assignedNurse) params.set('assignedNurse', assignedNurse);
    
    const queryString = params.toString();
    router.push(`/ai/records/${recordId}${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <div className="space-y-6">
      {/* {!loading && !error && patientNames.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h5>月次レポートPDF生成</h5>
          </div>
          <div className="card-body">
            <div className="mb-4">
              <label htmlFor="patient-select" className="mb-2 block text-sm font-medium">
                利用者を選択
              </label>
              <select
                id="patient-select"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="form-control"
              >
                {patientNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPatientId && <MonthlyReportPDF patientId={selectedPatientId} />}
          </div>
        </div>
      )} */}

      <div className="card">
        <div className="card-header">
          <h5>記録一覧</h5>
        </div>
        <div className="card-body">
          {/* Filter Controls */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="filter-date-from" className="mb-2 block text-sm font-medium">
                  訪問日（開始）
                </label>
                <input
                  type="date"
                  id="filter-date-from"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="form-control"
                />
              </div>

              <div>
                <label htmlFor="filter-date-to" className="mb-2 block text-sm font-medium">
                  訪問日（終了）
                </label>
                <input
                  type="date"
                  id="filter-date-to"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="form-control"
                />
              </div>

              <div>
                <label htmlFor="filter-nurse" className="mb-2 block text-sm font-medium">
                  担当看護師
                </label>
                <select
                  id="filter-nurse"
                  value={assignedNurse}
                  onChange={(e) => setAssignedNurse(e.target.value)}
                  className="form-control"
                >
                  <option value="">すべて</option>
                  {nurseNames.map((nurse) => (
                    <option key={nurse} value={nurse}>
                      {nurse}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="btn btn-primary"
                disabled={loading}
              >
                <i className="ph ph-funnel me-2"></i>
                フィルター適用
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn btn-outline-secondary"
                disabled={loading}
              >
                <i className="ph ph-x me-2"></i>
                クリア
              </button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                <p className="mt-4 text-sm text-muted">読み込み中...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              <i className="ph ph-warning-circle"></i>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && records.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted">記録がありません</p>
            </div>
          )}

          {!loading && !error && records.length > 0 && (
            <div className="space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  onClick={() => handleRecordClick(record.id)}
                  className="card cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="card-body">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="badge bg-primary"></span>
                          <p className="font-semibold">
                            {formatDate(record.visit_date)}　{record.patient_name}
                          </p>
                        </div>
                        {record.chief_complaint && (
                          <p className="text-sm text-muted ms-4">主訴：{record.chief_complaint}</p>
                        )}
                      </div>
                      <i className="ph ph-arrow-right text-muted"></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

