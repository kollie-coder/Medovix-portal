'use client'
import { useEffect, useRef, useState } from 'react'
import api from '@/lib/api'

type HospitalProfile = {
  id: string
  name: string
  type: string
  address: string
  city: string
  state: string
  country: string
  phone: string
  email: string
  website: string | null
  logo: string | null
  verified: boolean
  plan: string
  planStatus: string
  emailInvitesEnabled: boolean
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<HospitalProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', phone: '', website: '',
  })
  const [emailInvitesEnabled, setEmailInvitesEnabled] = useState(true)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/hospital-admin/hospital')
        setProfile(data)
        setForm({
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          phone: data.phone,
          website: data.website ?? '',
        })
        setEmailInvitesEnabled(data.emailInvitesEnabled ?? true)
      } catch (err) {
        console.error('Failed to load hospital profile', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setLogoError('')
    setLogoUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/hospital-admin/hospital/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setProfile(prev => (prev ? { ...prev, logo: data.logo } : prev))
    } catch (err: any) {
      setLogoError(err?.response?.data?.message ?? 'Could not upload logo')
    } finally {
      setLogoUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      const { data } = await api.patch('/hospital-admin/hospital', {
        ...form,
        emailInvitesEnabled,
      })
      setProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <h1 className="text-xl font-bold text-[#0D1117]">Settings</h1>
      <p className="text-sm text-gray-400 mt-1 mb-6">Your hospital&apos;s profile on Medovite</p>

      {/* Read-only status card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500">Plan</p>
          <p className="text-sm font-bold text-[#0D1117] mt-0.5">{profile?.plan} — {profile?.planStatus}</p>
        </div>
        <div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: profile?.verified ? '#E6FAF4' : '#F3F4F6',
              color: profile?.verified ? '#085041' : '#6B7280',
            }}
          >
            {profile?.verified ? 'Medovite Verified' : 'Not yet verified'}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400 -mt-2 mb-6">
        Plan and verification status are managed by Medovite — contact support to make changes.
      </p>

      {/* Logo upload */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {profile?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logo} alt="Hospital logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-gray-400">No logo</span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#0D1117]">Hospital logo</p>
          <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG or WebP, up to 5MB</p>
          {logoError && <p className="text-xs text-red-600 mt-1">{logoError}</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleLogoSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={logoUploading}
          className="text-sm font-semibold text-primary border border-primary/30 rounded-lg px-4 py-2 disabled:opacity-60"
        >
          {logoUploading ? 'Uploading...' : profile?.logo ? 'Change' : 'Upload'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {saved && (
          <div className="bg-[#E6FAF4] border border-[#9FE1CB] rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-[#085041]">Changes saved.</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hospital name</label>
          <input
            required
            value={form.name}
            onChange={update('name')}
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label>
          <input
            required
            value={form.address}
            onChange={update('address')}
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
            <input
              required
              value={form.city}
              onChange={update('city')}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">State</label>
            <input
              required
              value={form.state}
              onChange={update('state')}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
          <input
            required
            value={form.phone}
            onChange={update('phone')}
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Website (optional)</label>
          <input
            value={form.website}
            onChange={update('website')}
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact email</label>
          <input
            disabled
            value={profile?.email ?? ''}
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-gray-50 text-gray-400"
          />
          <p className="text-xs text-gray-400 mt-1">Contact Medovite support to change your hospital&apos;s email.</p>
        </div>

        {/* Email invites toggle */}
        <div className="border-t border-gray-100 pt-4 mt-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#0D1117]">Email staff invites</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                When off, new staff invites and password resets show the temporary
                password on screen instead of emailing it — use this if email
                delivery is having issues.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emailInvitesEnabled}
              onClick={() => setEmailInvitesEnabled(v => !v)}
              className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
              style={{ backgroundColor: emailInvitesEnabled ? '#0A7EA4' : '#D1D5DB' }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                style={{ transform: emailInvitesEnabled ? 'translateX(24px)' : 'translateX(4px)' }}
              />
            </button>
          </div>
          {!emailInvitesEnabled && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 mt-3">
              Email invites are currently off. New staff and password resets will only show
              the temporary password on screen — remember to share it with them directly.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 bg-primary text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}