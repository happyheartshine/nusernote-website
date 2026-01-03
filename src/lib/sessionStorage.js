/**
 * Utility functions for managing session in localStorage
 */

const SESSION_STORAGE_KEY = 'nursenote_session';

/**
 * Save session to localStorage
 * @param {Object} session - The session object from Supabase
 */
export const saveSessionToStorage = (session) => {
  if (typeof window === 'undefined') return;

  try {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error saving session to localStorage:', error);
  }
};

/**
 * Get session from localStorage
 * @returns {Object|null} The session object or null if not found
 */
export const getSessionFromStorage = () => {
  if (typeof window === 'undefined') return null;

  try {
    const sessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionStr) {
      return JSON.parse(sessionStr);
    }
    return null;
  } catch (error) {
    console.error('Error reading session from localStorage:', error);
    return null;
  }
};

/**
 * Remove session from localStorage
 */
export const removeSessionFromStorage = () => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error('Error removing session from localStorage:', error);
  }
};
