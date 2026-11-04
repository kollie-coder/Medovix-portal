import axios from 'axios'
import Cookies from 'js-cookie'
 
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://medovix-api.onrender.com/api/v1'
 
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})
 
api.interceptors.request.use(config => {
  const token = Cookies.get('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
 
function setAuthCookies(accessToken: string, refreshToken?: string) {
  Cookies.set('accessToken', accessToken, { expires: 1, secure: true, sameSite: 'strict' })
  if (refreshToken) {
    // Matches the backend's actual RefreshToken expiry (7 days) —
    // keep these two in sync if that ever changes server-side.
    Cookies.set('refreshToken', refreshToken, { expires: 7, secure: true, sameSite: 'strict' })
  }
}
 
function hardLogout() {
  Cookies.remove('accessToken')
  Cookies.remove('refreshToken')
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}
 
// Only one refresh call runs at a time. Any request that 401s while a
// refresh is already in flight queues up and replays once the new
// token is ready, instead of each firing its own refresh.
let isRefreshing = false
let queue: { resolve: (token: string) => void; reject: (err: any) => void }[] = []
 
function flushQueue(error: any, token: string | null) {
  queue.forEach(p => (error ? p.reject(error) : p.resolve(token as string)))
  queue = []
}
 
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
 
    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error)
    }
 
    // The refresh call itself failed (refresh token expired/invalid) —
    // nothing left to do but actually log out.
    if (originalRequest.url?.includes('/auth/refresh')) {
      hardLogout()
      return Promise.reject(error)
    }
 
    const refreshToken = Cookies.get('refreshToken')
    if (!refreshToken) {
      hardLogout()
      return Promise.reject(error)
    }
 
    originalRequest._retry = true
 
    if (isRefreshing) {
      // A refresh is already running — wait for it, then replay this
      // request with whatever token it produces.
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject })
      }).then(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      })
    }
 
    isRefreshing = true
    try {
      // Plain axios here, not `api` — avoids re-triggering this same
      // interceptor if the refresh call itself ever 401s.
      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
 
      // ↓ Adjust these two lines if your /auth/refresh response shape differs.
      setAuthCookies(data.accessToken, data.refreshToken)
      flushQueue(null, data.accessToken)
 
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      flushQueue(refreshError, null)
      hardLogout()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)
 
export default api