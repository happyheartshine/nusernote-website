/**
 * API utility functions for Report endpoints
 */

import { getSessionFromStorage } from './sessionStorage';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

/**
 * Get auth headers for API requests
 */
function getAuthHeaders() {
  const session = getSessionFromStorage();
  if (!session) {
    throw new Error('認証が必要です。再度ログインしてください。');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    'ngrok-skip-browser-warning': 'true',
  };
}

/**
 * Format error message from API response
 */
function formatErrorMessage(errorData) {
  if (errorData.error) {
    return typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
  }
  
  if (errorData.detail) {
    // Handle FastAPI validation errors (array of objects)
    if (Array.isArray(errorData.detail)) {
      return errorData.detail
        .map(err => {
          const field = err.loc ? err.loc.slice(1).join('.') : 'field';
          return `${field}: ${err.msg}`;
        })
        .join(', ');
    }
    // Handle string detail
    if (typeof errorData.detail === 'string') {
      return errorData.detail;
    }
    // Handle object detail
    return JSON.stringify(errorData.detail);
  }
  
  return 'エラーが発生しました';
}

/**
 * Fetch reports for a patient
 * @param {string} patientId - Patient ID
 * @param {string} yearMonth - Optional year-month filter (YYYY-MM format)
 */
export async function fetchPatientReports(patientId, yearMonth = null) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  let url = `${BACKEND_URL}/patients/${patientId}/reports`;
  if (yearMonth) {
    url += `?year_month=${yearMonth}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'エラーが発生しました' }));
    const errorMessage = formatErrorMessage(errorData);
    throw new Error(errorMessage || `APIエラー: ${response.status}`);
  }

  return await response.json();
}

/**
 * Create a new report for a patient
 * @param {string} patientId - Patient ID
 * @param {object} reportData - Report data (must include year_month)
 */
export async function createPatientReport(patientId, reportData) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/patients/${patientId}/reports`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(reportData),
  });

  if (!response.ok) {
    let errorData;
    const contentType = response.headers.get('content-type');
    try {
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        const text = await response.text();
        errorData = { 
          error: text || `HTTP ${response.status}: ${response.statusText}`,
          detail: text || response.statusText
        };
      }
    } catch {
      errorData = { 
        error: `HTTP ${response.status}: ${response.statusText}`,
        detail: response.statusText
      };
    }
    const errorMessage = formatErrorMessage(errorData);
    
    // Log full error details - expand all nested objects
    console.error('=== Report Creation Error ===');
    console.error('Status:', response.status, response.statusText);
    console.error('Content-Type:', contentType);
    console.error('Error Data (full):', JSON.stringify(errorData, null, 2));
    console.error('Error Detail:', errorData?.detail);
    console.error('Error Error:', errorData?.error);
    console.error('Request Data:', JSON.stringify(reportData, null, 2));
    console.error('URL:', `${BACKEND_URL}/patients/${patientId}/reports`);
    console.error('===========================');
    
    // Extract the most useful error message
    let detailedError = errorMessage;
    if (errorData?.detail) {
      detailedError = typeof errorData.detail === 'string' 
        ? errorData.detail 
        : JSON.stringify(errorData.detail);
    } else if (errorData?.error) {
      detailedError = typeof errorData.error === 'string'
        ? errorData.error
        : JSON.stringify(errorData.error);
    }
    
    throw new Error(detailedError || `APIエラー: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch a single report by ID
 * @param {string} reportId - Report ID
 */
export async function fetchReport(reportId) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/reports/${reportId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'エラーが発生しました' }));
    const errorMessage = formatErrorMessage(errorData);
    throw new Error(errorMessage || `APIエラー: ${response.status}`);
  }

  return await response.json();
}

/**
 * Update a report
 * @param {string} reportId - Report ID
 * @param {object} reportData - Report data to update
 */
export async function updateReport(reportId, reportData) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/reports/${reportId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(reportData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'エラーが発生しました' }));
    const errorMessage = formatErrorMessage(errorData);
    throw new Error(errorMessage || `APIエラー: ${response.status}`);
  }

  return await response.json();
}

/**
 * Regenerate report (auto-generate/recalculate)
 * @param {string} reportId - Report ID
 * @param {boolean} force - Force regenerate even if fields are already edited (default: false)
 */
export async function regenerateReport(reportId, force = false) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/reports/${reportId}/regenerate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ force }),
  });

  if (!response.ok) {
    let errorData;
    const contentType = response.headers.get('content-type');
    try {
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        const text = await response.text();
        errorData = { 
          error: text || `HTTP ${response.status}: ${response.statusText}`,
          detail: text || response.statusText
        };
      }
    } catch {
      errorData = { 
        error: `HTTP ${response.status}: ${response.statusText}`,
        detail: response.statusText
      };
    }
    const errorMessage = formatErrorMessage(errorData);
    throw new Error(errorMessage || `APIエラー: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Delete a report
 * @param {string} reportId - Report ID
 */
export async function deleteReport(reportId) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/reports/${reportId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'エラーが発生しました' }));
    const errorMessage = formatErrorMessage(errorData);
    throw new Error(errorMessage || `APIエラー: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get PDF URL for report
 * @param {string} reportId - Report ID
 */
export function getReportPdfUrl(reportId) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }
  return `${BACKEND_URL}/reports/${reportId}/pdf`;
}

/**
 * Fetch all reports (for list page)
 * Note: This may need to be implemented via Supabase or a backend endpoint
 * For now, we'll fetch from Supabase directly if backend endpoint doesn't exist
 */
export async function fetchAllReports() {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/reports`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'エラーが発生しました' }));
    const errorMessage = formatErrorMessage(errorData);
    throw new Error(errorMessage || `APIエラー: ${response.status}`);
  }

  return await response.json();
}
