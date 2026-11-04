'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

type Result =
  | { valid: false }
  | { valid: true; type: 'SICK_NOTE' | 'REFERRAL'; hospital: string; issuedAt: string; issuedBy: string; patientInitials: string; startDate?: string; endDate?: string }

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export default function VerifyResultPage() {
  const { reference } = useParams<{ reference: string }>()
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Result>(`/verify/${encodeURIComponent(reference)}`)
      .then(r => setResult(r.data))
      .catch(err => setError(err?.response?.status === 429 ? 'Too many checks. Please wait a minute and try again.' : 'Could not check this document right now.'))
  }, [reference])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-md">
        <h1 className="text-lg font-bold text-[#0D1117] mb-1">Document check</h1>
        <p className="text-xs text-gray-400 mb-5">Reference {decodeURIComponent(reference).toUpperCase()}</p>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !result ? (
          <p className="text-sm text-gray-400">Checking...</p>
        ) : !result.valid ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-700">Not found</p>
            <p className="text-sm text-red-700 mt-1">No document with this reference was issued through Medovite. Check the reference and try again. Treat the document with caution.</p>
          </div>
        ) : (
          <div className="bg-[#E6FAF4] border border-[#9FE1CB] rounded-lg p-4 text-sm text-[#085041]">
            <p className="font-semibold mb-2">Genuine {result.type === 'SICK_NOTE' ? 'sick note' : 'referral letter'}</p>
            <p>Issued by {result.issuedBy}, {result.hospital}</p>
            <p>On {fmt(result.issuedAt)}</p>
            <p>Patient: {result.patientInitials}</p>
            {result.startDate && result.endDate && <p>Covers {fmt(result.startDate)} to {fmt(result.endDate)}</p>}
            <p className="mt-2 text-xs">Compare these details with the paper in front of you.</p>
          </div>
        )}
        <Link href="/verify" className="block mt-5 text-sm font-semibold text-primary">Check another document</Link>
      </div>
    </div>
  )
}
