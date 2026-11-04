'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi'
import api from '@/lib/api'
import { errorMessage } from '@/components/VitalsForm'

type Entry = {
  id: string
  scheduledAt: string
  duration: number
  status: string
  type: string
  reason: string | null
  patient: { id: string; firstName: string; lastName: string }
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: '#92400E', bg: '#FEF3C7' },
  CONFIRMED: { label: 'Confirmed', color: '#1E40AF', bg: '#DBEAFE' },
  CHECKED_IN: { label: 'Waiting', color: '#9A3412', bg: '#FFEDD5' },
  IN_PROGRESS: { label: 'With doctor', color: '#0B6B4D', bg: '#E6FAF4' },
  COMPLETED: { label: 'Done', color: '#374151', bg: '#F3F4F6' },
  CANCELLED: { label: 'Cancelled', color: '#991B1B', bg: '#FEE2E2' },
  NO_SHOW: { label: 'No show', color: '#991B1B', bg: '#FEE2E2' },
}

function mondayOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = (x.getDay() + 6) % 7 // Monday = 0
  x.setDate(x.getDate() - day)
  return x
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const to = new Date(weekStart); to.setDate(to.getDate() + 7)
    try {
      const { data } = await api.get<Entry[]>('/scheduling/schedule', { params: { from: weekStart.toISOString(), to: to.toISOString() } })
      setEntries(data)
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Could not load your schedule'))
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { setLoading(true); load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [load])

  const shift = (days: number) => setWeekStart(w => { const n = new Date(w); n.setDate(n.getDate() + days); return n })

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i)
    return d
  })
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const today = new Date()
  const weekEnd = days[6]

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0D1117]">My schedule</h1>
          <p className="text-sm text-gray-400 mt-1">
            {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} to {weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-7)} className="p-2 rounded-lg border border-gray-200 bg-white" aria-label="Previous week"><HiChevronLeft size={16} /></button>
          <button onClick={() => setWeekStart(mondayOf(new Date()))} className="text-sm font-semibold text-primary px-3">This week</button>
          <button onClick={() => shift(7)} className="p-2 rounded-lg border border-gray-200 bg-white" aria-label="Next week"><HiChevronRight size={16} /></button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4"><p className="text-sm text-red-600">{error}</p></div>}

      {loading ? (
        <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map(d => {
            const list = entries.filter(e => sameDay(new Date(e.scheduledAt), d))
            const isToday = sameDay(d, today)
            return (
              <section key={d.toISOString()}>
                <h2 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: isToday ? '#0A7EA4' : '#6B7280' }}>
                  {d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}{isToday ? ' · Today' : ''}
                </h2>
                {list.length === 0 ? (
                  <p className="text-sm text-gray-300">Nothing booked</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {list.map(e => {
                      const st = STATUS_STYLE[e.status] ?? { label: e.status, color: '#374151', bg: '#F3F4F6' }
                      return (
                        <li key={e.id}>
                          <Link href={`/doctor/${e.id}`} className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-primary/40">
                            <span className="text-sm font-semibold text-[#0D1117] w-14">
                              {new Date(e.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-semibold text-[#0D1117] truncate">{e.patient.firstName} {e.patient.lastName}</span>
                              {e.reason && <span className="block text-xs text-gray-400 truncate">{e.reason}</span>}
                            </span>
                            <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
