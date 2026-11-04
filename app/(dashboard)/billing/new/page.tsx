'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { HiArrowLeft, HiX } from 'react-icons/hi'
import api from '@/lib/api'
import { errorMessage } from '@/components/VitalsForm'
import { formatNaira, koboToInput, nairaToKobo } from '@/lib/money'
import { TYPE_LABEL } from '@/lib/billing'

type Line = { type: string; name: string; quantity: string; price: string }
type PricedLine = { type: string; name: string; quantity: number; unitPrice: number | null }
type Suggestions = {
  appointmentId: string; patientId: string; patientName: string
  existingInvoice: { id: string; invoiceNo: string } | null
  lines: PricedLine[]
}
type PatientHit = { id: string; name: string; patientNumber: string }
type PriceItem = { id: string; type: string; name: string; price: number; active: boolean }

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary'

function NewInvoice() {
  const router = useRouter()
  const params = useSearchParams()
  const appointmentId = params.get('appointmentId')

  const [patient, setPatient] = useState<{ id: string; name: string } | null>(null)
  const [search, setSearch] = useState('')
  const [hits, setHits] = useState<PatientHit[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [prices, setPrices] = useState<PriceItem[]>([])
  const [existing, setExisting] = useState<Suggestions['existingInvoice']>(null)
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<PriceItem[]>('/billing/prices').then(r => setPrices(r.data.filter(p => p.active))).catch(() => {})
  }, [])

  useEffect(() => {
    if (!appointmentId) return
    api.get<Suggestions>(`/billing/visits/${appointmentId}/suggestions`)
      .then(({ data }) => {
        setPatient({ id: data.patientId, name: data.patientName })
        setExisting(data.existingInvoice)
        setLines(data.lines.map(l => ({ type: l.type, name: l.name, quantity: String(l.quantity), price: l.unitPrice != null ? koboToInput(l.unitPrice) : '' })))
      })
      .catch(err => setError(errorMessage(err, 'Could not load this visit')))
  }, [appointmentId])

  useEffect(() => {
    if (patient || search.trim().length < 2) { setHits([]); return }
    const t = setTimeout(() => {
      api.get<PatientHit[]>('/billing/patients', { params: { search: search.trim() } }).then(r => setHits(r.data)).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [search, patient])

  const setLine = (i: number, patch: Partial<Line>) => setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  const parsed = useMemo(() => lines.map(l => {
    const qty = /^\d+$/.test(l.quantity) ? parseInt(l.quantity, 10) : null
    const unit = nairaToKobo(l.price)
    return { qty, unit, total: qty != null && unit != null ? qty * unit : null }
  }), [lines])
  const total = parsed.reduce((s, p) => s + (p.total ?? 0), 0)
  const allValid = lines.length > 0 && lines.every((l, i) => l.name.trim() && parsed[i].qty && parsed[i].qty! >= 1 && parsed[i].unit != null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient || !allValid) return
    setError(''); setSaving(true)
    try {
      const { data } = await api.post('/billing/invoices', {
        patientId: patient.id,
        appointmentId: appointmentId || undefined,
        dueDate: dueDate ? new Date(dueDate + 'T23:59:00').toISOString() : undefined,
        notes: notes || undefined,
        items: lines.map((l, i) => ({ type: l.type, name: l.name.trim(), quantity: parsed[i].qty, unitPrice: parsed[i].unit })),
      })
      router.push(`/billing/${data.id}`)
    } catch (err) {
      setError(errorMessage(err, 'Could not create the invoice'))
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href="/billing" className="text-sm text-primary flex items-center gap-1 mb-4"><HiArrowLeft size={16} /> Billing</Link>
      <h1 className="text-xl font-bold text-[#0D1117] mb-5">New invoice</h1>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4"><p className="text-sm text-red-600">{error}</p></div>}
      {existing && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          <p className="text-sm text-amber-800">This visit already has an invoice: <Link href={`/billing/${existing.id}`} className="font-semibold underline">{existing.invoiceNo}</Link>.</p>
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-5">
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-[#0D1117] mb-3">Patient</h2>
          {patient ? (
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#0D1117]">{patient.name}</p>
              {!appointmentId && <button type="button" onClick={() => { setPatient(null); setSearch('') }} className="text-xs font-semibold text-primary">Change</button>}
            </div>
          ) : (
            <div>
              <input className={inputClass} placeholder="Search by name or patient number" value={search} onChange={e => setSearch(e.target.value)} />
              {hits.length > 0 && (
                <ul className="mt-2 border border-gray-100 rounded-lg divide-y divide-gray-50">
                  {hits.map(h => (
                    <li key={h.id}>
                      <button type="button" onClick={() => { setPatient({ id: h.id, name: h.name }); setHits([]) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        <span className="font-semibold text-[#0D1117]">{h.name}</span> <span className="text-xs text-gray-400">{h.patientNumber}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-[#0D1117] mb-3">Items</h2>
          {lines.length === 0 && <p className="text-sm text-gray-400 mb-3">Add the first item below.</p>}
          <div className="flex flex-col gap-3">
            {lines.map((l, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <select className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white" value={l.type} onChange={e => setLine(i, { type: e.target.value })}>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input className={inputClass} placeholder="Description" value={l.name} onChange={e => setLine(i, { name: e.target.value })} />
                  <button type="button" onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400" aria-label="Remove"><HiX size={16} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 items-end">
                  <label className="text-xs text-gray-500">Qty<input inputMode="numeric" className={inputClass} value={l.quantity} onChange={e => setLine(i, { quantity: e.target.value })} /></label>
                  <label className="text-xs text-gray-500">Price (₦)
                    <input inputMode="decimal" className={`${inputClass} ${l.price && parsed[i].unit == null ? 'border-red-300' : ''}`} placeholder="0.00" value={l.price} onChange={e => setLine(i, { price: e.target.value })} />
                  </label>
                  <p className="text-sm font-semibold text-right text-[#0D1117] pb-2">{parsed[i].total != null ? formatNaira(parsed[i].total!) : '—'}</p>
                </div>
                {l.price === '' && <p className="text-xs text-amber-700">No price on the list for this item. Enter one.</p>}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <button type="button" onClick={() => setLines(prev => [...prev, { type: 'PROCEDURE', name: '', quantity: '1', price: '' }])} className="text-xs font-semibold text-primary">+ Custom item</button>
            {prices.length > 0 && (
              <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white" value="" onChange={e => {
                const p = prices.find(x => x.id === e.target.value)
                if (p) setLines(prev => [...prev, { type: p.type, name: p.name, quantity: '1', price: koboToInput(p.price) }])
              }}>
                <option value="">+ From price list</option>
                {prices.map(p => <option key={p.id} value={p.id}>{TYPE_LABEL[p.type]}: {p.name} ({formatNaira(p.price)})</option>)}
              </select>
            )}
          </div>
          <p className="text-right text-base font-bold text-[#0D1117] mt-4">Total {formatNaira(total)}</p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs text-gray-500">Due date<input type="date" className={inputClass} value={dueDate} onChange={e => setDueDate(e.target.value)} /></label>
          <label className="text-xs text-gray-500">Note (optional)<input className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} /></label>
        </section>

        <button type="submit" disabled={saving || !patient || !allValid || total <= 0 || !!existing}
          className="self-start bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50">
          {saving ? 'Creating...' : 'Create invoice'}
        </button>
      </form>
    </div>
  )
}

export default function NewInvoicePage() {
  return <Suspense fallback={null}><NewInvoice /></Suspense>
}
