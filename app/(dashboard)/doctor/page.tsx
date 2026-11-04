'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { errorMessage } from '@/components/VitalsForm'

type Row = {
  id: string
  type: 'IN_PERSON' | 'TELEMEDICINE' | 'REQUEST'
  status: string
  scheduledAt: string
  reason: string | null
  vitalsTaken: boolean
  patientNumber: string | null
  patient: { id: string; firstName: string; lastName: string; gender: string | null; dateOfBirth: string | null }
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: '#92400E', bg: '#FEF3C7' },
  CONFIRMED: { label: 'Booked', color: '#065F7A', bg: '#E0F4FB' },
  CHECKED_IN: { label: 'Waiting', color: '#9A3412', bg: '#FFEDD5' },
  IN_PROGRESS: { label: 'In consultation', color: '#3C3489', bg: '#EEEDFE' },
  COMPLETED: { label: 'Done', color: '#0B6B4D', bg: '#E6FAF4' },
  NO_SHOW: { label: 'No-show', color: '#991B1B', bg: '#FEE2E2' },
}

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { from: start.toISOString(), to: end.toISOString() }
}

function age(dob: string | null) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

export default function DoctorQueuePage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/clinical/queue', { params: todayRange() })
      setRows(data)
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Could not load your patients'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const start = async (id: string) => {
    setStarting(id)
    setError('')
    try {
      await api.post(`/clinical/appointments/${id}/start`)
      router.push(`/doctor/${id}`)
    } catch (err) {
      setError(errorMessage(err, 'Could not start this visit'))
      load()
    } finally {
      setStarting(null)
    }
  }

  const waiting = rows.filter(r => r.status === 'CHECKED_IN').length

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0D1117]">My patients today</h1>
        <p className="text-sm text-gray-400 mt-1">
          {waiting > 0 ? `${waiting} waiting to be seen` : 'No one is waiting right now'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-12 text-center text-sm text-gray-400">You have no appointments today.</p>
        ) : (
          <ul>
            {rows.map(r => {
              const s = STATUS_STYLE[r.status] ?? { label: r.status, color: '#374151', bg: '#F3F4F6' }
              const a = age(r.patient.dateOfBirth)
              const canStart = r.status === 'CHECKED_IN' || (r.type === 'TELEMEDICINE' && r.status === 'CONFIRMED')
              return (
                <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0D1117] truncate">
                      {new Date(r.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{r.patient.firstName} {r.patient.lastName}
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        {a !== null ? `${a} yrs` : ''}{r.patient.gender ? ` · ${r.patient.gender.charAt(0)}` : ''}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {r.patientNumber ?? '—'}{r.type === 'TELEMEDICINE' ? ' · Telemedicine' : ''}{r.reason ? ` · ${r.reason}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {r.vitalsTaken && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: '#E6FAF4', color: '#0B6B4D' }}>
                        Vitals taken
                      </span>
                    )}
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                    {canStart ? (
                      <button
                        onClick={() => start(r.id)}
                        disabled={starting === r.id}
                        className="bg-primary text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-60"
                      >
                        {starting === r.id ? 'Starting...' : 'Start consultation'}
                      </button>
                    ) : r.status === 'IN_PROGRESS' ? (
                      <Link href={`/doctor/${r.id}`} className="bg-primary text-white text-xs font-semibold px-3 py-2 rounded-lg">
                        Continue
                      </Link>
                    ) : r.status === 'COMPLETED' ? (
                      <Link href={`/doctor/${r.id}`} className="text-xs font-semibold text-primary px-3 py-2">
                        View
                      </Link>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}