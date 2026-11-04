'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { HiOutlineCalendar, HiOutlinePlus, HiX, HiOutlineUserGroup } from 'react-icons/hi'
import api from '@/lib/api'

type QueueItem = {
  id: string
  type: 'IN_PERSON' | 'TELEMEDICINE' | 'REQUEST'
  status: string
  scheduledAt: string
  duration: number
  reason: string | null
  patientNumber: string | null
  patient: { id: string; firstName: string; lastName: string; phone: string | null }
  doctor: { id: string; firstName: string; lastName: string; department: { name: string } | null }
}

type Doctor = { id: string; firstName: string; lastName: string; department: { name: string } | null }

type PatientRow = {
  id: string
  patientNumber: string
  status: string
  patient: { id: string; firstName: string; lastName: string; phone: string | null; email: string }
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: '#92400E', bg: '#FEF3C7' },
  CONFIRMED: { label: 'Booked', color: '#065F7A', bg: '#E0F4FB' },
  CHECKED_IN: { label: 'Waiting', color: '#9A3412', bg: '#FFEDD5' },
  IN_PROGRESS: { label: 'With doctor', color: '#3C3489', bg: '#EEEDFE' },
  COMPLETED: { label: 'Done', color: '#0B6B4D', bg: '#E6FAF4' },
  CANCELLED: { label: 'Cancelled', color: '#6B7280', bg: '#F3F4F6' },
  NO_SHOW: { label: 'No-show', color: '#991B1B', bg: '#FEE2E2' },
}

function errorMessage(err: unknown, fallback: string) {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  if (Array.isArray(msg)) return msg.join(', ')
  return msg || fallback
}

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { from: start.toISOString(), to: end.toISOString() }
}

function localDateInput(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function localTimeInput(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function ReceptionPage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showBooking, setShowBooking] = useState(false)

  const loadQueue = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data } = await api.get('/hospital-admin/appointments/queue', { params: todayRange() })
      setQueue(data)
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Could not load today’s queue'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQueue()
    // Keep the desk's view fresh without anyone pressing refresh.
    const timer = setInterval(() => loadQueue(true), 30000)
    return () => clearInterval(timer)
  }, [loadQueue])

  const act = async (id: string, request: () => Promise<unknown>) => {
    setBusyId(id)
    setError('')
    try {
      await request()
      await loadQueue(true)
    } catch (err) {
      setError(errorMessage(err, 'That action failed'))
    } finally {
      setBusyId(null)
    }
  }

  const checkIn = (id: string) => act(id, () => api.post(`/hospital-admin/appointments/${id}/check-in`))
  const markNoShow = (id: string) =>
    act(id, () => api.patch(`/hospital-admin/appointments/${id}`, { status: 'NO_SHOW' }))

  const counts = useMemo(() => {
    const c = { booked: 0, waiting: 0, withDoctor: 0, done: 0 }
    for (const a of queue) {
      if (a.status === 'PENDING' || a.status === 'CONFIRMED') c.booked++
      else if (a.status === 'CHECKED_IN') c.waiting++
      else if (a.status === 'IN_PROGRESS') c.withDoctor++
      else if (a.status === 'COMPLETED') c.done++
    }
    return c
  }, [queue])

  const summary = [
    { label: 'Booked', value: counts.booked, color: '#0A7EA4', bg: '#E0F4FB' },
    { label: 'Waiting', value: counts.waiting, color: '#EA580C', bg: '#FFEDD5' },
    { label: 'With doctor', value: counts.withDoctor, color: '#534AB7', bg: '#EEEDFE' },
    { label: 'Done', value: counts.done, color: '#12B886', bg: '#E6FAF4' },
  ]

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0D1117]">Reception</h1>
          <p className="text-sm text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/patients"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-[#0D1117] hover:bg-gray-50"
          >
            <HiOutlineUserGroup size={16} />
            Patients
          </Link>
          <button
            onClick={() => setShowBooking(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#0A7EA4' }}
          >
            <HiOutlinePlus size={16} />
            Book appointment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summary.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{loading ? '—' : s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <HiOutlineCalendar size={18} className="text-gray-400" />
          <h2 className="text-sm font-bold text-[#0D1117]">Today’s queue</h2>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-sm text-gray-400 text-center">Loading…</p>
        ) : queue.length === 0 ? (
          <p className="px-5 py-10 text-sm text-gray-400 text-center">No appointments today yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {queue.map(a => {
              const style = STATUS_STYLE[a.status] ?? { label: a.status, color: '#374151', bg: '#F3F4F6' }
              const canCheckIn = a.status === 'PENDING' || a.status === 'CONFIRMED'
              const busy = busyId === a.id
              return (
                <li key={a.id} className="px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="w-16 shrink-0">
                    <p className="text-sm font-bold text-[#0D1117]">{formatTime(a.scheduledAt)}</p>
                    <p className="text-[11px] text-gray-400">{a.duration} min</p>
                  </div>

                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-semibold text-[#0D1117]">
                      {a.patient.firstName} {a.patient.lastName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.patientNumber ?? 'No patient number'}
                      {a.patient.phone ? ` · ${a.patient.phone}` : ''}
                    </p>
                  </div>

                  <div className="flex-1 min-w-[160px]">
                    <p className="text-sm text-[#0D1117]">Dr {a.doctor.firstName} {a.doctor.lastName}</p>
                    <p className="text-xs text-gray-400">
                      {a.doctor.department?.name ?? 'No department'}
                      {a.type === 'TELEMEDICINE' ? ' · Telemedicine' : ''}
                    </p>
                  </div>

                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ color: style.color, backgroundColor: style.bg }}
                  >
                    {style.label}
                  </span>

                  <div className="flex gap-2 w-[170px] justify-end">
                    {canCheckIn && (
                      <>
                        <button
                          disabled={busy}
                          onClick={() => checkIn(a.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                          style={{ backgroundColor: '#12B886' }}
                        >
                          Check in
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => markNoShow(a.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          No-show
                        </button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {showBooking && (
        <BookingModal
          onClose={() => setShowBooking(false)}
          onBooked={() => {
            setShowBooking(false)
            loadQueue(true)
          }}
        />
      )}
    </div>
  )
}

// ── Book appointment ────────────────────────────────────────
function BookingModal({ onClose, onBooked }: { onClose: () => void; onBooked: () => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<PatientRow[]>([])
  const [searching, setSearching] = useState(false)
  const [patient, setPatient] = useState<PatientRow['patient'] | null>(null)
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState(localDateInput())
  const [time, setTime] = useState(localTimeInput())
  const [duration, setDuration] = useState(30)
  const [type, setType] = useState<'IN_PERSON' | 'TELEMEDICINE'>('IN_PERSON')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/hospital-admin/appointments/doctors')
      .then(({ data }) => setDoctors(data))
      .catch(err => setError(errorMessage(err, 'Could not load doctors')))
  }, [])

  // Debounced patient search (registered patients of this hospital only).
  useEffect(() => {
    if (patient || search.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/hospital-admin/patients', { params: { search: search.trim() } })
        setResults(data.slice(0, 8))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, patient])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!patient) return setError('Choose a patient')
    if (!doctorId) return setError('Choose a doctor')
    const when = new Date(`${date}T${time}`)
    if (Number.isNaN(when.getTime())) return setError('Enter a valid date and time')

    setSubmitting(true)
    try {
      await api.post('/hospital-admin/appointments', {
        patientId: patient.id,
        doctorId,
        scheduledAt: when.toISOString(),
        duration,
        type,
        reason: reason.trim() || undefined,
      })
      onBooked()
    } catch (err) {
      setError(errorMessage(err, 'Could not book the appointment'))
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-[#0D1117] outline-none focus:border-[#0A7EA4] bg-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0D1117]">Book appointment</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <HiX size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Patient */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Patient</label>
            {patient ? (
              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3.5 py-2.5">
                <p className="text-sm font-semibold text-[#0D1117]">
                  {patient.firstName} {patient.lastName}
                  <span className="font-normal text-gray-400">
                    {patient.phone ? ` · ${patient.phone}` : ''}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPatient(null)
                    setSearch('')
                  }}
                  className="text-xs font-semibold text-[#0A7EA4]"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, phone or email"
                  className={fieldClass}
                  autoFocus
                />
                {search.trim().length >= 2 && (
                  <div className="mt-2 rounded-xl border border-gray-100 overflow-hidden">
                    {searching ? (
                      <p className="px-3.5 py-3 text-xs text-gray-400">Searching…</p>
                    ) : results.length === 0 ? (
                      <p className="px-3.5 py-3 text-xs text-gray-400">
                        No registered patient found.{' '}
                        <Link href="/patients" className="font-semibold text-[#0A7EA4]">Register them first</Link>
                      </p>
                    ) : (
                      results.map(r => (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => setPatient(r.patient)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        >
                          <p className="text-sm font-semibold text-[#0D1117]">
                            {r.patient.firstName} {r.patient.lastName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {r.patientNumber}
                            {r.patient.phone ? ` · ${r.patient.phone}` : ''}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Doctor</label>
            <select value={doctorId} onChange={e => setDoctorId(e.target.value)} className={fieldClass}>
              <option value="">Select a doctor</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  Dr {d.firstName} {d.lastName}
                  {d.department?.name ? ` — ${d.department.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* When */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                min={localDateInput()}
                onChange={e => setDate(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Length</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} className={fieldClass}>
                {[15, 30, 45, 60].map(m => (
                  <option key={m} value={m}>{m} minutes</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as 'IN_PERSON' | 'TELEMEDICINE')}
                className={fieldClass}
              >
                <option value="IN_PERSON">In person</option>
                <option value="TELEMEDICINE">Telemedicine</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reason (optional)</label>
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Follow-up, headaches"
              className={fieldClass}
              maxLength={200}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#0A7EA4' }}
          >
            {submitting ? 'Booking…' : 'Book appointment'}
          </button>
        </div>
      </form>
    </div>
  )
}