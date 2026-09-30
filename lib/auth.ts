// lib/auth.ts
import Cookies from 'js-cookie'
import api from './api'

export type PortalUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  hospitalId: string | null
}

export async function loginAdmin(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password })

  // Only ADMIN and SUPER_ADMIN roles may access the portal — everything
  // else (PUBLIC, PATIENT, DOCTOR etc.) belongs to the mobile app or a
  // different staff portal we haven't built yet.
  if (data.user.role !== 'ADMIN' && data.user.role !== 'SUPER_ADMIN') {
    throw new Error('This account does not have Admin Portal access.')
  }

  Cookies.set('accessToken', data.accessToken, { expires: 1, secure: true, sameSite: 'strict' })
  Cookies.set('refreshToken', data.refreshToken, { expires: 30, secure: true, sameSite: 'strict' })

  return data.user as PortalUser
}

export function logout() {
  Cookies.remove('accessToken')
  Cookies.remove('refreshToken')
  window.location.href = '/login'
}

export async function getCurrentUser(): Promise<PortalUser | null> {
  try {
    const { data } = await api.get('/auth/me')
    return data
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return !!Cookies.get('accessToken')
}
