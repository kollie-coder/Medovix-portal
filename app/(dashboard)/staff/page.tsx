'use client'
import { useEffect, useState } from 'react'
import { HiOutlinePlus, HiX, HiOutlineClipboardCopy, HiCheck } from 'react-icons/hi'
import api from '@/lib/api'

type Staff = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  active: boolean
  department: { id: string; name: string } | null
  createdAt: string
}

type Department = { id: string; name: string }

const STAFF_ROLES = [
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'NURSE', label: 'Nurse' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'LAB_TECHNICIAN', label: 'Lab Technician' },
  { value: 'DIETICIAN', label: 'Dietician' },
]

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  DOCTOR: { bg: '#E0F4FB', text: '#065f7a' },
  NURSE: { bg: '#E6FAF4', text: '#085041' },
  PHARMACIST: { bg: '#FFF3E0', text: '#8A5A00' },
  LAB_TECHNICIAN: { bg: '#EEEDFE', text: '#3730A3' },
  DIETICIAN: { bg: '#FFEBEE', text: '#C62828' },
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [resetTarget, setResetTarget] = useState<Staff | null>(null)

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

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0D1117]">Staff</h1>
          <p className="text-sm text-gray-400 mt-1">Doctors, nurses, and other medical staff at your hospital</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
        >
          <HiOutlinePlus size={18} />
          Invite Staff
        </button>
      </div>

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
                  <tr key={member.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-4 font-medium text-[#0D1117]">
                      {member.firstName} {member.lastName}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
                      >
                        {member.role.replace('_', ' ')}
                      </span>
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
                    <td className="px-5 py-4 text-right whitespace-nowrap">
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