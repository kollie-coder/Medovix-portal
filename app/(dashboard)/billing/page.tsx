'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { errorMessage } from '@/components/VitalsForm'
import { formatNaira } from '@/lib/money'
import { STATUS_STYLE } from '@/lib/billing'

type Row = {
  id: string; invoiceNo: string; status: string; totalAmount: number; amountPaid: number; balance: number
  dueDate: string; createdAt: string; patientNumber: string | null
  patient: { id: string; firstName: string; lastName: string }
}
type List = { page: number; pageSize: number; total: number; items: Row[] }
type Summary = {
  collected: number; reversed: number; net: number; paymentCount: number
  byMethod: { method: string; net: number; entries: number }[]
  outstanding: { count: number; amount: number }
  overdue: { count: number; amount: number }
}
type Unbilled = {
  id: string; completedAt: string; reason: string | null; patientNumber: string | null
  patient: { id: string; firstName: string; lastName: string }
  doctor: { firstName: string; lastName: string }
}

const FILTERS = [
  { key: 'all', label: 'All' }, { key: 'unpaid', label: 'Unpaid' }, { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' }, { key: 'cancelled', label: 'Cancelled' },
]

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="text-lg font-bold mt-1" style={{ color: tone ?? '#0D1117' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function BillingPage() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [list, setList] = useState<List | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [unbilled, setUnbilled] = useState<Unbilled[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const loadList = useCallback(async () => {
    try {
      const { data } = await api.get<List>('/billing/invoices', { params: { filter, search: query || undefined, page } })
      setList(data); setError('')
    } catch (err) {
      setError(errorMessage(err, 'Could not load invoices'))
    } finally {
      setLoading(false)
    }
  }, [filter, query, page])

  const loadSide = useCallback(async () => {
    const from = new Date(); from.setHours(0, 0, 0, 0)
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000)
    try {
      const [s, u] = await Promise.all([
        api.get<Summary>('/billing/summary', { params: { from: from.toISOString(), to: to.toISOString() } }),
        api.get<Unbilled[]>('/billing/unbilled'),
      ])
      setSummary(s.data); setUnbilled(u.data)
    } catch {
      // The tiles are a convenience; the list still works.
    }
  }, [])

  useEffect(() => { setLoading(true); loadList() }, [loadList])
  useEffect(() => { loadSide() }, [loadSide])

  const pages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0D1117]">Billing</h1>
          <p className="text-sm text-gray-400 mt-1">Invoices, payments and today&apos;s takings</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/billing/prices" className="text-sm font-semibold text-primary">Price list</Link>
          <Link href="/billing/new" className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg">New invoice</Link>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <Tile label="Received today" value={formatNaira(summary.net)} sub={`${summary.paymentCount} payment${summary.paymentCount === 1 ? '' : 's'}${summary.reversed ? ` · ${formatNaira(summary.reversed)} reversed` : ''}`} tone="#0B6B4D" />
          <Tile label="By method today" value={summary.byMethod.length ? '' : 'None yet'} sub={summary.byMethod.map(m => `${m.method.charAt(0) + m.method.slice(1).toLowerCase()} ${formatNaira(m.net)}`).join(' · ') || undefined} />
          <Tile label="Outstanding" value={formatNaira(summary.outstanding.amount)} sub={`${summary.outstanding.count} invoice${summary.outstanding.count === 1 ? '' : 's'}`} />
          <Tile label="Overdue" value={formatNaira(summary.overdue.amount)} sub={`${summary.overdue.count} invoice${summary.overdue.count === 1 ? '' : 's'}`} tone={summary.overdue.count ? '#991B1B' : undefined} />
        </div>
      )}

      {unbilled.length > 0 && (
        <details className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5">
          <summary className="text-sm font-semibold text-amber-800 cursor-pointer">
            {unbilled.length} finished visit{unbilled.length === 1 ? '' : 's'} not yet invoiced
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {unbilled.map(u => (
              <li key={u.id} className="flex items-center justify-between gap-3 text-sm bg-white rounded-lg px-3 py-2">
                <span className="min-w-0">
                  <span className="font-semibold text-[#0D1117]">{u.patient.firstName} {u.patient.lastName}</span>
                  <span className="text-xs text-gray-400"> · {u.patientNumber ?? ''} · Dr {u.doctor.lastName} · {new Date(u.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </span>
                <Link href={`/billing/new?appointmentId=${u.id}`} className="text-xs font-semibold text-primary shrink-0">Create invoice</Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm bg-white">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => { setFilter(f.key); setPage(1) }}
              className={`px-3 py-1.5 font-medium ${filter === f.key ? 'bg-primary text-white' : 'text-gray-600'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice number or patient"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary w-full sm:w-72" />
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4"><p className="text-sm text-red-600">{error}</p></div>}

      {loading && !list ? (
        <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : list && list.items.length === 0 ? (
        <p className="text-sm text-gray-400">No invoices found.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="px-4 py-3 font-semibold">Invoice</th><th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th><th className="px-4 py-3 font-semibold text-right">Balance</th>
                <th className="px-4 py-3 font-semibold">Due</th><th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {list?.items.map(r => {
                const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.PENDING
                return (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3"><Link href={`/billing/${r.id}`} className="font-semibold text-primary">{r.invoiceNo}</Link></td>
                    <td className="px-4 py-3 text-[#0D1117]">{r.patient.firstName} {r.patient.lastName}<span className="block text-xs text-gray-400">{r.patientNumber ?? ''}</span></td>
                    <td className="px-4 py-3 text-right">{formatNaira(r.totalAmount)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatNaira(r.balance)}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(r.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-sm font-semibold text-primary disabled:opacity-40">← Newer</button>
          <span className="text-xs text-gray-400">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="text-sm font-semibold text-primary disabled:opacity-40">Older →</button>
        </div>
      )}
    </div>
  )
}
