'use client'
import { useCallback, useEffect, useState } from 'react'
import { HiOutlinePlus, HiX, HiOutlineExclamation } from 'react-icons/hi'
import api from '@/lib/api'
import { errorMessage } from '@/components/VitalsForm'
import LabResultTable, { LabResultData } from '@/components/LabResultTable'

type Order = {
  id: string
  testName: string
  priority: 'ROUTINE' | 'URGENT'
  status: 'REQUESTED' | 'SAMPLE_COLLECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  clinicalNotes: string | null
  cancelReason: string | null
  sampleCollectedAt: string | null
  completedAt: string | null
  createdAt: string
  patientNumber: string | null
  patient: { id: string; firstName: string; lastName: string; gender: string | null; dateOfBirth: string | null }
  orderedBy: { firstName: string; lastName: string }
  resultRecord: { labResult: LabResultData | null } | null
}

type View = 'open' | 'COMPLETED' | 'CANCELLED'

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  REQUESTED: { label: 'Requested', color: '#065F7A', bg: '#E0F4FB' },
  SAMPLE_COLLECTED: { label: 'Sample collected', color: '#9A3412', bg: '#FFEDD5' },
  IN_PROGRESS: { label: 'In progress', color: '#3C3489', bg: '#EEEDFE' },
  COMPLETED: { label: 'Completed', color: '#0B6B4D', bg: '#E6FAF4' },
  CANCELLED: { label: 'Cancelled', color: '#6B7280', bg: '#F3F4F6' },
}

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary'

function age(dob: string | null) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

function when(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function LabPage() {
  const [view, setView] = useState<View>('open')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [resultFor, setResultFor] = useState<Order | null>(null)
  const [cancelFor, setCancelFor] = useState<Order | null>(null)
  const [correctFor, setCorrectFor] = useState<Order | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Order[]>('/lab/orders', { params: { view } })
      setOrders(data)
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Could not load lab requests'))
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

  const step = async (o: Order, action: 'collect-sample' | 'start') => {
    setBusy(o.id); setError('')
    try {
      await api.post(`/lab/orders/${o.id}/${action}`)
      await load()
    } catch (err) {
      setError(errorMessage(err, 'Could not update this request'))
      await load()
    } finally {
      setBusy(null)
    }
  }

  const tabs: { key: View; label: string }[] = [
    { key: 'open', label: 'To do' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ]

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0D1117]">Lab requests</h1>
        <p className="text-sm text-gray-400 mt-1">Urgent requests are listed first</p>
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

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <p className="p-12 text-center text-sm text-gray-400">Nothing here.</p>
        ) : (
          <ul>
            {orders.map(o => {
              const s = STATUS_STYLE[o.status]
              const a = age(o.patient.dateOfBirth)
              const expanded = openId === o.id
              return (
                <li key={o.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0D1117]">
                        {o.testName}
                        {o.priority === 'URGENT' && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                            <HiOutlineExclamation size={12} /> URGENT
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-[#0D1117] mt-0.5">
                        {o.patient.firstName} {o.patient.lastName}
                        <span className="text-xs text-gray-400">
                          {' '}{a !== null ? `${a} yrs` : ''}{o.patient.gender ? ` · ${o.patient.gender.charAt(0)}` : ''}
                          {o.patientNumber ? ` · ${o.patientNumber}` : ''}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Requested by Dr {o.orderedBy.firstName} {o.orderedBy.lastName} · {when(o.createdAt)}
                      </p>
                      {o.clinicalNotes && <p className="text-xs text-gray-500 mt-1">Note: {o.clinicalNotes}</p>}
                      {o.status === 'CANCELLED' && o.cancelReason && <p className="text-xs text-gray-500 mt-1">Cancelled: {o.cancelReason}</p>}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>

                      {o.status === 'REQUESTED' && (
                        <button disabled={busy === o.id} onClick={() => step(o, 'collect-sample')} className="bg-primary text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-60">
                          Sample collected
                        </button>
                      )}
                      {o.status === 'SAMPLE_COLLECTED' && (
                        <button disabled={busy === o.id} onClick={() => step(o, 'start')} className="bg-primary text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-60">
                          Start testing
                        </button>
                      )}
                      {(o.status === 'SAMPLE_COLLECTED' || o.status === 'IN_PROGRESS') && (
                        <button onClick={() => setResultFor(o)} className="bg-[#0B6B4D] text-white text-xs font-semibold px-3 py-2 rounded-lg">
                          Enter results
                        </button>
                      )}
                      {(o.status === 'REQUESTED' || o.status === 'SAMPLE_COLLECTED' || o.status === 'IN_PROGRESS') && (
                        <button onClick={() => setCancelFor(o)} className="text-xs font-semibold text-red-600 px-2 py-2">Cancel</button>
                      )}
                      {o.status === 'COMPLETED' && (
                        <button onClick={() => setOpenId(expanded ? null : o.id)} className="text-xs font-semibold text-primary px-2 py-2">
                          {expanded ? 'Hide result' : 'View result'}
                        </button>
                      )}
                    </div>
                  </div>

                  {expanded && o.resultRecord?.labResult && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <LabResultTable result={o.resultRecord.labResult} />
                      <button onClick={() => setCorrectFor(o)} className="mt-3 text-xs font-semibold text-primary">+ Add a correction</button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {resultFor && <ResultModal order={resultFor} onClose={() => setResultFor(null)} onDone={() => { setResultFor(null); load() }} />}
      {cancelFor && <CancelModal order={cancelFor} onClose={() => setCancelFor(null)} onDone={() => { setCancelFor(null); load() }} />}
      {correctFor && <CorrectionModal order={correctFor} onClose={() => setCorrectFor(null)} onDone={() => { setCorrectFor(null); load() }} />}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0D1117]">{title}</h2>
          <button onClick={onClose} className="text-gray-400"><HiX size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

type Row = { parameter: string; value: string; unit: string; range: string; flag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' }
const BLANK: Row = { parameter: '', value: '', unit: '', range: '', flag: 'NORMAL' }

function ResultModal({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<Row[]>([{ ...BLANK, parameter: order.testName }])
  const [impression, setImpression] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (i: number, patch: Partial<Row>) => setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      await api.post(`/lab/orders/${order.id}/result`, {
        results: rows.map(r => ({
          parameter: r.parameter, value: r.value, unit: r.unit || undefined, range: r.range || undefined, flag: r.flag,
        })),
        impression: impression || undefined,
      })
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Could not save the results'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Results — ${order.testName} · ${order.patient.firstName} ${order.patient.lastName}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2"><p className="text-sm text-red-600">{error}</p></div>}
        {rows.map((r, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input required className={inputClass} placeholder="Measurement, e.g. Haemoglobin" value={r.parameter} onChange={e => update(i, { parameter: e.target.value })} />
              {rows.length > 1 && (
                <button type="button" onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400"><HiX size={16} /></button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input required className={inputClass} placeholder="Value" value={r.value} onChange={e => update(i, { value: e.target.value })} />
              <input className={inputClass} placeholder="Unit" value={r.unit} onChange={e => update(i, { unit: e.target.value })} />
              <input className={inputClass} placeholder="Normal range" value={r.range} onChange={e => update(i, { range: e.target.value })} />
              <select className={inputClass} value={r.flag} onChange={e => update(i, { flag: e.target.value as Row['flag'] })}>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="LOW">Low</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setRows(prev => [...prev, { ...BLANK }])} className="self-start flex items-center gap-1 text-xs font-semibold text-primary">
          <HiOutlinePlus size={14} /> Add a measurement
        </button>
        <textarea rows={3} className={inputClass} placeholder="Impression (optional)" value={impression} onChange={e => setImpression(e.target.value)} />
        <p className="text-xs text-gray-400">Once saved, results can&apos;t be edited. A mistake is fixed by adding a correction. The doctor and the patient are notified.</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="text-sm text-gray-500 px-3 py-2">Cancel</button>
          <button type="submit" disabled={saving} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
            {saving ? 'Saving...' : 'Save results'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CancelModal({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      await api.post(`/lab/orders/${order.id}/cancel`, { reason })
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Could not cancel this request'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Cancel ${order.testName}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2"><p className="text-sm text-red-600">{error}</p></div>}
        <p className="text-sm text-gray-600">The requesting doctor will see the reason.</p>
        <input required autoFocus className={inputClass} placeholder="Reason, e.g. insufficient sample" value={reason} onChange={e => setReason(e.target.value)} />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="text-sm text-gray-500 px-3 py-2">Back</button>
          <button type="submit" disabled={saving} className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
            {saving ? 'Cancelling...' : 'Cancel request'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CorrectionModal({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      await api.post(`/lab/orders/${order.id}/correction`, { note })
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Could not save the correction'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Correction — ${order.testName}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2"><p className="text-sm text-red-600">{error}</p></div>}
        <p className="text-sm text-gray-600">The original result stays on record. This note is added beside it, and the doctor is told.</p>
        <textarea required autoFocus rows={4} className={inputClass} placeholder="What was wrong, and what is correct" value={note} onChange={e => setNote(e.target.value)} />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="text-sm text-gray-500 px-3 py-2">Back</button>
          <button type="submit" disabled={saving} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
            {saving ? 'Saving...' : 'Add correction'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
