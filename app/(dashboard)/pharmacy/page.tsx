'use client'
import { useCallback, useEffect, useState } from 'react'
import { HiX, HiOutlineExclamation } from 'react-icons/hi'
import api from '@/lib/api'
import { errorMessage } from '@/components/VitalsForm'

type Med = { name: string; dosage: string; frequency: string; duration: string; instructions: string | null }
type Match = { medication: string; allergy: string }

type Rx = {
  id: string
  status: 'ACTIVE' | 'DISPENSED' | 'CANCELLED' | 'COMPLETED'
  expiryDate: string | null
  refillsAllowed: number
  refillsUsed: number
  notes: string | null
  dispensedAt: string | null
  createdAt: string
  medications: Med[]
  dispensedBy: { firstName: string; lastName: string } | null
  allergies: string[]
  allergyMatches: Match[]
  expired: boolean
  supplyAvailable: boolean
  patientNumber: string | null
  record: {
    patient: { id: string; firstName: string; lastName: string; gender: string | null; dateOfBirth: string | null }
    createdBy: { firstName: string; lastName: string }
  }
}

type View = 'to-dispense' | 'dispensed' | 'declined'

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary'

function age(dob: string | null) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PharmacyPage() {
  const [view, setView] = useState<View>('to-dispense')
  const [items, setItems] = useState<Rx[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [warn, setWarn] = useState<{ rx: Rx; matches: Match[] } | null>(null)
  const [declineFor, setDeclineFor] = useState<Rx | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Rx[]>('/pharmacy/prescriptions', { params: { view } })
      setItems(data)
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Could not load prescriptions'))
    } finally {
      setLoading(false)
    }
  }, [view])

  useEffect(() => {
    setLoading(true)
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const dispense = async (rx: Rx, confirmAllergyOverride = false) => {
    setBusy(rx.id); setError('')
    try {
      await api.post(`/pharmacy/prescriptions/${rx.id}/dispense`, confirmAllergyOverride ? { confirmAllergyOverride: true } : {})
      setWarn(null)
      await load()
    } catch (err) {
      const data = (err as { response?: { data?: { code?: string; matches?: Match[] } } })?.response?.data
      if (data?.code === 'ALLERGY_WARNING' && data.matches) {
        setWarn({ rx, matches: data.matches })
      } else {
        setError(errorMessage(err, 'Could not dispense this prescription'))
        await load()
      }
    } finally {
      setBusy(null)
    }
  }

  const tabs: { key: View; label: string }[] = [
    { key: 'to-dispense', label: 'To dispense' },
    { key: 'dispensed', label: 'Dispensed' },
    { key: 'declined', label: 'Declined' },
  ]

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0D1117]">Prescriptions</h1>
        <p className="text-sm text-gray-400 mt-1">Oldest first. Check allergies before you dispense.</p>
      </div>

      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`text-sm font-semibold px-4 py-2 rounded-lg ${view === t.key ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-sm text-gray-400">Nothing here.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map(rx => {
            const a = age(rx.record.patient.dateOfBirth)
            const refillNumber = rx.dispensedAt ? rx.refillsUsed + 1 : 0
            return (
              <div key={rx.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-[#0D1117]">
                      {rx.record.patient.firstName} {rx.record.patient.lastName}
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        {a !== null ? `${a} yrs` : ''}{rx.record.patient.gender ? ` · ${rx.record.patient.gender.charAt(0)}` : ''}
                        {rx.patientNumber ? ` · ${rx.patientNumber}` : ''}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Dr {rx.record.createdBy.firstName} {rx.record.createdBy.lastName} · {fmt(rx.createdAt)}
                      {rx.expiryDate ? ` · ${rx.expired ? 'expired' : 'valid until'} ${fmt(rx.expiryDate)}` : ''}
                    </p>
                  </div>
                  {rx.status === 'ACTIVE' && (
                    <div className="flex items-center gap-3">
                      <button onClick={() => setDeclineFor(rx)} disabled={rx.dispensedAt !== null} className="text-xs font-semibold text-red-600 px-2 py-2 disabled:opacity-30">
                        Decline
                      </button>
                      <button
                        onClick={() => dispense(rx)}
                        disabled={busy === rx.id || rx.expired || !rx.supplyAvailable}
                        className="bg-primary text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                      >
                        {busy === rx.id ? 'Working...' : rx.dispensedAt ? `Dispense refill ${refillNumber}` : 'Dispense'}
                      </button>
                    </div>
                  )}
                </div>

                {rx.allergies.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Allergies</span>
                    {rx.allergies.map(al => (
                      <span key={al} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-red-50 text-red-700">
                        <HiOutlineExclamation size={12} /> {al}
                      </span>
                    ))}
                  </div>
                )}
                {rx.allergyMatches.length > 0 && rx.status === 'ACTIVE' && (
                  <div className="mt-2 bg-red-50 border border-red-300 rounded-lg px-3 py-2">
                    <p className="text-sm font-semibold text-red-700">Possible allergy clash</p>
                    {rx.allergyMatches.map((m, i) => <p key={i} className="text-sm text-red-700">{m.medication} — allergic to {m.allergy}</p>)}
                  </div>
                )}

                <ul className="mt-3 flex flex-col gap-1.5">
                  {rx.medications.map((m, i) => (
                    <li key={i} className="text-sm text-[#0D1117]">
                      <span className="font-semibold">{m.name}</span> — {m.dosage}, {m.frequency}, {m.duration}
                      {m.instructions ? <span className="text-gray-500"> ({m.instructions})</span> : null}
                    </li>
                  ))}
                </ul>

                {rx.notes && <p className="mt-3 text-xs text-gray-500 whitespace-pre-wrap">Note: {rx.notes}</p>}
                {rx.refillsAllowed > 0 && (
                  <p className="mt-2 text-xs text-gray-500">Refills: {rx.refillsUsed} of {rx.refillsAllowed} used</p>
                )}
                {rx.status === 'DISPENSED' && rx.dispensedAt && (
                  <p className="mt-2 text-xs text-gray-500">
                    Dispensed {fmt(rx.dispensedAt)}{rx.dispensedBy ? ` by ${rx.dispensedBy.firstName} ${rx.dispensedBy.lastName}` : ''}
                  </p>
                )}
                {rx.status === 'ACTIVE' && rx.expired && <p className="mt-2 text-xs font-semibold text-red-600">Expired — the doctor must issue a new prescription.</p>}
              </div>
            )
          })}
        </div>
      )}

      {warn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <p className="text-base font-bold text-red-700 flex items-center gap-2"><HiOutlineExclamation size={20} /> Allergy warning</p>
            <ul className="mt-3 text-sm text-red-700">
              {warn.matches.map((m, i) => <li key={i}>{m.medication} — patient is allergic to {m.allergy}</li>)}
            </ul>
            <p className="mt-3 text-sm text-gray-600">Check with the doctor before you continue. If you dispense anyway, it is recorded in the audit log.</p>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setWarn(null)} className="text-sm font-semibold text-gray-700 px-4 py-2 border border-gray-200 rounded-lg">Do not dispense</button>
              <button onClick={() => dispense(warn.rx, true)} disabled={busy === warn.rx.id} className="text-sm font-semibold text-white px-4 py-2 rounded-lg bg-red-600 disabled:opacity-60">
                Dispense anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {declineFor && <DeclineModal rx={declineFor} onClose={() => setDeclineFor(null)} onDone={() => { setDeclineFor(null); load() }} />}
    </div>
  )
}

function DeclineModal({ rx, onClose, onDone }: { rx: Rx; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      await api.post(`/pharmacy/prescriptions/${rx.id}/decline`, { reason })
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Could not decline this prescription'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0D1117]">Decline prescription</h2>
          <button onClick={onClose} className="text-gray-400"><HiX size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-6 flex flex-col gap-3">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2"><p className="text-sm text-red-600">{error}</p></div>}
          <p className="text-sm text-gray-600">
            For {rx.record.patient.firstName} {rx.record.patient.lastName}. Dr {rx.record.createdBy.firstName} {rx.record.createdBy.lastName} will be told why.
          </p>
          <input required autoFocus className={inputClass} placeholder="Reason, e.g. dose too high for age" value={reason} onChange={e => setReason(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="text-sm text-gray-500 px-3 py-2">Back</button>
            <button type="submit" disabled={saving} className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
              {saving ? 'Declining...' : 'Decline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
