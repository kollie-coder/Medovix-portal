'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HiOutlinePlus, HiX, HiOutlineClipboardCopy, HiCheck } from 'react-icons/hi'
import api from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'

type Hospital = {
  id: string
  name: string
  type: string
  city: string
  state: string
  active: boolean
  verified: boolean
  plan: string
  planStatus: string
  createdAt: string
  _count: { staff: number; patients: number }
}

const HOSPITAL_TYPES = ['GENERAL', 'SPECIALIST', 'TEACHING', 'CLINIC', 'PHARMACY', 'DIAGNOSTIC']

export default function SuperAdminHospitalsPage() {
  const router = useRouter()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboardModal, setShowOnboardModal] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      const user = await getCurrentUser()
      if (!user || user.role !== 'SUPER_ADMIN') {
        router.replace('/')
        return
      }
      setCheckingAccess(false)
      loadHospitals()
    }
    checkAccess()
  }, [router])

  const loadHospitals = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/super-admin/hospitals')
      setHospitals(data)
    } catch (err) {
      console.error('Failed to load hospitals', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (hospital: Hospital) => {
    try {
      await api.patch(`/super-admin/hospitals/${hospital.id}/active`, { active: !hospital.active })
      loadHospitals()
    } catch (err) {
      alert('Could not update hospital status')
    }
  }

  if (checkingAccess) return null

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0D1117]">Hospitals</h1>
          <p className="text-sm text-gray-400 mt-1">Every hospital registered on Medovite</p>
        </div>
        <button
          onClick={() => setShowOnboardModal(true)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
        >
          <HiOutlinePlus size={18} />
          Onboard Hospital
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hospitals.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-400">No hospitals onboarded yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Hospital</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Type</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Location</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Staff</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Plan</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map(h => (
                <tr key={h.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-4 font-medium text-[#0D1117]">
                    {h.name}
                    {h.verified && (
                      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E6FAF4] text-[#085041]">
                        VERIFIED
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-500">{h.type}</td>
                  <td className="px-5 py-4 text-gray-500">{h.city}, {h.state}</td>
                  <td className="px-5 py-4 text-gray-500">{h._count.staff}</td>
                  <td className="px-5 py-4 text-gray-500">{h.plan}</td>
                  <td className="px-5 py-4">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: h.active ? '#E6FAF4' : '#FFEBEE',
                        color: h.active ? '#085041' : '#C62828',
                      }}
                    >
                      {h.active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleToggleActive(h)}
                      className="text-xs font-semibold text-gray-500 hover:text-[#0D1117]"
                    >
                      {h.active ? 'Suspend' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showOnboardModal && (
        <OnboardHospitalModal
          onClose={() => setShowOnboardModal(false)}
          onSuccess={() => {
            setShowOnboardModal(false)
            loadHospitals()
          }}
        />
      )}
    </div>
  )
}

function OnboardHospitalModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    hospitalName: '', type: 'GENERAL', address: '', city: '', state: '',
    country: 'Nigeria', phone: '', hospitalEmail: '', website: '',
    adminFirstName: '', adminLastName: '', adminEmail: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ hospital: any; admin: any; temporaryPassword: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/super-admin/hospitals', form)
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not onboard hospital.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPassword = () => {
    if (!result) return
    navigator.clipboard.writeText(result.temporaryPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0D1117]">
            {result ? 'Hospital Onboarded' : 'Onboard New Hospital'}
          </h2>
          <button onClick={onClose} className="text-gray-400">
            <HiX size={20} />
          </button>
        </div>

        {result ? (
          <div className="p-6">
            <div className="bg-[#E6FAF4] border border-[#9FE1CB] rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-[#085041]">
                {result.hospital.name} has been created successfully.
              </p>
            </div>

            <p className="text-xs font-semibold text-gray-500 mb-1">Admin login</p>
            <p className="text-sm text-[#0D1117] mb-4">{result.admin.email}</p>

            <p className="text-xs font-semibold text-gray-500 mb-1">Temporary password</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-2">
              <code className="flex-1 text-sm font-mono text-[#0D1117]">{result.temporaryPassword}</code>
              <button onClick={handleCopyPassword} className="text-primary">
                {copied ? <HiCheck size={18} /> : <HiOutlineClipboardCopy size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              This password is shown only once. Share it securely with the hospital&apos;s
              admin — they should change it after their first login.
            </p>

            <button
              onClick={onSuccess}
              className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-lg"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Hospital details</p>

            <input required placeholder="Hospital name" value={form.hospitalName} onChange={update('hospitalName')}
              className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

            <select value={form.type} onChange={update('type')}
              className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary">
              {HOSPITAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <input required placeholder="Address" value={form.address} onChange={update('address')}
              className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="City" value={form.city} onChange={update('city')}
                className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              <input required placeholder="State" value={form.state} onChange={update('state')}
                className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
            </div>

            <input required placeholder="Phone" value={form.phone} onChange={update('phone')}
              className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

            <input required type="email" placeholder="Hospital email" value={form.hospitalEmail} onChange={update('hospitalEmail')}
              className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

            <input placeholder="Website (optional)" value={form.website} onChange={update('website')}
              className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mt-2">First admin account</p>

            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="First name" value={form.adminFirstName} onChange={update('adminFirstName')}
                className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              <input required placeholder="Last name" value={form.adminLastName} onChange={update('adminLastName')}
                className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
            </div>

            <input required type="email" placeholder="Admin email" value={form.adminEmail} onChange={update('adminEmail')}
              className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-primary text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
            >
              {loading ? 'Onboarding...' : 'Onboard Hospital'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
