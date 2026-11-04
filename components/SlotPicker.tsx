'use client'
import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'

type Busy = { start: string; end: string }

const FIRST_HOUR = 8   // first slot 08:00
const LAST_HOUR = 17   // last slot starts 16:30, day ends 17:00
const STEP = 30        // minutes

function startOfDay(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

const todayStr = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// Pick a day, then a free 30-minute time for one doctor.
export default function SlotPicker({
  doctorId, value, onChange, initialDate,
}: {
  doctorId: string
  value: string | null
  onChange: (iso: string | null) => void
  initialDate?: string
}) {
  const [date, setDate] = useState(initialDate || todayStr())
  const [busy, setBusy] = useState<Busy[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    onChange(null)
    if (!doctorId || !date) { setBusy([]); return }
    let stop = false
    const from = startOfDay(date)
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000)
    setLoading(true); setError('')
    api.get<Busy[]>('/scheduling/busy', { params: { doctorId, from: from.toISOString(), to: to.toISOString() } })
      .then(r => { if (!stop) setBusy(r.data) })
      .catch(() => { if (!stop) setError('Could not load availability') })
      .finally(() => { if (!stop) setLoading(false) })
    return () => { stop = true }
    // onChange is intentionally left out so a new parent render doesn't reset the choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, date])

  const slots = useMemo(() => {
    const base = startOfDay(date)
    const out: { iso: string; label: string; taken: boolean }[] = []
    for (let mins = FIRST_HOUR * 60; mins < LAST_HOUR * 60; mins += STEP) {
      const s = new Date(base.getTime() + mins * 60 * 1000)
      const e = new Date(s.getTime() + STEP * 60 * 1000)
      const past = s.getTime() < Date.now()
      const clash = busy.some(b => new Date(b.start).getTime() < e.getTime() && new Date(b.end).getTime() > s.getTime())
      out.push({
        iso: s.toISOString(),
        label: s.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        taken: past || clash,
      })
    }
    return out
  }, [date, busy])

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-500">
        Day
        <input
          type="date"
          min={todayStr()}
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {loading ? (
        <p className="text-xs text-gray-400">Checking availability...</p>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {slots.map(s => (
            <button
              key={s.iso}
              type="button"
              disabled={s.taken}
              onClick={() => onChange(value === s.iso ? null : s.iso)}
              className="text-xs font-medium py-1.5 rounded-md border disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                borderColor: value === s.iso ? '#0A7EA4' : '#E5E7EB',
                backgroundColor: value === s.iso ? '#0A7EA4' : '#fff',
                color: value === s.iso ? '#fff' : '#374151',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
