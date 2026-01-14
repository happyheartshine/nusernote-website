/**
 * API utility functions for Plan endpoints
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
 * Fetch plans for a patient
 */
export async function fetchPatientPlans(patientId) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/patients/${patientId}/plans`, {
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
 * Create a new plan for a patient
 */
export async function createPlan(patientId, planData) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/patients/${patientId}/plans`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(planData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'エラーが発生しました' }));
    const errorMessage = formatErrorMessage(errorData);
    throw new Error(errorMessage || `APIエラー: ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetch a single plan by ID
 */
export async function fetchPlan(planId) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/plans/${planId}`, {
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
 * Update a plan
 */
export async function updatePlan(planId, planData) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/plans/${planId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(planData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'エラーが発生しました' }));
    const errorMessage = formatErrorMessage(errorData);
    throw new Error(errorMessage || `APIエラー: ${response.status}`);
  }

  return await response.json();
}

/**
 * Mark plan as hospitalized (ends plan)
 */
export async function hospitalizePlan(planId, hospitalizationData) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/plans/${planId}/hospitalize`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(hospitalizationData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'エラーが発生しました' }));
    const errorMessage = formatErrorMessage(errorData);
    throw new Error(errorMessage || `APIエラー: ${response.status}`);
  }

  return await response.json();
}

/**
 * Auto-evaluate plan evaluations
 */
export async function autoEvaluatePlan(planId) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/plans/${planId}/auto-evaluate`, {
    method: 'POST',
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
 * Fetch all plans (for list page)
 * Note: This endpoint doesn't exist in the backend yet.
 * The frontend should fetch plans directly from Supabase instead.
 * Keeping this function for potential future use.
 */
export async function fetchAllPlans() {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/plans`, {
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
 * Delete a plan
 */
export async function deletePlan(planId) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }

  const response = await fetch(`${BACKEND_URL}/plans/${planId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'エラーが発生しました' }));
    const errorMessage = formatErrorMessage(errorData);
    throw new Error(errorMessage || `APIエラー: ${response.status}`);
  }

  return; // 204 No Content
}

/**
 * Get PDF URL for plan
 */
export function getPlanPdfUrl(planId) {
  if (!BACKEND_URL) {
    throw new Error('バックエンドURLが設定されていません');
  }
  return `${BACKEND_URL}/plans/${planId}/pdf`;
}
