'use client'
import { useCallback, useEffect, useState } from 'react'
import { HiOutlineHeart, HiX } from 'react-icons/hi'
import api from '@/lib/api'
import VitalsForm, { errorMessage } from '@/components/VitalsForm'

type Row = {
  id: string
  status: string
  scheduledAt: string
  reason: string | null
  vitalsTaken: boolean
  patientNumber: string | null
  patient: { id: string; firstName: string; lastName: string; gender: string | null; dateOfBirth: string | null }
  doctor: { id: string; firstName: string; lastName: string }
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

export default function NursePage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [active, setActive] = useState<Row | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/clinical/nurse-queue', { params: todayRange() })
      setRows(data)
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Could not load the waiting list'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0D1117]">Vitals</h1>
        <p className="text-sm text-gray-400 mt-1">Patients who have arrived today</p>
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
          <p className="p-12 text-center text-sm text-gray-400">No patients are waiting right now.</p>
        ) : (
          <ul>
            {rows.map(r => {
              const a = age(r.patient.dateOfBirth)
              return (
                <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0D1117] truncate">
                      {r.patient.firstName} {r.patient.lastName}
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        {a !== null ? `${a} yrs` : ''}{r.patient.gender ? ` · ${r.patient.gender.charAt(0)}` : ''}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {r.patientNumber ?? '—'} · Dr {r.doctor.firstName} {r.doctor.lastName}
                      {r.reason ? ` · ${r.reason}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {r.status === 'IN_PROGRESS' && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: '#EEEDFE', color: '#3C3489' }}>
                        With doctor
                      </span>
                    )}
                    {r.vitalsTaken && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: '#E6FAF4', color: '#0B6B4D' }}>
                        Vitals taken
                      </span>
                    )}
                    <button
                      onClick={() => setActive(r)}
                      className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-lg"
                    >
                      <HiOutlineHeart size={14} />
                      {r.vitalsTaken ? 'Record again' : 'Take vitals'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-[#0D1117]">
                Vitals — {active.patient.firstName} {active.patient.lastName}
              </h2>
              <button onClick={() => setActive(null)} className="text-gray-400"><HiX size={20} /></button>
            </div>
            <div className="p-6">
              <VitalsForm
                appointmentId={active.id}
                onSaved={() => { setActive(null); load() }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}