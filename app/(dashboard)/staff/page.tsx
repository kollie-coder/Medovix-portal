'use client'
import { useEffect, useRef, useState } from 'react'
import { HiOutlinePlus, HiX, HiOutlineClipboardCopy, HiCheck, HiOutlineCamera } from 'react-icons/hi'
import api from '@/lib/api'

type Staff = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  active: boolean
  avatar: string | null
  department: { id: string; name: string } | null
  staffProfile: { specialization: string | null; licenseNumber: string | null } | null
  createdAt: string
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

type Department = { id: string; name: string }

const STAFF_ROLES = [
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'NURSE', label: 'Nurse' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'LAB_TECHNICIAN', label: 'Lab Technician' },
  { value: 'DIETICIAN', label: 'Dietician' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
]

// Roles that hold a professional licence. Only doctors have a specialisation.
const LICENSED_ROLES = ['DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN']

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  DOCTOR: { bg: '#E0F4FB', text: '#065f7a' },
  NURSE: { bg: '#E6FAF4', text: '#085041' },
  PHARMACIST: { bg: '#FFF3E0', text: '#8A5A00' },
  LAB_TECHNICIAN: { bg: '#EEEDFE', text: '#3730A3' },
  DIETICIAN: { bg: '#FFEBEE', text: '#C62828' },
  RECEPTIONIST: { bg: '#FEF3C7', text: '#92400E' },
  ACCOUNTANT: { bg: '#E0E7FF', text: '#3730A3' },
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [resetTarget, setResetTarget] = useState<Staff | null>(null)
  const [viewTarget, setViewTarget] = useState<Staff | null>(null)
  const [avatarUploadId, setAvatarUploadId] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const avatarTargetId = useRef<string | null>(null)

  useEffect(() => {
    loadStaff()
  }, [])

  const loadStaff = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/hospital-admin/staff')
      setStaff(data)
    } catch (err) {
      console.error('Failed to load staff', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (member: Staff) => {
    try {
      await api.patch(`/hospital-admin/staff/${member.id}/active`, { active: !member.active })
      loadStaff()
    } catch {
      alert('Could not update staff status')
    }
  }

  const triggerAvatarUpload = (memberId: string) => {
    avatarTargetId.current = memberId
    avatarInputRef.current?.click()
  }

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const memberId = avatarTargetId.current
    e.target.value = ''
    if (!file || !memberId) return

    setAvatarUploadId(memberId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post(`/hospital-admin/staff/${memberId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setStaff(prev => prev.map(s => (s.id === memberId ? { ...s, avatar: data.avatar } : s)))
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Could not upload photo')
    } finally {
      setAvatarUploadId(null)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0D1117]">Staff</h1>
          <p className="text-sm text-gray-400 mt-1">Doctors, nurses, front desk and other staff at your hospital</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
        >
          <HiOutlinePlus size={18} />
          Invite Staff
        </button>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleAvatarSelect}
        className="hidden"
      />

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-400">No staff invited yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Name</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Role</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Department</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map(member => {
                const roleStyle = ROLE_COLORS[member.role] ?? { bg: '#F3F4F6', text: '#374151' }
                return (
                  <tr
                    key={member.id}
                    onClick={() => setViewTarget(member)}
                    className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/60"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); triggerAvatarUpload(member.id) }}
                          className="relative w-9 h-9 rounded-full flex-shrink-0 group"
                          title="Change photo"
                        >
                          {member.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={member.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
                              style={{ backgroundColor: '#E0F4FB', color: '#065f7a' }}
                            >
                              {initials(member.firstName, member.lastName)}
                            </div>
                          )}
                          <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                            {avatarUploadId === member.id ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <HiOutlineCamera size={14} className="text-white opacity-0 group-hover:opacity-100" />
                            )}
                          </div>
                        </button>
                        <span className="font-medium text-[#0D1117]">
                          {member.firstName} {member.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
                      >
                        {member.role.replace('_', ' ')}
                      </span>
                      {member.role === 'DOCTOR' && !member.staffProfile?.licenseNumber && (
                        <span className="block mt-1 text-[11px] text-amber-700">No licence number yet</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-500">{member.department?.name ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-500">{member.email}</td>
                    <td className="px-5 py-4">
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: member.active ? '#E6FAF4' : '#FFEBEE',
                          color: member.active ? '#085041' : '#C62828',
                        }}
                      >
                        {member.active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setResetTarget(member)}
                        className="text-xs font-semibold text-gray-500 hover:text-[#0D1117] mr-4"
                      >
                        Reset password
                      </button>
                      <button
                        onClick={() => handleToggleActive(member)}
                        className="text-xs font-semibold text-gray-500 hover:text-[#0D1117]"
                      >
                        {member.active ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <InviteStaffModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadStaff() }}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          member={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}

      {viewTarget && (
        <StaffDetailModal
          member={viewTarget}
          onClose={() => setViewTarget(null)}
          onSaved={(updated) => {
            setStaff(prev => prev.map(s => (s.id === updated.id ? { ...s, ...updated } : s)))
            setViewTarget(prev => (prev ? { ...prev, ...updated } : prev))
          }}
        />
      )}
    </div>
  )
}

function StaffDetailModal({
  member, onClose, onSaved,
}: { member: Staff; onClose: () => void; onSaved: (updated: Staff) => void }) {
  const [editing, setEditing] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
    departmentId: member.department?.id ?? '',
    specialization: member.staffProfile?.specialization ?? '',
    licenseNumber: member.staffProfile?.licenseNumber ?? '',
  })

  useEffect(() => {
    api.get('/hospital-admin/departments')
      .then(({ data }) => setDepartments(data))
      .catch(() => {})
  }, [])

  const roleStyle = ROLE_COLORS[member.role] ?? { bg: '#F3F4F6', text: '#374151' }

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      const { data } = await api.patch(`/hospital-admin/staff/${member.id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        departmentId: form.departmentId || null,
        ...(LICENSED_ROLES.includes(member.role) ? { licenseNumber: form.licenseNumber.trim() || null } : {}),
        ...(member.role === 'DOCTOR' ? { specialization: form.specialization.trim() || null } : {}),
      })
      onSaved(data)
      setEditing(false)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0D1117]">Staff Member</h2>
          <button onClick={onClose} className="text-gray-400"><HiX size={20} /></button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-4 mb-6">
            {member.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.avatar} alt="" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold flex-shrink-0"
                style={{ backgroundColor: '#E0F4FB', color: '#065f7a' }}
              >
                {initials(member.firstName, member.lastName)}
              </div>
            )}
            <div>
              {!editing ? (
                <p className="text-base font-bold text-[#0D1117]">
                  {member.firstName} {member.lastName}
                </p>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={form.firstName}
                    onChange={update('firstName')}
                    placeholder="First name"
                    className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    value={form.lastName}
                    onChange={update('lastName')}
                    placeholder="Last name"
                    className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                </div>
              )}
              <span
                className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
              >
                {member.role.replace('_', ' ')}
              </span>
            </div>
          </div>

          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Email</dt>
              <dd className="text-[#0D1117] font-medium">{member.email}</dd>
            </div>

            <div className="flex justify-between items-center">
              <dt className="text-gray-400">Department</dt>
              {!editing ? (
                <dd className="text-[#0D1117] font-medium">{member.department?.name ?? '—'}</dd>
              ) : (
                <select
                  value={form.departmentId}
                  onChange={update('departmentId')}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                >
                  <option value="">No department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
            </div>

            {member.role === 'DOCTOR' && (
              <div className="flex justify-between items-center">
                <dt className="text-gray-400">Specialisation</dt>
                {!editing ? (
                  <dd className="text-[#0D1117] font-medium">{member.staffProfile?.specialization ?? '—'}</dd>
                ) : (
                  <input
                    value={form.specialization}
                    onChange={update('specialization')}
                    maxLength={100}
                    placeholder="e.g. Paediatrics"
                    className="w-44 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                )}
              </div>
            )}

            {LICENSED_ROLES.includes(member.role) && (
              <div className="flex justify-between items-center">
                <dt className="text-gray-400">Licence number</dt>
                {!editing ? (
                  <dd className="text-[#0D1117] font-medium">{member.staffProfile?.licenseNumber ?? '—'}</dd>
                ) : (
                  <input
                    value={form.licenseNumber}
                    onChange={update('licenseNumber')}
                    maxLength={50}
                    placeholder="Registration no."
                    className="w-44 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                )}
              </div>
            )}

            <div className="flex justify-between">
              <dt className="text-gray-400">Status</dt>
              <dd>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: member.active ? '#E6FAF4' : '#FFEBEE',
                    color: member.active ? '#085041' : '#C62828',
                  }}
                >
                  {member.active ? 'Active' : 'Suspended'}
                </span>
              </dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-gray-400">Joined</dt>
              <dd className="text-[#0D1117] font-medium">
                {new Date(member.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </dd>
            </div>
          </dl>

          <div className="flex gap-3 mt-6">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex-1 border border-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-lg"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditing(false)
                    setForm({
                      firstName: member.firstName,
                      lastName: member.lastName,
                      departmentId: member.department?.id ?? '',
                      specialization: member.staffProfile?.specialization ?? '',
                      licenseNumber: member.staffProfile?.licenseNumber ?? '',
                    })
                    setError('')
                  }}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-primary text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResetPasswordModal({ member, onClose }: { member: Staff; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ temporaryPassword: string; emailSent: boolean } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleReset = async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post(`/hospital-admin/staff/${member.id}/reset-password`)
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not reset password')
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
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0D1117]">
            {result ? 'Password Reset' : 'Reset Password'}
          </h2>
          <button onClick={onClose} className="text-gray-400"><HiX size={20} /></button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!result ? (
            <>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                This generates a new temporary password for{' '}
                <span className="font-semibold text-[#0D1117]">
                  {member.firstName} {member.lastName}
                </span>{' '}
                and signs them out of all devices.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="flex-1 bg-primary text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </>
          ) : (
            <>
              {!result.emailSent && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Email invites are off — no email was sent.
                  </p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    Share the new password below with {member.firstName} directly.
                  </p>
                </div>
              )}

              <p className="text-xs font-semibold text-gray-500 mb-1">New temporary password</p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-2">
                <code className="flex-1 text-sm font-mono text-[#0D1117]">{result.temporaryPassword}</code>
                <button onClick={handleCopyPassword} className="text-primary">
                  {copied ? <HiCheck size={18} /> : <HiOutlineClipboardCopy size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                {result.emailSent
                  ? `Also emailed to ${member.email}. Shown only once — save it now if you need it.`
                  : `Shown only once — share it securely with ${member.firstName}.`}
              </p>

              <button
                onClick={onClose}
                className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-lg"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function InviteStaffModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', role: 'DOCTOR', departmentId: '',
    specialization: '', licenseNumber: '',
  })
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ staff: any; temporaryPassword: string; emailSent: boolean } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get('/hospital-admin/departments')
      .then(({ data }) => setDepartments(data))
      .catch(() => {})
  }, [])

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/hospital-admin/staff', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        role: form.role,
        departmentId: form.departmentId || undefined,
        ...(LICENSED_ROLES.includes(form.role) && form.licenseNumber.trim() ? { licenseNumber: form.licenseNumber.trim() } : {}),
        ...(form.role === 'DOCTOR' && form.specialization.trim() ? { specialization: form.specialization.trim() } : {}),
      })
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not invite staff member')
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
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0D1117]">
            {result ? 'Staff Invited' : 'Invite Staff Member'}
          </h2>
          <button onClick={onClose} className="text-gray-400"><HiX size={20} /></button>
        </div>

        {result ? (
          <div className="p-6">
            <div className="bg-[#E6FAF4] border border-[#9FE1CB] rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-[#085041]">
                {result.staff.firstName} {result.staff.lastName} has been added.
              </p>
            </div>

            {!result.emailSent && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-amber-800">
                  Email invites are off — no email was sent.
                </p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Share the login email and temporary password below with{' '}
                  {result.staff.firstName} directly. You can turn email invites back on
                  in Settings.
                </p>
              </div>
            )}

            <p className="text-xs font-semibold text-gray-500 mb-1">Login email</p>
            <p className="text-sm text-[#0D1117] mb-4">{result.staff.email}</p>

            <p className="text-xs font-semibold text-gray-500 mb-1">Temporary password</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-2">
              <code className="flex-1 text-sm font-mono text-[#0D1117]">{result.temporaryPassword}</code>
              <button onClick={handleCopyPassword} className="text-primary">
                {copied ? <HiCheck size={18} /> : <HiOutlineClipboardCopy size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              {result.emailSent
                ? `Also emailed to ${result.staff.email}. Shown only once — save it now if you need it.`
                : `Shown only once — share it securely with ${result.staff.firstName}.`}
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

            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="First name" value={form.firstName} onChange={update('firstName')}
                className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              <input required placeholder="Last name" value={form.lastName} onChange={update('lastName')}
                className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
            </div>

            <input required type="email" placeholder="Email address" value={form.email} onChange={update('email')}
              className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

            <select value={form.role} onChange={update('role')}
              className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary">
              {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>

            <select value={form.departmentId} onChange={update('departmentId')}
              className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary">
              <option value="">No department (optional)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            {form.role === 'DOCTOR' && (
              <input placeholder="Specialisation (e.g. Paediatrics)" maxLength={100} value={form.specialization} onChange={update('specialization')}
                className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
            )}

            {LICENSED_ROLES.includes(form.role) && (
              <div>
                <input placeholder="Licence / registration number" maxLength={50} value={form.licenseNumber} onChange={update('licenseNumber')}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                <p className="text-xs text-gray-400 mt-1">Printed under the signature on prescriptions and letters.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-primary text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
            >
              {loading ? 'Inviting...' : 'Invite Staff Member'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}