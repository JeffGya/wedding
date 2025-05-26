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