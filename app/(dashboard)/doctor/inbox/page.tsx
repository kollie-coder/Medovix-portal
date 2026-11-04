'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { HiOutlineExclamation, HiCheck } from 'react-icons/hi'
import api from '@/lib/api'
import { errorMessage } from '@/components/VitalsForm'

type Item = {
  id: string
  title: string
  body: string
  type: 'lab' | 'prescription' | 'referral'
  critical: boolean
  read: boolean
  createdAt: string
  patient: { id: string; firstName: string; lastName: string } | null
  appointmentId: string | null
}
type Inbox = { page: number; pageSize: number; total: number; items: Item[] }

function when(iso: string) {
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 60 * 24) return `${Math.floor(mins / 60)} h ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function InboxPage() {
  const [filter, setFilter] = useState<'unread' | 'all'>('unread')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Inbox | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const tellLayout = () => window.dispatchEvent(new Event('inbox-changed'))

  const load = useCallback(async () => {
    try {
      const res = await api.get<Inbox>('/inbox', { params: { filter, page } })
      setData(res.data)
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Could not load your results'))
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => { setLoading(true); load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const markRead = async (id: string) => {
    try {
      await api.post(`/inbox/${id}/read`)
      await load()
      tellLayout()
    } catch (err) {
      setError(errorMessage(err, 'Could not update that item'))
    }
  }

  const markAll = async () => {
    try {
      await api.post('/inbox/read-all')
      await load()
      tellLayout()
    } catch (err) {
      setError(errorMessage(err, 'Could not update your inbox'))
    }
  }

  // Critical results always sit at the top of the page, newest first.
  const items = data ? [...data.items].sort((a, b) => Number(b.critical && !b.read) - Number(a.critical && !a.read)) : []
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0D1117]">Results</h1>
          <p className="text-sm text-gray-400 mt-1">Lab results, cancelled tests and declined prescriptions for your patients.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['unread', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1) }}
                className={`px-3 py-1.5 font-medium ${filter === f ? 'bg-primary text-white' : 'bg-white text-gray-600'}`}
              >
                {f === 'unread' ? 'New' : 'All'}
              </button>
            ))}
          </div>
          <button onClick={markAll} className="text-sm font-semibold text-primary">Mark all read</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4"><p className="text-sm text-red-600">{error}</p></div>
      )}

      {loading && !data ? (
        <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">{filter === 'unread' ? 'Nothing new. You are all caught up.' : 'No results yet.'}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map(it => (
            <li
              key={it.id}
              className="bg-white rounded-2xl border p-4"
              style={{ borderColor: it.critical && !it.read ? '#FCA5A5' : '#F3F4F6', opacity: it.read ? 0.7 : 1 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: it.critical ? '#991B1B' : '#0D1117' }}>
                    {it.critical && <HiOutlineExclamation size={16} />}
                    {it.title}
                  </p>
                  <p className="text-sm text-[#0D1117] mt-0.5">{it.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {it.patient ? `${it.patient.firstName} ${it.patient.lastName} · ` : ''}{when(it.createdAt)}
                  </p>
                </div>
                {!it.read && (
                  <button onClick={() => markRead(it.id)} className="shrink-0 flex items-center gap-1 text-xs font-semibold text-gray-500">
                    <HiCheck size={14} /> Done
                  </button>
                )}
              </div>
              <div className="flex gap-4 mt-3">
                {it.appointmentId && (
                  <Link href={`/doctor/${it.appointmentId}`} onClick={() => { if (!it.read) markRead(it.id) }} className="text-sm font-semibold text-primary">
                    Open visit →
                  </Link>
                )}
                {it.patient && (
                  <Link href={`/doctor/patients/${it.patient.id}`} className="text-sm font-semibold text-primary">
                    Patient history →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
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
