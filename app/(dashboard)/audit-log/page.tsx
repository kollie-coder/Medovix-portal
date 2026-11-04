'use client'
import { Fragment, useEffect, useState } from 'react'
import { HiOutlineSearch, HiChevronDown, HiChevronUp } from 'react-icons/hi'
import api from '@/lib/api'

type AuditLogRow = {
  id: string
  action: string
  entity: string
  entityId: string
  before: Record<string, any> | null
  after: Record<string, any> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: { id: string; firstName: string; lastName: string; avatar: string | null; role: string } | null
}

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW']

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  CREATE: { bg: '#E6FAF4', text: '#085041' },
  UPDATE: { bg: '#E0F4FB', text: '#065f7a' },
  DELETE: { bg: '#FFEBEE', text: '#C62828' },
  LOGIN: { bg: '#F3F4F6', text: '#374151' },
  LOGOUT: { bg: '#F3F4F6', text: '#6B7280' },
  VIEW: { bg: '#FFF3E0', text: '#8A5A00' },
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// Turns a raw user-agent string into something an admin can read at a glance.
function describeDevice(ua: string | null): string {
  if (!ua) return '—'
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\/|Opera/.test(ua) ? 'Opera' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Safari\//.test(ua) ? 'Safari' :
    /okhttp|Dart|Expo/i.test(ua) ? 'Mobile app' : 'Unknown browser'
  const os =
    /Windows/.test(ua) ? 'Windows' :
    /Android/.test(ua) ? 'Android' :
    /iPhone|iPad|iOS/.test(ua) ? 'iOS' :
    /Mac OS X|Macintosh/.test(ua) ? 'macOS' :
    /Linux/.test(ua) ? 'Linux' : ''
  return os ? `${browser} on ${os}` : browser
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [entities, setEntities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [entity, setEntity] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    api.get('/hospital-admin/audit-log/entities').then(({ data }) => setEntities(data)).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, action, entity])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/hospital-admin/audit-log', {
        params: {
          ...(search ? { search } : {}),
          ...(action ? { action } : {}),
          ...(entity ? { entity } : {}),
        },
      })
      setLogs(data)
    } catch (err) {
      console.error('Failed to load audit log', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0D1117]">Audit Log</h1>
        <p className="text-sm text-gray-400 mt-1">Who did what, from which address and device, across your hospital</p>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <HiOutlineSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by staff name or record id"
            className="w-72 pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary"
          />
        </div>

        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="">All actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="">All record types</option>
          {entities.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-400">
              {search || action || entity ? 'No entries match these filters.' : 'Nothing logged yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">When</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Who</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Action</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Record</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">IP address</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Device</th>
                <th className="px-5 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const style = ACTION_COLORS[log.action] ?? { bg: '#F3F4F6', text: '#374151' }
                const expanded = expandedId === log.id
                const hasDetail = log.before || log.after
                return (
                  <Fragment key={log.id}>
                    <tr
                      onClick={() => hasDetail && setExpandedId(expanded ? null : log.id)}
                      className={`border-b border-gray-50 last:border-0 ${hasDetail ? 'cursor-pointer hover:bg-gray-50/60' : ''}`}
                    >
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {log.user ? (
                            <>
                              {log.user.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={log.user.avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                                  style={{ backgroundColor: '#E0F4FB', color: '#065f7a' }}>
                                  {initials(log.user.firstName, log.user.lastName)}
                                </div>
                              )}
                              <span className="font-medium text-[#0D1117]">{log.user.firstName} {log.user.lastName}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">System</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: style.bg, color: style.text }}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {log.entity} <span className="text-gray-400 font-mono text-xs">· {log.entityId.slice(0, 10)}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 font-mono text-xs whitespace-nowrap">{log.ipAddress ?? '—'}</td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap" title={log.userAgent ?? undefined}>
                        {describeDevice(log.userAgent)}
                      </td>
                      <td className="px-5 py-4">
                        {hasDetail && (expanded ? <HiChevronUp size={16} className="text-gray-400" /> : <HiChevronDown size={16} className="text-gray-400" />)}
                      </td>
                    </tr>
                    {expanded && hasDetail && (
                      <tr className="border-b border-gray-50 bg-gray-50/50">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {log.before && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Before</p>
                                <pre className="text-xs bg-white border border-gray-100 rounded-lg p-3 overflow-x-auto">{JSON.stringify(log.before, null, 2)}</pre>
                              </div>
                            )}
                            {log.after && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">After</p>
                                <pre className="text-xs bg-white border border-gray-100 rounded-lg p-3 overflow-x-auto">{JSON.stringify(log.after, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}