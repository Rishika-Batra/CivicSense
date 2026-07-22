import axios from 'axios'
import { toast } from '../components/Toast.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const api = axios.create({
  baseURL: API_URL,
  
})

// Closed variable stored in memory to prevent localStorage token leaks (XSS vectors)
let memoryToken: string | null = null

/**
 * Set or clear the Authorization token for all outgoing Axios requests.
 * Keeps the token safely in-memory.
 */
export const setAuthToken = (token: string | null) => {
  memoryToken = token
}

// Request interceptor to automatically attach JWT token if present
api.interceptors.request.use(
  (config) => {
    console.log("TOKEN:", memoryToken);
    if (memoryToken) {
      config.headers.Authorization = `Bearer ${memoryToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to intercept network/server errors and raise toast alerts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract message payload cleanly
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'A connection issue occurred with the server.'

    // Dispatch global toast message
    toast.error(errorMsg)

    return Promise.reject(error)
  }
)
