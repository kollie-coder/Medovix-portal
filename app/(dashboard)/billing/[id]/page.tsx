'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { HiArrowLeft } from 'react-icons/hi'
import api from '@/lib/api'
import { errorMessage } from '@/components/VitalsForm'
import { formatNaira, koboToInput, nairaToKobo } from '@/lib/money'
import { METHOD_LABEL, STATUS_STYLE, TYPE_LABEL } from '@/lib/billing'

type Payment = {
  id: string; amount: number; method: string; reference: string | null; kind: 'PAYMENT' | 'REVERSAL'
  note: string | null; paidAt: string; reversed: boolean; recordedBy: { firstName: string; lastName: string } | null
}
type Invoice = {
  id: string; invoiceNo: string; status: string; totalAmount: number; amountPaid: number; balance: number
  dueDate: string; createdAt: string; notes: string | null; cancelReason: string | null; patientNumber: string | null
  patient: { id: string; firstName: string; lastName: string; phone: string | null }
  createdBy: { firstName: string; lastName: string } | null
  items: { id: string; type: string; name: string; quantity: number; unitPrice: number; total: number }[]
  payments: Payment[]
}

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary'
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>()
  const [inv, setInv] = useState<Invoice | null>(null)
  const [error, setError] = useState('')
  const [panel, setPanel] = useState<'none' | 'pay' | 'cancel'>('none')
  const [reversing, setReversing] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Invoice>(`/billing/invoices/${id}`)
      setInv(data)
    } catch (err) {
      setError(errorMessage(err, 'Could not load this invoice'))
    }
  }, [id])
  useEffect(() => { load() }, [load])

  if (!inv) {
    return (
      <div className="p-6 lg:p-8">
        <Link href="/billing" className="text-sm text-primary flex items-center gap-1 mb-4"><HiArrowLeft size={16} /> Billing</Link>
        {error ? <p className="text-sm text-red-600">{error}</p> : <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
      </div>
    )
  }

  const st = STATUS_STYLE[inv.status] ?? STATUS_STYLE.PENDING
  const open = inv.status !== 'CANCELLED' && inv.balance > 0
  const done = () => { setPanel('none'); setReversing(null); load() }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href="/billing" className="text-sm text-primary flex items-center gap-1 mb-4"><HiArrowLeft size={16} /> Billing</Link>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0D1117]">{inv.invoiceNo}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {inv.patient.firstName} {inv.patient.lastName}{inv.patientNumber ? ` · ${inv.patientNumber}` : ''} · Issued {fmtDate(inv.createdAt)} · Due {fmtDate(inv.dueDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
          <a href={`/print/invoice/${inv.id}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary">Print</a>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4"><p className="text-sm text-red-600">{error}</p></div>}
      {inv.status === 'CANCELLED' && inv.cancelReason && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4"><p className="text-sm text-gray-600">Cancelled: {inv.cancelReason}</p></div>
      )}

      <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
            <th className="py-2 pr-3 font-semibold">Item</th><th className="py-2 pr-3 font-semibold text-right">Qty</th>
            <th className="py-2 pr-3 font-semibold text-right">Price</th><th className="py-2 font-semibold text-right">Total</th>
          </tr></thead>
          <tbody>
            {inv.items.map(i => (
              <tr key={i.id} className="border-b border-gray-50">
                <td className="py-2 pr-3 text-[#0D1117]">{i.name}<span className="block text-xs text-gray-400">{TYPE_LABEL[i.type] ?? i.type}</span></td>
                <td className="py-2 pr-3 text-right">{i.quantity}</td>
                <td className="py-2 pr-3 text-right">{formatNaira(i.unitPrice)}</td>
                <td className="py-2 text-right">{formatNaira(i.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 ml-auto w-full sm:w-64 text-sm flex flex-col gap-1">
          <p className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-semibold">{formatNaira(inv.totalAmount)}</span></p>
          <p className="flex justify-between"><span className="text-gray-500">Paid</span><span>{formatNaira(inv.amountPaid)}</span></p>
          <p className="flex justify-between text-base border-t border-gray-100 pt-1"><span className="font-bold">Balance</span><span className="font-bold">{formatNaira(inv.balance)}</span></p>
        </div>
        {inv.notes && <p className="text-xs text-gray-500 mt-3">Note: {inv.notes}</p>}
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <h2 className="text-sm font-bold text-[#0D1117] mb-3">Payments</h2>
        {inv.payments.length === 0 ? <p className="text-sm text-gray-400">No payments yet.</p> : (
          <ul className="flex flex-col gap-2">
            {inv.payments.map(p => (
              <li key={p.id} className="border border-gray-100 rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[#0D1117]">
                    <span className="font-semibold" style={{ color: p.kind === 'REVERSAL' ? '#991B1B' : undefined }}>{formatNaira(p.amount)}</span>
                    <span className="text-gray-500"> · {METHOD_LABEL[p.method] ?? p.method}{p.reference ? ` · ${p.reference}` : ''}</span>
                    {p.kind === 'REVERSAL' && <span className="ml-2 text-xs font-semibold text-red-700">REVERSAL</span>}
                    {p.reversed && <span className="ml-2 text-xs font-semibold text-gray-500">REVERSED</span>}
                  </p>
                  <div className="flex items-center gap-3 shrink-0">
                    {p.kind === 'PAYMENT' && !p.reversed && (
                      <>
                        <a href={`/print/receipt/${p.id}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary">Receipt</a>
                        <button onClick={() => setReversing(reversing === p.id ? null : p.id)} className="text-xs font-semibold text-red-600">Reverse</button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(p.paidAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {p.recordedBy ? ` · ${p.recordedBy.firstName} ${p.recordedBy.lastName}` : ''}{p.note ? ` · ${p.note}` : ''}
                </p>
                {reversing === p.id && <ReasonForm label="Reverse this payment" confirm="Reverse payment" endpoint={`/billing/invoices/${inv.id}/payments/${p.id}/reverse`} onDone={done} onCancel={() => setReversing(null)} />}
              </li>
            ))}
          </ul>
        )}

        {open && panel === 'none' && (
          <button onClick={() => setPanel('pay')} className="mt-4 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg">Record payment</button>
        )}
        {panel === 'pay' && <PaymentForm invoiceId={inv.id} balance={inv.balance} onDone={done} onCancel={() => setPanel('none')} />}
      </section>

      {inv.status !== 'CANCELLED' && inv.amountPaid === 0 && (
        <section className="mb-5">
          {panel === 'cancel' ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <ReasonForm label="Cancel this invoice" confirm="Cancel invoice" endpoint={`/billing/invoices/${inv.id}/cancel`} onDone={done} onCancel={() => setPanel('none')} />
            </div>
          ) : (
            <button onClick={() => setPanel('cancel')} className="text-sm font-semibold text-red-600">Cancel invoice</button>
          )}
        </section>
      )}
    </div>
  )
}

function PaymentForm({ invoiceId, balance, onDone, onCancel }: { invoiceId: string; balance: number; onDone: () => void; onCancel: () => void }) {
  const [amount, setAmount] = useState(koboToInput(balance))
  const [method, setMethod] = useState('CASH')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const kobo = nairaToKobo(amount)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (kobo == null || kobo < 1) { setError('Enter a valid amount'); return }
    setError(''); setSaving(true)
    try {
      await api.post(`/billing/invoices/${invoiceId}/payments`, { amount: kobo, method, reference: reference || undefined, note: note || undefined })
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Could not record the payment'))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t border-gray-100 pt-4 flex flex-col gap-3">
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2"><p className="text-sm text-red-600">{error}</p></div>}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-gray-500">Amount (₦)<input inputMode="decimal" className={inputClass} value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <label className="text-xs text-gray-500">Method
          <select className={inputClass} value={method} onChange={e => setMethod(e.target.value)}>
            {Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      {method !== 'CASH' && <input required className={inputClass} placeholder="Transfer, card or POS reference" value={reference} onChange={e => setReference(e.target.value)} />}
      <input className={inputClass} placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
      <p className="text-xs text-gray-400">Balance {formatNaira(balance)}. A payment can&apos;t be edited afterwards. Mistakes are fixed with a reversal.</p>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 px-3 py-2">Cancel</button>
        <button type="submit" disabled={saving} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
          {saving ? 'Saving...' : kobo ? `Record ${formatNaira(kobo)}` : 'Record payment'}
        </button>
      </div>
    </form>
  )
}

function ReasonForm({ label, confirm, endpoint, onDone, onCancel }: { label: string; confirm: string; endpoint: string; onDone: () => void; onCancel: () => void }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      await api.post(endpoint, { reason })
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Could not complete that'))
      setSaving(false)
    }
  }
  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
      <p className="text-sm font-semibold text-[#0D1117]">{label}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input required minLength={3} className={inputClass} placeholder="Reason (kept in the audit log)" value={reason} onChange={e => setReason(e.target.value)} />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 px-3 py-2">Back</button>
        <button type="submit" disabled={saving} className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">{saving ? 'Working...' : confirm}</button>
      </div>
    </form>
  )
}
