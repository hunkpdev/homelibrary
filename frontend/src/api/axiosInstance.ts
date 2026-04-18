import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

let isRefreshing = false
let refreshPromise: Promise<string> | null = null

function redirectToLogin(): void {
  useAuthStore.getState().clearAuth()
  globalThis.location.href = '/login'
}

async function awaitAndRetry(original: InternalAxiosRequestConfig, error: unknown) {
  try {
    const newToken = await refreshPromise!
    original.headers.Authorization = `Bearer ${newToken}`
    return axiosInstance(original)
  } catch {
    throw error
  }
}

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original._retry) {
      throw error
    }

    if (original.url?.includes('/api/auth/refresh')) {
      redirectToLogin()
      throw error
    }

    original._retry = true

    if (isRefreshing && refreshPromise) {
      return awaitAndRetry(original, error)
    }

    isRefreshing = true
    refreshPromise = axiosInstance
      .post<{ accessToken: string }>('/api/auth/refresh')
      .then((res) => {
        const newToken = res.data.accessToken
        useAuthStore.getState().setAccessToken(newToken)
        return newToken
      })
      .catch((err: unknown) => {
        redirectToLogin()
        throw err
      })
      .finally(() => {
        isRefreshing = false
        refreshPromise = null
      })

    return awaitAndRetry(original, error)
  }
)

export default axiosInstance
