'use client'
import { useState } from 'react'
import api from '@/lib/api'

export function errorMessage(err: unknown, fallback: string) {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  if (Array.isArray(msg)) return msg.join(', ')
  return msg || fallback
}

type Fields = {
  bpSystolic: string
  bpDiastolic: string
  pulse: string
  temperature: string
  spo2: string
  weight: string
  height: string
  notes: string
}

const EMPTY: Fields = {
  bpSystolic: '', bpDiastolic: '', pulse: '', temperature: '', spo2: '', weight: '', height: '', notes: '',
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary'

// Records one set of vital signs against an appointment. Used by the nurse
// page and inside the doctor's consultation screen.
export default function VitalsForm({
  appointmentId,
  onSaved,
}: {
  appointmentId: string
  onSaved: () => void
}) {
  const [f, setF] = useState<Fields>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const body: Record<string, number | string> = {}
    const whole = (k: 'bpSystolic' | 'bpDiastolic' | 'pulse' | 'spo2') => {
      if (f[k].trim() !== '') body[k] = parseInt(f[k], 10)
    }
    const decimal = (k: 'temperature' | 'weight' | 'height') => {
      if (f[k].trim() !== '') body[k] = parseFloat(f[k])
    }
    whole('bpSystolic'); whole('bpDiastolic'); whole('pulse'); whole('spo2')
    decimal('temperature'); decimal('weight'); decimal('height')
    if (f.notes.trim()) body.notes = f.notes.trim()

    const numbers = Object.entries(body).filter(([k]) => k !== 'notes')
    if (numbers.length === 0) {
      setError('Enter at least one measurement.')
      return
    }
    if (numbers.some(([, v]) => typeof v === 'number' && Number.isNaN(v))) {
      setError('One of the measurements is not a valid number.')
      return
    }

    setSaving(true)
    try {
      await api.post(`/clinical/appointments/${appointmentId}/vitals`, body)
      setF(EMPTY)
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Could not save vitals'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <label className="text-xs text-gray-500">
          BP upper (mmHg)
          <input className={inputClass} inputMode="numeric" value={f.bpSystolic} onChange={set('bpSystolic')} placeholder="120" />
        </label>
        <label className="text-xs text-gray-500">
          BP lower (mmHg)
          <input className={inputClass} inputMode="numeric" value={f.bpDiastolic} onChange={set('bpDiastolic')} placeholder="80" />
        </label>
        <label className="text-xs text-gray-500">
          Pulse (bpm)
          <input className={inputClass} inputMode="numeric" value={f.pulse} onChange={set('pulse')} placeholder="72" />
        </label>
        <label className="text-xs text-gray-500">
          Temp (°C)
          <input className={inputClass} inputMode="decimal" value={f.temperature} onChange={set('temperature')} placeholder="36.6" />
        </label>
        <label className="text-xs text-gray-500">
          SpO₂ (%)
          <input className={inputClass} inputMode="numeric" value={f.spo2} onChange={set('spo2')} placeholder="98" />
        </label>
        <label className="text-xs text-gray-500">
          Weight (kg)
          <input className={inputClass} inputMode="decimal" value={f.weight} onChange={set('weight')} placeholder="70" />
        </label>
        <label className="text-xs text-gray-500">
          Height (cm)
          <input className={inputClass} inputMode="decimal" value={f.height} onChange={set('height')} placeholder="170" />
        </label>
      </div>
      <input className={inputClass} value={f.notes} onChange={set('notes')} placeholder="Notes (optional)" />
      <button
        type="submit"
        disabled={saving}
        className="self-start bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Save vitals'}
      </button>
    </form>
  )
}