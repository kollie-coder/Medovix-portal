'use client'
import { useEffect, useState } from 'react'
import { HiOutlineSearch, HiX, HiOutlinePlus, HiOutlineClipboardCopy, HiCheck, HiArrowLeft, HiOutlinePencil } from 'react-icons/hi'
import api from '@/lib/api'

const STATUSES = ['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'DECEASED']

type UserSearchResult = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  avatar: string | null
  dateOfBirth: string | null
  gender: string | null
  alreadyRegisteredHere: boolean
}

const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']
const BLOOD_GROUPS = ['UNKNOWN', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']

type PatientListItem = {
  id: string // HospitalPatient id
  patientNumber: string
  status: string
  registeredAt: string
  patient: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    avatar: string | null
    dateOfBirth: string | null
    gender: string | null
  }
}

type PatientDetail = PatientListItem & {
  appointmentCount: number
  recordCount: number
  patient: PatientListItem['patient'] & {
    patientProfile: {
      bloodGroup: string
      allergies: string[]
      chronicConditions: string[]
      emergencyName: string | null
      emergencyPhone: string | null
      emergencyRelation: string | null
      insuranceProvider: string | null
      insuranceNumber: string | null
      weight: number | null
      height: number | null
    } | null
  }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#E6FAF4', text: '#085041' },
  INACTIVE: { bg: '#F3F4F6', text: '#6B7280' },
  TRANSFERRED: { bg: '#FFF3E0', text: '#8A5A00' },
  DECEASED: { bg: '#FFEBEE', text: '#C62828' },
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

function age(dob: string | null) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewId, setViewId] = useState<string | null>(null)
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => loadPatients(search), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const loadPatients = async (q: string) => {
    setLoading(true)
    try {
      const { data } = await api.get('/hospital-admin/patients', {
        params: q ? { search: q } : {},
      })
      setPatients(data)
    } catch (err) {
      console.error('Failed to load patients', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0D1117]">Patients</h1>
          <p className="text-sm text-gray-400 mt-1">Everyone registered at your hospital</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <HiOutlineSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or phone"
              className="w-72 pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg whitespace-nowrap"
          >
            <HiOutlinePlus size={18} />
            Register Patient
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-400">
              {search ? 'No patients match your search.' : 'No patients registered yet.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Patient</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Patient #</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Age / Gender</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Contact</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Registered</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((hp) => {
                const statusStyle = STATUS_COLORS[hp.status] ?? { bg: '#F3F4F6', text: '#374151' }
                const patientAge = age(hp.patient.dateOfBirth)
                return (
                  <tr
                    key={hp.id}
                    onClick={() => setViewId(hp.id)}
                    className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/60"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {hp.patient.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={hp.patient.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                            style={{ backgroundColor: '#E0F4FB', color: '#065f7a' }}
                          >
                            {initials(hp.patient.firstName, hp.patient.lastName)}
                          </div>
                        )}
                        <span className="font-medium text-[#0D1117]">
                          {hp.patient.firstName} {hp.patient.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 font-mono text-xs">{hp.patientNumber}</td>
                    <td className="px-5 py-4 text-gray-500">
                      {patientAge !== null ? `${patientAge} yrs` : '—'}
                      {hp.patient.gender ? ` · ${hp.patient.gender.charAt(0)}` : ''}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {hp.patient.phone ?? hp.patient.email}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                      >
                        {hp.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {new Date(hp.registeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {viewId && (
        <PatientDetailModal
          hospitalPatientId={viewId}
          onClose={() => setViewId(null)}
          onUpdated={() => loadPatients(search)}
        />
      )}

      {showRegister && (
        <RegisterPatientModal
          onClose={() => setShowRegister(false)}
          onSuccess={() => { setShowRegister(false); loadPatients(search) }}
        />
      )}
    </div>
  )
}

type EditForm = {
  firstName: string
  lastName: string
  phone: string
  dateOfBirth: string
  gender: string
  status: string
  bloodGroup: string
  allergies: string
  chronicConditions: string
  weight: string
  height: string
  emergencyName: string
  emergencyPhone: string
  emergencyRelation: string
  insuranceProvider: string
  insuranceNumber: string
}

function toEditForm(detail: PatientDetail): EditForm {
  const profile = detail.patient.patientProfile
  return {
    firstName: detail.patient.firstName,
    lastName: detail.patient.lastName,
    phone: detail.patient.phone ?? '',
    dateOfBirth: detail.patient.dateOfBirth ? detail.patient.dateOfBirth.slice(0, 10) : '',
    gender: detail.patient.gender ?? '',
    status: detail.status,
    bloodGroup: profile?.bloodGroup ?? 'UNKNOWN',
    allergies: profile?.allergies.join(', ') ?? '',
    chronicConditions: profile?.chronicConditions.join(', ') ?? '',
    weight: profile?.weight != null ? String(profile.weight) : '',
    height: profile?.height != null ? String(profile.height) : '',
    emergencyName: profile?.emergencyName ?? '',
    emergencyPhone: profile?.emergencyPhone ?? '',
    emergencyRelation: profile?.emergencyRelation ?? '',
    insuranceProvider: profile?.insuranceProvider ?? '',
    insuranceNumber: profile?.insuranceNumber ?? '',
  }
}

function PatientDetailModal({
  hospitalPatientId,
  onClose,
  onUpdated,
}: {
  hospitalPatientId: string
  onClose: () => void
  onUpdated: () => void
}) {
  const [detail, setDetail] = useState<PatientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)

  useEffect(() => {
    api.get(`/hospital-admin/patients/${hospitalPatientId}`)
      .then(({ data }) => setDetail(data))
      .catch((err) => setError(err?.response?.data?.message ?? 'Could not load patient'))
      .finally(() => setLoading(false))
  }, [hospitalPatientId])

  const startEditing = () => {
    if (!detail) return
    setForm(toEditForm(detail))
    setEditing(true)
  }

  const update = (field: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => prev ? { ...prev, [field]: e.target.value } : prev)

  const handleSave = async () => {
    if (!form) return
    setError('')
    setSaving(true)
    try {
      const { data } = await api.patch(`/hospital-admin/patients/${hospitalPatientId}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        status: form.status,
        bloodGroup: form.bloodGroup,
        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        chronicConditions: form.chronicConditions ? form.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        weight: form.weight ? Number(form.weight) : null,
        height: form.height ? Number(form.height) : null,
        emergencyName: form.emergencyName || null,
        emergencyPhone: form.emergencyPhone || null,
        emergencyRelation: form.emergencyRelation || null,
        insuranceProvider: form.insuranceProvider || null,
        insuranceNumber: form.insuranceNumber || null,
      })
      setDetail(data)
      setEditing(false)
      onUpdated()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not save changes')
    } finally {
      setSaving(false)
    }
  }

  const statusStyle = detail ? (STATUS_COLORS[detail.status] ?? { bg: '#F3F4F6', text: '#374151' }) : null
  const profile = detail?.patient.patientProfile

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0D1117]">Patient</h2>
          <div className="flex items-center gap-3">
            {detail && !editing && (
              <button onClick={startEditing} className="text-gray-400 hover:text-primary" title="Edit">
                <HiOutlinePencil size={18} />
              </button>
            )}
            <button onClick={onClose} className="text-gray-400"><HiX size={20} /></button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error && !detail ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : detail ? (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                {detail.patient.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.patient.avatar} alt="" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold flex-shrink-0"
                    style={{ backgroundColor: '#E0F4FB', color: '#065f7a' }}
                  >
                    {initials(detail.patient.firstName, detail.patient.lastName)}
                  </div>
                )}
                <div>
                  {!editing && (
                    <>
                      <p className="text-base font-bold text-[#0D1117]">
                        {detail.patient.firstName} {detail.patient.lastName}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{detail.patientNumber}</p>
                    </>
                  )}
                  {statusStyle && !editing && (
                    <span
                      className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                    >
                      {detail.status}
                    </span>
                  )}
                </div>
              </div>

              {editing && form ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input value={form.firstName} onChange={update('firstName')} placeholder="First name"
                      className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                    <input value={form.lastName} onChange={update('lastName')} placeholder="Last name"
                      className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                  </div>

                  <input value={form.phone} onChange={update('phone')} placeholder="Phone"
                    className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')}
                      className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                    <select value={form.gender} onChange={update('gender')}
                      className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary">
                      <option value="">Gender</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>

                  <select value={form.status} onChange={update('status')}
                    className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <div className="border-t border-gray-100 pt-3 mt-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Medical</p>
                  </div>

                  <select value={form.bloodGroup} onChange={update('bloodGroup')}
                    className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary">
                    {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b.replace('_', ' ')}</option>)}
                  </select>

                  <input value={form.allergies} onChange={update('allergies')} placeholder="Allergies (comma-separated)"
                    className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

                  <input value={form.chronicConditions} onChange={update('chronicConditions')} placeholder="Chronic conditions (comma-separated)"
                    className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

                  <div className="grid grid-cols-2 gap-3">
                    <input value={form.weight} onChange={update('weight')} placeholder="Weight (kg)" inputMode="decimal"
                      className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                    <input value={form.height} onChange={update('height')} placeholder="Height (cm)" inputMode="decimal"
                      className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                  </div>

                  <div className="border-t border-gray-100 pt-3 mt-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Emergency contact</p>
                  </div>
                  <input value={form.emergencyName} onChange={update('emergencyName')} placeholder="Name"
                    className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={form.emergencyPhone} onChange={update('emergencyPhone')} placeholder="Phone"
                      className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                    <input value={form.emergencyRelation} onChange={update('emergencyRelation')} placeholder="Relation"
                      className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                  </div>

                  <div className="border-t border-gray-100 pt-3 mt-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Insurance</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={form.insuranceProvider} onChange={update('insuranceProvider')} placeholder="Provider"
                      className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                    <input value={form.insuranceNumber} onChange={update('insuranceNumber')} placeholder="Policy number"
                      className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => { setEditing(false); setError('') }}
                      className="flex-1 border border-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bg-primary text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <dl className="flex flex-col gap-3 text-sm mb-5">
                    <Row label="Email" value={detail.patient.email} />
                    <Row label="Phone" value={detail.patient.phone ?? '—'} />
                    <Row
                      label="Age / Gender"
                      value={`${age(detail.patient.dateOfBirth) ?? '—'}${age(detail.patient.dateOfBirth) !== null ? ' yrs' : ''}${detail.patient.gender ? ` · ${detail.patient.gender}` : ''}`}
                    />
                    <Row label="Registered" value={new Date(detail.registeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
                    <Row label="Appointments at this hospital" value={String(detail.appointmentCount)} />
                    <Row label="Medical records" value={String(detail.recordCount)} />
                  </dl>

                  {profile && (
                    <>
                      <div className="border-t border-gray-100 pt-4 mb-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Medical</p>
                      </div>
                      <dl className="flex flex-col gap-3 text-sm mb-5">
                        <Row label="Blood group" value={profile.bloodGroup.replace('_', ' ')} />
                        <Row label="Allergies" value={profile.allergies.length ? profile.allergies.join(', ') : 'None recorded'} />
                        <Row label="Chronic conditions" value={profile.chronicConditions.length ? profile.chronicConditions.join(', ') : 'None recorded'} />
                        {(profile.weight || profile.height) && (
                          <Row label="Weight / Height" value={`${profile.weight ? profile.weight + ' kg' : '—'} / ${profile.height ? profile.height + ' cm' : '—'}`} />
                        )}
                      </dl>

                      {(profile.emergencyName || profile.insuranceProvider) && (
                        <div className="border-t border-gray-100 pt-4 mb-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Emergency & Insurance</p>
                        </div>
                      )}
                      <dl className="flex flex-col gap-3 text-sm">
                        {profile.emergencyName && (
                          <Row
                            label="Emergency contact"
                            value={`${profile.emergencyName}${profile.emergencyRelation ? ` (${profile.emergencyRelation})` : ''}${profile.emergencyPhone ? ` · ${profile.emergencyPhone}` : ''}`}
                          />
                        )}
                        {profile.insuranceProvider && (
                          <Row label="Insurance" value={`${profile.insuranceProvider}${profile.insuranceNumber ? ` · ${profile.insuranceNumber}` : ''}`} />
                        )}
                      </dl>
                    </>
                  )}
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function RegisterPatientModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<'search' | 'create'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<UserSearchResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ patientNumber: string; temporaryPassword: string | null } | null>(null)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '',
    bloodGroup: 'UNKNOWN', allergies: '', chronicConditions: '',
    emergencyName: '', emergencyPhone: '', emergencyRelation: '',
    insuranceProvider: '', insuranceNumber: '',
  })

  useEffect(() => {
    if (mode !== 'search' || query.trim().length < 5) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await api.get('/hospital-admin/patients/search', { params: { q: query } })
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, mode])

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const registerExisting = async (user: UserSearchResult) => {
    setError('')
    setSubmitting(true)
    try {
      const { data } = await api.post('/hospital-admin/patients', { userId: user.id })
      setResult({ patientNumber: data.hospitalPatient.patientNumber, temporaryPassword: data.temporaryPassword })
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not register this patient')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { data } = await api.post('/hospital-admin/patients', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup,
        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        chronicConditions: form.chronicConditions ? form.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        emergencyName: form.emergencyName || undefined,
        emergencyPhone: form.emergencyPhone || undefined,
        emergencyRelation: form.emergencyRelation || undefined,
        insuranceProvider: form.insuranceProvider || undefined,
        insuranceNumber: form.insuranceNumber || undefined,
      })
      setResult({ patientNumber: data.hospitalPatient.patientNumber, temporaryPassword: data.temporaryPassword })
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not register patient')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyPassword = () => {
    if (!result?.temporaryPassword) return
    navigator.clipboard.writeText(result.temporaryPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {mode === 'create' && !result && (
              <button onClick={() => setMode('search')} className="text-gray-400 hover:text-gray-600">
                <HiArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-base font-bold text-[#0D1117]">
              {result ? 'Patient Registered' : 'Register Patient'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400"><HiX size={20} /></button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {result ? (
            <>
              <div className="bg-[#E6FAF4] border border-[#9FE1CB] rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-[#085041]">
                  Registered — patient number {result.patientNumber}
                </p>
              </div>

              {result.temporaryPassword ? (
                <>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Temporary password (new account)</p>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-2">
                    <code className="flex-1 text-sm font-mono text-[#0D1117]">{result.temporaryPassword}</code>
                    <button onClick={handleCopyPassword} className="text-primary">
                      {copied ? <HiCheck size={18} /> : <HiOutlineClipboardCopy size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                    Shown only once — share it with the patient so they can log into the mobile app.
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                  This person already had an account — they can log in with their existing credentials.
                </p>
              )}

              <button
                onClick={onSuccess}
                className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-lg"
              >
                Done
              </button>
            </>
          ) : mode === 'search' ? (
            <>
              <div className="relative mb-4">
                <HiOutlineSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Full email address or phone number"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-2 mb-4 min-h-[60px]">
                {searching ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : query.trim().length < 5 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Enter the patient&apos;s full email address or phone number to check for an existing account.</p>
                ) : results.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No account found with that exact email or phone number.</p>
                ) : (
                  results.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#0D1117] truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                      </div>
                      {u.alreadyRegisteredHere ? (
                        <span className="text-xs text-gray-400 flex-shrink-0">Already registered</span>
                      ) : (
                        <button
                          onClick={() => registerExisting(u)}
                          disabled={submitting}
                          className="text-xs font-semibold text-primary flex-shrink-0 disabled:opacity-60"
                        >
                          Register
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 mb-2">Can&apos;t find them? They may not have the app yet.</p>
                <button
                  onClick={() => setMode('create')}
                  className="w-full border border-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-lg"
                >
                  Create a new patient account
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="First name" value={form.firstName} onChange={update('firstName')}
                  className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                <input required placeholder="Last name" value={form.lastName} onChange={update('lastName')}
                  className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </div>

              <input required type="email" placeholder="Email address" value={form.email} onChange={update('email')}
                className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

              <input placeholder="Phone (optional)" value={form.phone} onChange={update('phone')}
                className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')}
                  className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                <select value={form.gender} onChange={update('gender')}
                  className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary">
                  <option value="">Gender (optional)</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              <select value={form.bloodGroup} onChange={update('bloodGroup')}
                className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary">
                {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b.replace('_', ' ')}</option>)}
              </select>

              <input placeholder="Allergies (comma-separated, optional)" value={form.allergies} onChange={update('allergies')}
                className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

              <input placeholder="Chronic conditions (comma-separated, optional)" value={form.chronicConditions} onChange={update('chronicConditions')}
                className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

              <div className="border-t border-gray-100 pt-3 mt-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Emergency contact (optional)</p>
              </div>
              <input placeholder="Name" value={form.emergencyName} onChange={update('emergencyName')}
                className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Phone" value={form.emergencyPhone} onChange={update('emergencyPhone')}
                  className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                <input placeholder="Relation" value={form.emergencyRelation} onChange={update('emergencyRelation')}
                  className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </div>

              <div className="border-t border-gray-100 pt-3 mt-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Insurance (optional)</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Provider" value={form.insuranceProvider} onChange={update('insuranceProvider')}
                  className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
                <input placeholder="Policy number" value={form.insuranceNumber} onChange={update('insuranceNumber')}
                  className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 bg-primary text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
              >
                {submitting ? 'Registering...' : 'Register Patient'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-400 flex-shrink-0">{label}</dt>
      <dd className="text-[#0D1117] font-medium text-right">{value}</dd>
    </div>
  )
}