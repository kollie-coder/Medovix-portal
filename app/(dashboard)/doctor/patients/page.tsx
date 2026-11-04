'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { HiOutlineSearch } from 'react-icons/hi'
import api from '@/lib/api'
import { errorMessage } from '@/components/VitalsForm'

type Row = {
  patientNumber: string
  status: string
  patient: {
    id: string
    firstName: string
    lastName: string
    gender: string | null
    dateOfBirth: string | null
    phone: string | null
  }
}

function age(dob: string | null) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

export default function FindPatientPage() {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (query.trim().length < 2) {
      setRows([])
      setError('')
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await api.get('/clinical/patients', { params: { search: query.trim() } })
        setRows(data)
        setError('')
      } catch (err) {
        setError(errorMessage(err, 'Search failed'))
        setRows([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0D1117]">Find a patient</h1>
        <p className="text-sm text-gray-400 mt-1">Anyone registered at your hospital. Each chart you open is recorded in the audit log.</p>
      </div>

      <div className="relative max-w-xl mb-5">
        <HiOutlineSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Name, patient number, phone or email"
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary bg-white"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 max-w-xl">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden max-w-3xl">
        {query.trim().length < 2 ? (
          <p className="p-10 text-center text-sm text-gray-400">Type at least 2 characters to search.</p>
        ) : searching ? (
          <div className="p-10 flex justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-400">No patients match your search.</p>
        ) : (
          <ul>
            {rows.map(r => {
              const a = age(r.patient.dateOfBirth)
              return (
                <li key={r.patient.id} className="border-b border-gray-50 last:border-0">
                  <Link href={`/doctor/patients/${r.patient.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50/60">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0D1117] truncate">
                        {r.patient.firstName} {r.patient.lastName}
                        <span className="ml-2 text-xs font-normal text-gray-400">
                          {a !== null ? `${a} yrs` : ''}{r.patient.gender ? ` · ${r.patient.gender.charAt(0)}` : ''}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.patientNumber}{r.patient.phone ? ` · ${r.patient.phone}` : ''}</p>
                    </div>
                    {r.status !== 'ACTIVE' && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">{r.status}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}