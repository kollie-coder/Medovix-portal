'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { loginAdmin, verifyTwoFactorLogin, homeForRole } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Set after the password step when the account uses two-factor sign-in.
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [code, setCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (pendingToken) {
        const user = await verifyTwoFactorLogin(pendingToken, code.trim())
        router.push(homeForRole(user.role))
        return
      }
      const result = await loginAdmin(email, password)
      if ('requires2FA' in result) {
        setPendingToken(result.pendingToken)
        setCode('')
        return
      }
      // Each role lands on the screen it actually works in.
      router.push(homeForRole(result.user.role))
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err.message ?? 'Login failed. Please check your credentials.'
      setError(message)
      // The sign-in step expires after a few minutes; start again from the password.
      if (pendingToken && err?.response?.status === 401 && /expired|session/i.test(String(message))) {
        setPendingToken(null)
        setPassword('')
      }
    } finally {
      setLoading(false)
    }
  }

  const backToPassword = () => {
    setPendingToken(null)
    setCode('')
    setPassword('')
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#1A1A2E' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image
            src="/medovite-logo-navbar-tight-white.png"
            alt="Medovite"
            width={160}
            height={45}
            style={{ objectFit: 'contain', height: 'auto' }}
            priority
          />
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h1 className="text-lg font-bold text-[#0D1117] mb-1">Hospital Portal</h1>
          <p className="text-sm text-gray-400 mb-6">
            {pendingToken ? 'Enter the code from your authenticator app' : 'Sign in to your hospital account'}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {pendingToken ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Verification code</label>
                  <input
                    autoFocus
                    required
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    inputMode="text"
                    autoComplete="one-time-code"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary tracking-widest"
                    placeholder="123456"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Lost your phone? Enter one of your backup codes instead.</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 bg-primary text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60 transition-opacity"
                >
                  {loading ? 'Verifying...' : 'Verify and sign in'}
                </button>
                <button type="button" onClick={backToPassword} className="text-xs text-gray-500">
                  Back to sign in
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="you@yourhospital.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 bg-primary text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60 transition-opacity"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </>
            )}
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
          © 2026 Medovite. Hospital portal.
        </p>
      </div>
    </div>
  )
}