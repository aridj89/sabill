// Centralized API configuration
// Always calls the deployed backend API via process.env.REACT_APP_API_URL (or VITE_API_URL)
const getBaseUrl = () => {
  // 1. Injected via process.env.REACT_APP_API_URL
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // 2. Vite environment variable import.meta.env.VITE_API_URL
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // 3. Fallback to local Express server
  return 'http://localhost:5000';
};

export const API_BASE_URL = getBaseUrl().replace(/\/+$/, '');

export const API_ENDPOINTS = {
  data: `${API_BASE_URL}/api/data`,
  login: `${API_BASE_URL}/api/auth/login`,
  reset: `${API_BASE_URL}/api/reset`,
  nfc: `${API_BASE_URL}/api/nfc`,
};
