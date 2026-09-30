'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { loginAdmin } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await loginAdmin(email, password)
      // Super Admins land on the platform-wide dashboard — the
      // hospital-scoped "/" dashboard doesn't apply to them since
      // they aren't attached to any single hospital.
      router.push(user.role === 'SUPER_ADMIN' ? '/super-admin' : '/')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err.message ?? 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-lg font-bold text-[#0D1117] mb-1">Admin Portal</h1>
          <p className="text-sm text-gray-400 mb-6">Sign in to manage your hospital</p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="admin@yourhospital.com"
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
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
          © 2026 Medovite. Hospital administration portal.
        </p>
      </div>
    </div>
  )
}
