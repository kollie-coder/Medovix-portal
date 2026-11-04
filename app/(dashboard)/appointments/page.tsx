'use client'
import { useEffect, useState } from 'react'
import { HiOutlineSearch, HiX } from 'react-icons/hi'
import api from '@/lib/api'

type Doctor = {
  id: string
  firstName: string
  lastName: string
  department: { name: string } | null
}

type AppointmentListItem = {
  id: string
  type: string
  status: string
  scheduledAt: string
  duration: number
  reason: string | null
  patient: { id: string; firstName: string; lastName: string; avatar: string | null; phone: string | null }
  doctor: { id: string; firstName: string; lastName: string; avatar: string | null; department: { name: string } | null }
}

type AppointmentDetail = AppointmentListItem & {
  notes: string | null
  cancelledAt: string | null
  cancelReason: string | null
  completedAt: string | null
  createdAt: string
  patient: AppointmentListItem['patient'] & { email: string }
}

const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#FFF3E0', text: '#8A5A00' },
  CONFIRMED: { bg: '#E0F4FB', text: '#065f7a' },
  CANCELLED: { bg: '#FFEBEE', text: '#C62828' },
  COMPLETED: { bg: '#E6FAF4', text: '#085041' },
  NO_SHOW: { bg: '#F3F4F6', text: '#6B7280' },
}

const DATE_FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'today', label: 'Today' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
] as const

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function dateRangeFor(key: string): { from?: string; to?: string } {
  const now = new Date()
  if (key === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const end = new Date(now); end.setHours(23, 59, 59, 999)
    return { from: start.toISOString(), to: end.toISOString() }
  }
  if (key === 'upcoming') {
    return { from: now.toISOString() }
  }
  if (key === 'past') {
    return { to: now.toISOString() }
  }
  return {}
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('upcoming')
  const [viewId, setViewId] = useState<string | null>(null)

  useEffect(() => {
    api.get('/hospital-admin/appointments/doctors').then(({ data }) => setDoctors(data)).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, doctorId, dateFilter])

  const load = async () => {
    setLoading(true)
    try {
      const { from, to } = dateRangeFor(dateFilter)
      const { data } = await api.get('/hospital-admin/appointments', {
        params: {
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
          ...(doctorId ? { doctorId } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        },
      })
      setAppointments(data)
    } catch (err) {
      console.error('Failed to load appointments', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0D1117]">Appointments</h1>
        <p className="text-sm text-gray-400 mt-1">Everything scheduled across your hospital</p>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <HiOutlineSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient or doctor"
            className="w-64 pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>

        <select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="">All doctors</option>
          {doctors.map(d => (
            <option key={d.id} value={d.id}>
              Dr. {d.firstName} {d.lastName}{d.department ? ` · ${d.department.name}` : ''}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
          {DATE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setDateFilter(f.key)}
              className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
              style={{
                backgroundColor: dateFilter === f.key ? '#ffffff' : 'transparent',
                color: dateFilter === f.key ? '#0A7EA4' : '#6B7280',
                boxShadow: dateFilter === f.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-400">No appointments match these filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Patient</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Doctor</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Type</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">When</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const statusStyle = STATUS_COLORS[a.status] ?? { bg: '#F3F4F6', text: '#374151' }
                return (
                  <tr
                    key={a.id}
                    onClick={() => setViewId(a.id)}
                    className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/60"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {a.patient.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.patient.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                            style={{ backgroundColor: '#E0F4FB', color: '#065f7a' }}>
                            {initials(a.patient.firstName, a.patient.lastName)}
                          </div>
                        )}
                        <span className="font-medium text-[#0D1117]">{a.patient.firstName} {a.patient.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      Dr. {a.doctor.firstName} {a.doctor.lastName}
                      {a.doctor.department ? <span className="text-gray-400"> · {a.doctor.department.name}</span> : null}
                    </td>
                    <td className="px-5 py-4 text-gray-500">{a.type.replace('_', ' ')}</td>
                    <td className="px-5 py-4 text-gray-500">{formatDateTime(a.scheduledAt)} · {a.duration}min</td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {viewId && (
        <AppointmentDetailModal
          appointmentId={viewId}
          onClose={() => setViewId(null)}
          onUpdated={load}
        />
      )}
    </div>
  )
}

function AppointmentDetailModal({
  appointmentId,
  onClose,
  onUpdated,
}: {
  appointmentId: string
  onClose: () => void
  onUpdated: () => void
}) {
  const [detail, setDetail] = useState<AppointmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [newDateTime, setNewDateTime] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    api.get(`/hospital-admin/appointments/${appointmentId}`)
      .then(({ data }) => setDetail(data))
      .catch((err) => setError(err?.response?.data?.message ?? 'Could not load appointment'))
      .finally(() => setLoading(false))
  }, [appointmentId])

  const refresh = async () => {
    const { data } = await api.get(`/hospital-admin/appointments/${appointmentId}`)
    setDetail(data)
    onUpdated()
  }

  const setStatus = async (status: string) => {
    setError('')
    setSaving(true)
    try {
      await api.patch(`/hospital-admin/appointments/${appointmentId}`, { status })
      await refresh()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not update appointment')
    } finally {
      setSaving(false)
    }
  }

  const submitCancel = async () => {
    setError('')
    setSaving(true)
    try {
      await api.patch(`/hospital-admin/appointments/${appointmentId}`, {
        status: 'CANCELLED',
        cancelReason: cancelReason || undefined,
      })
      setCancelling(false)
      await refresh()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not cancel appointment')
    } finally {
      setSaving(false)
    }
  }

  const submitReschedule = async () => {
    if (!newDateTime) return
    setError('')
    setSaving(true)
    try {
      await api.patch(`/hospital-admin/appointments/${appointmentId}`, {
        scheduledAt: new Date(newDateTime).toISOString(),
        status: 'CONFIRMED',
      })
      setRescheduling(false)
      await refresh()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not reschedule appointment')
    } finally {
      setSaving(false)
    }
  }

  const statusStyle = detail ? (STATUS_COLORS[detail.status] ?? { bg: '#F3F4F6', text: '#374151' }) : null
  const isTerminal = detail && ['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(detail.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0D1117]">Appointment</h2>
          <button onClick={onClose} className="text-gray-400"><HiX size={20} /></button>
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

              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-base font-bold text-[#0D1117]">{detail.patient.firstName} {detail.patient.lastName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{detail.patient.email}{detail.patient.phone ? ` · ${detail.patient.phone}` : ''}</p>
                </div>
                {statusStyle && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                    {detail.status.replace('_', ' ')}
                  </span>
                )}
              </div>

              <dl className="flex flex-col gap-3 text-sm mb-5">
                <Row label="Doctor" value={`Dr. ${detail.doctor.firstName} ${detail.doctor.lastName}${detail.doctor.department ? ` · ${detail.doctor.department.name}` : ''}`} />
                <Row label="Type" value={detail.type.replace('_', ' ')} />
                <Row label="Scheduled" value={`${formatDateTime(detail.scheduledAt)} · ${detail.duration} min`} />
                {detail.reason && <Row label="Reason" value={detail.reason} />}
                {detail.notes && <Row label="Notes" value={detail.notes} />}
                {detail.status === 'CANCELLED' && (
                  <Row label="Cancelled" value={`${detail.cancelledAt ? formatDateTime(detail.cancelledAt) : ''}${detail.cancelReason ? ` · ${detail.cancelReason}` : ''}`} />
                )}
                {detail.status === 'COMPLETED' && detail.completedAt && (
                  <Row label="Completed" value={formatDateTime(detail.completedAt)} />
                )}
              </dl>

              {rescheduling ? (
                <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">New date & time</p>
                  <input
                    type="datetime-local"
                    value={newDateTime}
                    onChange={(e) => setNewDateTime(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setRescheduling(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-lg">
                      Cancel
                    </button>
                    <button onClick={submitReschedule} disabled={saving || !newDateTime} className="flex-1 bg-primary text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60">
                      {saving ? 'Saving...' : 'Confirm new time'}
                    </button>
                  </div>
                </div>
              ) : cancelling ? (
                <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason (optional)</p>
                  <input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Patient requested"
                    className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setCancelling(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-lg">
                      Back
                    </button>
                    <button onClick={submitCancel} disabled={saving} className="flex-1 bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60">
                      {saving ? 'Cancelling...' : 'Cancel appointment'}
                    </button>
                  </div>
                </div>
              ) : !isTerminal ? (
                <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
                  {detail.status === 'PENDING' && (
                    <button onClick={() => setStatus('CONFIRMED')} disabled={saving} className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60">
                      Confirm appointment
                    </button>
                  )}
                  {detail.status === 'CONFIRMED' && (
                    <>
                      <button onClick={() => setStatus('COMPLETED')} disabled={saving} className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60">
                        Mark as completed
                      </button>
                      <button onClick={() => setStatus('NO_SHOW')} disabled={saving} className="w-full border border-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60">
                        Mark as no-show
                      </button>
                    </>
                  )}
                  <button onClick={() => { setNewDateTime(''); setRescheduling(true) }} className="w-full border border-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-lg">
                    Reschedule
                  </button>
                  <button onClick={() => { setCancelReason(''); setCancelling(true) }} className="w-full text-red-600 text-sm font-semibold py-2.5 rounded-lg">
                    Cancel appointment
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
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