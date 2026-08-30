import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    console.log('Attaching access token to request:', token)
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(fn: UnauthorizedHandler) {
  unauthorizedHandler = fn
}

let isRefreshing = false
let pendingRequests: Array<(token: string) => void> = []

function onRefreshed(token: string) {
  pendingRequests.forEach((cb) => cb(token))
  pendingRequests = []
}

// Intercept 401 responses: try to refresh, then retry, else logout
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve) => {
        pendingRequests.push((token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          resolve(apiClient(originalRequest))
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      isRefreshing = false
      unauthorizedHandler?.()
      return Promise.reject(error)
    }

    try {
      console.log('Attempting token refresh with refresh token:', refreshToken)
      const { data } = await axios.post('/api/token/refresh/', { refresh: refreshToken })
      const newAccessToken: string = data.access

      localStorage.setItem('auth_token', newAccessToken)
      apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
      onRefreshed(newAccessToken)

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return apiClient(originalRequest)
    } catch {
      pendingRequests = []
      unauthorizedHandler?.()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)

export default apiClient
