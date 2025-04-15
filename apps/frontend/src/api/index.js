import axios from 'axios'

// Axios instance preconfigured for backend API requests
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  withCredentials: true // Include cookies for authentication
})

export default api

// Fetch current email settings
export async function getEmailSettings() {
  const response = await api.get('/email-settings')
  return response.data
}

// Update email settings with provided data
export async function updateEmailSettings(data) {
  const response = await api.post('/email-settings', data)
  return response.data
}