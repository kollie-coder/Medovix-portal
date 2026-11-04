'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { formatNaira } from '@/lib/money'
import { METHOD_LABEL, TYPE_LABEL } from '@/lib/billing'

type Hospital = {
  name: string; address: string; city: string; state: string; phone: string; email: string; website: string | null; logo: string | null
}
type Person = {
  firstName: string
  lastName: string
  staffProfile?: { specialization: string | null; licenseNumber: string | null } | null
}
type Patient = Person & { dateOfBirth: string | null; gender: string | null }

type Letter = {
  reference: string
  type: 'SICK_NOTE' | 'REFERRAL'
  content: Record<string, string | number | null>
  createdAt: string
  hospital: Hospital
  patient: Patient
  author: Person
  patientNumber: string | null
}
type Rx = {
  id: string
  status: string
  expiryDate: string | null
  refillsAllowed: number
  refillsUsed: number
  notes: string | null
  createdAt: string
  medications: { name: string; dosage: string; frequency: string; duration: string; instructions: string | null }[]
  hospital: Hospital
  patient: Patient
  author: Person
  patientNumber: string | null
}

type RxItem = {
  id: string
  status: string
  expiryDate: string | null
  refillsAllowed: number
  refillsUsed: number
  notes: string | null
  createdAt: string
  medications: { name: string; dosage: string; frequency: string; duration: string; instructions: string | null }[]
}
type VisitRx = {
  hospital: Hospital
  patient: Patient
  author: Person
  patientNumber: string | null
  prescriptions: RxItem[]
}

type InvoiceData = {
  hospital: Hospital
  bill: {
    invoiceNo: string; status: string; totalAmount: number; amountPaid: number; balance: number
    dueDate: string; createdAt: string; notes: string | null; patientNumber: string | null
    patient: { firstName: string; lastName: string; phone: string | null }
    items: { id: string; type: string; name: string; quantity: number; unitPrice: number; total: number }[]
    payments: { id: string; amount: number; method: string; reference: string | null; kind: string; reversed: boolean; paidAt: string }[]
  }
}
type ReceiptData = {
  hospital: Hospital
  payment: { id: string; amount: number; method: string; reference: string | null; paidAt: string; recordedBy: Person | null }
  invoice: {
    invoiceNo: string; totalAmount: number; amountPaid: number; balance: number
    patient: { firstName: string; lastName: string }; patientNumber: string | null
  }
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

function age(dob: string | null) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

function Header({ h }: { h: Hospital }) {
  return (
    <header className="flex items-center gap-4 pb-4 mb-6 border-b-2 border-gray-800">
      {h.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={h.logo} alt="" className="w-16 h-16 object-contain" />
      )}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{h.name}</h1>
        <p className="text-xs text-gray-600">{[h.address, h.city, h.state].filter(Boolean).join(', ')}</p>
        <p className="text-xs text-gray-600">{[h.phone, h.email, h.website].filter(Boolean).join(' · ')}</p>
      </div>
    </header>
  )
}

function PatientBlock({ p, number }: { p: Patient; number: string | null }) {
  const a = age(p.dateOfBirth)
  return (
    <section className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-6 p-3 bg-gray-50 rounded">
      <p><span className="text-gray-500">Patient: </span><strong>{p.firstName} {p.lastName}</strong></p>
      <p><span className="text-gray-500">Patient no.: </span>{number ?? '—'}</p>
      <p><span className="text-gray-500">Age: </span>{a !== null ? `${a} years` : '—'}</p>
      <p><span className="text-gray-500">Sex: </span>{p.gender ? p.gender.charAt(0) + p.gender.slice(1).toLowerCase() : '—'}</p>
    </section>
  )
}

function Signature({ author, date }: { author: Person; date: string }) {
  return (
    <section className="mt-16 text-sm">
      <div className="w-64 border-t border-gray-800 pt-1">
        <p className="font-semibold">Dr {author.firstName} {author.lastName}</p>
        {author.staffProfile?.specialization && <p className="text-xs text-gray-600">{author.staffProfile.specialization}</p>}
        {author.staffProfile?.licenseNumber && <p className="text-xs text-gray-600">Licence no. {author.staffProfile.licenseNumber}</p>}
        <p className="text-xs text-gray-500">Date: {fmt(date)}</p>
      </div>
    </section>
  )
}

function Footer({ reference, money }: { reference: string | null; money?: boolean }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return (
    <footer className="mt-10 pt-3 border-t border-gray-300 text-[11px] text-gray-500">
      {money ? (
        <p>Thank you. Please keep this document for your records.</p>
      ) : reference ? (
        <p>Reference <strong className="text-gray-800">{reference}</strong>. To check this document is genuine, go to {origin}/verify and enter the reference.</p>
      ) : (
        <p>This prescription is valid only at a licensed pharmacy and only if it has not been dispensed.</p>
      )}
    </footer>
  )
}

function SickNote({ d }: { d: Letter }) {
  const c = d.content
  return (
    <>
      <h2 className="text-lg font-bold text-center mb-6 tracking-wide">MEDICAL CERTIFICATE (SICK NOTE)</h2>
      <PatientBlock p={d.patient} number={d.patientNumber} />
      <p className="text-sm leading-7">
        This is to certify that <strong>{d.patient.firstName} {d.patient.lastName}</strong> was seen and examined at this
        facility and is, in my opinion, unfit for work or school from <strong>{fmt(String(c.startDate))}</strong> to{' '}
        <strong>{fmt(String(c.endDate))}</strong> inclusive ({String(c.days)} {Number(c.days) === 1 ? 'day' : 'days'}).
      </p>
      {c.diagnosis && <p className="text-sm mt-4"><span className="text-gray-500">Condition: </span>{String(c.diagnosis)}</p>}
      {c.remarks && <p className="text-sm mt-4 whitespace-pre-wrap"><span className="text-gray-500">Remarks: </span>{String(c.remarks)}</p>}
      <Signature author={d.author} date={d.createdAt} />
    </>
  )
}

function Referral({ d }: { d: Letter }) {
  const c = d.content
  return (
    <>
      <h2 className="text-lg font-bold text-center mb-6 tracking-wide">REFERRAL LETTER</h2>
      <p className="text-sm mb-1"><span className="text-gray-500">To: </span><strong>{String(c.referredTo)}</strong>{c.department ? `, ${String(c.department)}` : ''}</p>
      <p className="text-sm mb-4"><span className="text-gray-500">Urgency: </span><strong>{String(c.urgency).charAt(0) + String(c.urgency).slice(1).toLowerCase()}</strong></p>
      <PatientBlock p={d.patient} number={d.patientNumber} />
      <p className="text-sm mb-1 text-gray-500">Reason for referral</p>
      <p className="text-sm mb-4 whitespace-pre-wrap">{String(c.reason)}</p>
      <p className="text-sm mb-1 text-gray-500">Clinical summary</p>
      <p className="text-sm mb-4 whitespace-pre-wrap">{String(c.clinicalSummary)}</p>
      {c.currentMedication && (
        <>
          <p className="text-sm mb-1 text-gray-500">Current medication</p>
          <p className="text-sm mb-4 whitespace-pre-wrap">{String(c.currentMedication)}</p>
        </>
      )}
      <p className="text-sm mt-6">Thank you for seeing this patient. Please contact me if you need more information.</p>
      <Signature author={d.author} date={d.createdAt} />
    </>
  )
}

function InvoiceDoc({ d }: { d: InvoiceData }) {
  const b = d.bill
  const live = b.payments.filter(p => p.kind === 'PAYMENT' && !p.reversed)
  return (
    <>
      <h2 className="text-lg font-bold text-center mb-1 tracking-wide">INVOICE</h2>
      <p className="text-center text-sm text-gray-600 mb-6">{b.invoiceNo}</p>
      <section className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-6 p-3 bg-gray-50 rounded">
        <p><span className="text-gray-500">Patient: </span><strong>{b.patient.firstName} {b.patient.lastName}</strong></p>
        <p><span className="text-gray-500">Patient no.: </span>{b.patientNumber ?? '—'}</p>
        <p><span className="text-gray-500">Issued: </span>{fmt(b.createdAt)}</p>
        <p><span className="text-gray-500">Due: </span>{fmt(b.dueDate)}</p>
      </section>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-300">
            <th className="py-1 pr-3">Item</th><th className="py-1 pr-3 text-right">Qty</th><th className="py-1 pr-3 text-right">Price</th><th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {b.items.map(i => (
            <tr key={i.id} className="border-b border-gray-100 align-top">
              <td className="py-2 pr-3">{i.name}<span className="block text-[11px] text-gray-500">{TYPE_LABEL[i.type] ?? i.type}</span></td>
              <td className="py-2 pr-3 text-right">{i.quantity}</td>
              <td className="py-2 pr-3 text-right">{formatNaira(i.unitPrice)}</td>
              <td className="py-2 text-right">{formatNaira(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto w-64 text-sm flex flex-col gap-1">
        <p className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-semibold">{formatNaira(b.totalAmount)}</span></p>
        <p className="flex justify-between"><span className="text-gray-500">Paid</span><span>{formatNaira(b.amountPaid)}</span></p>
        <p className="flex justify-between text-base border-t border-gray-400 pt-1"><span className="font-bold">Balance due</span><span className="font-bold">{formatNaira(b.balance)}</span></p>
      </div>
      {live.length > 0 && (
        <div className="mt-6 text-xs text-gray-600">
          <p className="font-semibold mb-1">Payments received</p>
          {live.map(p => <p key={p.id}>{fmt(p.paidAt)} · {METHOD_LABEL[p.method] ?? p.method}{p.reference ? ` (${p.reference})` : ''} · {formatNaira(p.amount)}</p>)}
        </div>
      )}
      {b.status === 'PAID' && <p className="mt-6 text-center text-sm font-bold text-green-700 border border-green-700 rounded py-1">PAID IN FULL</p>}
      {b.notes && <p className="mt-4 text-xs text-gray-600">Note: {b.notes}</p>}
    </>
  )
}

function ReceiptDoc({ d }: { d: ReceiptData }) {
  const p = d.payment
  return (
    <>
      <h2 className="text-lg font-bold text-center mb-6 tracking-wide">PAYMENT RECEIPT</h2>
      <section className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-6 p-3 bg-gray-50 rounded">
        <p><span className="text-gray-500">Received from: </span><strong>{d.invoice.patient.firstName} {d.invoice.patient.lastName}</strong></p>
        <p><span className="text-gray-500">Patient no.: </span>{d.invoice.patientNumber ?? '—'}</p>
        <p><span className="text-gray-500">Date: </span>{new Date(p.paidAt).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        <p><span className="text-gray-500">Invoice: </span>{d.invoice.invoiceNo}</p>
      </section>
      <p className="text-center text-3xl font-bold my-6">{formatNaira(p.amount)}</p>
      <p className="text-center text-sm text-gray-600 mb-6">
        Paid by {METHOD_LABEL[p.method] ?? p.method}{p.reference ? ` · Ref ${p.reference}` : ''}
      </p>
      <div className="ml-auto w-64 text-sm flex flex-col gap-1">
        <p className="flex justify-between"><span className="text-gray-500">Invoice total</span><span>{formatNaira(d.invoice.totalAmount)}</span></p>
        <p className="flex justify-between"><span className="text-gray-500">Paid to date</span><span>{formatNaira(d.invoice.amountPaid)}</span></p>
        <p className="flex justify-between border-t border-gray-400 pt-1"><span className="font-bold">Balance</span><span className="font-bold">{formatNaira(d.invoice.balance)}</span></p>
      </div>
      {p.recordedBy && (
        <section className="mt-16 text-sm">
          <div className="w-64 border-t border-gray-800 pt-1">
            <p className="font-semibold">{p.recordedBy.firstName} {p.recordedBy.lastName}</p>
            <p className="text-xs text-gray-500">Received by</p>
          </div>
        </section>
      )}
    </>
  )
}

function Prescription({ d }: { d: Rx }) {
  const done = d.status !== 'ACTIVE'
  const label = d.status === 'DISPENSED' ? 'DISPENSED' : d.status === 'CANCELLED' ? 'CANCELLED' : null
  return (
    <>
      <h2 className="text-lg font-bold text-center mb-6 tracking-wide">PRESCRIPTION</h2>
      {done && label && (
        <p className="text-center text-sm font-bold text-red-700 border border-red-700 rounded py-1 mb-4">
          {label}. Do not dispense again.
        </p>
      )}
      <PatientBlock p={d.patient} number={d.patientNumber} />
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-300">
            <th className="py-1 pr-3">Medication</th><th className="py-1 pr-3">Dose</th><th className="py-1 pr-3">How often</th><th className="py-1">For</th>
          </tr>
        </thead>
        <tbody>
          {d.medications.map((m, i) => (
            <tr key={i} className="border-b border-gray-100 align-top">
              <td className="py-2 pr-3 font-semibold">
                {m.name}
                {m.instructions && <span className="block text-xs font-normal text-gray-600">{m.instructions}</span>}
              </td>
              <td className="py-2 pr-3">{m.dosage}</td>
              <td className="py-2 pr-3">{m.frequency}</td>
              <td className="py-2">{m.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-600">
        Refills allowed: {d.refillsAllowed}
        {d.expiryDate ? ` · Valid until ${fmt(d.expiryDate)}` : ''}
      </p>
      {d.notes && <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">Note to pharmacist: {d.notes.split('\n').filter(l => !l.startsWith('[Pharmacy declined')).join(' ')}</p>}
      <Signature author={d.author} date={d.createdAt} />
    </>
  )
}

function VisitPrescriptions({ d }: { d: VisitRx }) {
  const rows = d.prescriptions.flatMap(p => p.medications.map(m => ({ ...m, status: p.status })))
  const waiting = d.prescriptions.some(p => p.status !== 'DISPENSED')
  const refills = d.prescriptions.filter(p => p.refillsAllowed > 0)
  const expiries = d.prescriptions.map(p => p.expiryDate).filter((x): x is string => !!x).sort()
  const notes = d.prescriptions
    .map(p => (p.notes ?? '').split('\n').filter(l => l.trim() && !l.startsWith('[Pharmacy declined')).join(' '))
    .filter(Boolean)
  return (
    <>
      <h2 className="text-lg font-bold text-center mb-6 tracking-wide">PRESCRIPTION</h2>
      {!waiting && (
        <p className="text-center text-sm font-bold text-red-700 border border-red-700 rounded py-1 mb-4">
          ALL DISPENSED. Do not dispense again.
        </p>
      )}
      <PatientBlock p={d.patient} number={d.patientNumber} />
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-300">
            <th className="py-1 pr-2 w-6">#</th><th className="py-1 pr-3">Medication</th><th className="py-1 pr-3">Dose</th><th className="py-1 pr-3">How often</th><th className="py-1">For</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m, i) => (
            <tr key={i} className="border-b border-gray-100 align-top">
              <td className="py-2 pr-2 text-gray-500">{i + 1}</td>
              <td className="py-2 pr-3 font-semibold">
                {m.name}
                {m.status === 'DISPENSED' && <span className="ml-2 text-[10px] font-bold text-red-700">DISPENSED</span>}
                {m.instructions && <span className="block text-xs font-normal text-gray-600">{m.instructions}</span>}
              </td>
              <td className="py-2 pr-3">{m.dosage}</td>
              <td className="py-2 pr-3">{m.frequency}</td>
              <td className="py-2">{m.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {refills.length > 0 && (
        <p className="text-xs text-gray-600">
          Refills allowed: {refills.map(p => `${p.medications.map(m => m.name).join(', ')} (${p.refillsAllowed})`).join('; ')}
        </p>
      )}
      {expiries.length > 0 && <p className="text-xs text-gray-600">Valid until {fmt(expiries[0])}</p>}
      {notes.length > 0 && <p className="text-xs text-gray-600 mt-2">Note to pharmacist: {notes.join(' ')}</p>}
      <Signature author={d.author} date={d.prescriptions[0].createdAt} />
    </>
  )
}

export default function PrintPage() {
  const { kind, id } = useParams<{ kind: string; id: string }>()
  const [data, setData] = useState<Letter | Rx | VisitRx | InvoiceData | ReceiptData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const path =
      kind === 'prescription' ? `/documents/prescriptions/${id}/print`
      : kind === 'visit-prescriptions' ? `/documents/appointments/${id}/prescriptions/print`
      : kind === 'invoice' ? `/billing/invoices/${id}/print`
      : kind === 'receipt' ? `/billing/payments/${id}/receipt`
      : kind === 'document' ? `/documents/${id}/print`
      : null
    if (!path) { setError('Unknown document type'); return }
    api.get(path)
      .then(r => setData(r.data))
      .catch(err => setError(err?.response?.data?.message ?? 'Could not load this document. Please sign in again and retry.'))
  }, [kind, id])

  if (error) return <div className="p-10 text-sm text-red-600">{error}</div>
  if (!data) return <div className="p-10 text-sm text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <style>{`@page { size: A4; margin: 16mm; } @media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
      <div className="no-print max-w-[210mm] mx-auto pt-4 px-2 flex justify-end">
        <button onClick={() => window.print()} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg">
          Print / Save as PDF
        </button>
      </div>
      <main className="max-w-[210mm] mx-auto my-4 bg-white p-10 shadow print:shadow-none print:my-0 print:p-0 text-gray-900">
        <Header h={data.hospital} />
        {kind === 'invoice' ? (
          <InvoiceDoc d={data as InvoiceData} />
        ) : kind === 'receipt' ? (
          <ReceiptDoc d={data as ReceiptData} />
        ) : kind === 'prescription' ? (
          <Prescription d={data as Rx} />
        ) : kind === 'visit-prescriptions' ? (
          <VisitPrescriptions d={data as VisitRx} />
        ) : (data as Letter).type === 'SICK_NOTE' ? (
          <SickNote d={data as Letter} />
        ) : (
          <Referral d={data as Letter} />
        )}
        <Footer reference={kind === 'document' ? (data as Letter).reference : null} money={kind === 'invoice' || kind === 'receipt'} />
      </main>
    </div>
  )
}
