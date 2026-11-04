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

// Roles that may sign in to this portal, and the screen each one lands on.
// Roles not listed here (PUBLIC, PATIENT, DIETICIAN) belong to the mobile app
// or a later release.
export const PORTAL_ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/super-admin',
  ADMIN: '/',
  RECEPTIONIST: '/reception',
  ACCOUNTANT: '/billing',
  DOCTOR: '/doctor',
  NURSE: '/nurse',
  LAB_TECHNICIAN: '/lab',
  PHARMACIST: '/pharmacy',
}

export function homeForRole(role: string): string {
  return PORTAL_ROLE_HOME[role] ?? '/'
}

export type LoginResult =
  | { user: PortalUser }
  | { requires2FA: true; pendingToken: string }

// Checks the role, stores the session cookies and returns the signed-in user.
function startSession(data: any): PortalUser {
  if (!data.user || !(data.user.role in PORTAL_ROLE_HOME)) {
    throw new Error('This account does not have Portal access.')
  }
  Cookies.set('accessToken', data.accessToken, { expires: 1, secure: true, sameSite: 'strict' })
  Cookies.set('refreshToken', data.refreshToken, { expires: 7, secure: true, sameSite: 'strict' }) // was 30 — backend's RefreshToken row actually expires in 7 days
  return data.user as PortalUser
}

export async function loginAdmin(email: string, password: string): Promise<LoginResult> {
  const { data } = await api.post('/auth/login', { email, password })

  // Accounts with two-factor sign-in get a pending token first; the second
  // step is verifyTwoFactorLogin below.
  if (data.requires2FA) {
    return { requires2FA: true, pendingToken: data.pendingToken }
  }
  return { user: startSession(data) }
}

export async function verifyTwoFactorLogin(pendingToken: string, code: string): Promise<PortalUser> {
  const { data } = await api.post('/auth/2fa/login-verify', { pendingToken, code })
  return startSession(data)
}

export async function logout() {
  const refreshToken = Cookies.get('refreshToken')
  if (refreshToken) {
    try {
      await api.post('/auth/logout', { refreshToken })
    } catch {
      // Non-fatal — we clear local cookies and redirect regardless.
      // Worst case the refresh token sits unrevoked until it naturally
      // expires in 7 days.
    }
  }
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
