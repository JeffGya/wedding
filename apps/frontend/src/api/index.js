import axios from 'axios'
import { useLoaderStore } from '@/store/loader';

// Axios instance preconfigured for backend API requests
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true // Include cookies for authentication
})

// Wire loader store for API calls that set meta.showLoader

api.interceptors.request.use(
  (config) => {
    if (config.meta?.showLoader) {
      useLoaderStore().start();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response.config.meta?.showLoader) {
      useLoaderStore().finish();
    }
    return response;
  },
  (error) => {
    if (error.config?.meta?.showLoader) {
      useLoaderStore().finish();
    }
    
    // Silently handle 401/403 errors for specific endpoints (expected when no session exists)
    const enableLogs = String(import.meta.env.VITE_ENABLE_LOGS || '').trim().toLowerCase() === 'true';
    const status = error.response?.status;
    const url = error.config?.url || '';
    
    // Endpoints that should have silent 401/403 errors
    const silentEndpoints = ['/api/me', '/api/rsvp/session'];
    const isSilentEndpoint = silentEndpoints.some(endpoint => url.includes(endpoint));
    
    if ((status === 401 || status === 403) && isSilentEndpoint) {
      // Only log if VITE_ENABLE_LOGS is enabled
      if (enableLogs) {
        console.error(`[API] ${status} ${url}:`, error.response?.data || error.message);
      }
      // Still reject the promise, but silently
      return Promise.reject(error);
    }
    
    // For all other errors, log normally
    return Promise.reject(error);
  }
);

export default api

// Fetch current email settings
export async function getEmailSettings() {
  const response = await api.get(
    '/email-settings',
    { meta: { showLoader: true } }
  )
  return response.data
}

// Update email settings with provided data
export async function updateEmailSettings(data) {
  const response = await api.post(
    '/email-settings',
    data,
    { meta: { showLoader: true } }
  )
  return response.data
}

/**
 * Fetch global RSVP settings for guests
 * @returns {{ rsvp_open: boolean, rsvp_deadline: string|null }}
 */
export async function fetchGuestSettings() {
  const response = await api.get(
    '/settings/guests',
    { meta: { showLoader: true } }
  );
  return response.data;
}