'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { HiArrowLeft } from 'react-icons/hi'
import api from '@/lib/api'
import { errorMessage } from '@/components/VitalsForm'
import PatientChartCard, { Chart } from '@/components/PatientChartCard'
import LabResultTable, { LabResultData } from '@/components/LabResultTable'

type HistoryRecord = {
  id: string
  type: 'CONSULTATION' | 'VITALS' | 'PRESCRIPTION' | 'LAB_RESULT' | 'RADIOLOGY'
  title: string
  createdAt: string
  createdBy: { firstName: string; lastName: string; role: string }
  consultation: { diagnosis: string; symptoms: string[]; findings: string; notes: string | null; followUpDate: string | null } | null
  vitals: {
    bpSystolic: number | null; bpDiastolic: number | null; pulse: number | null; temperature: number | null
    spo2: number | null; weight: number | null; bmi: number | null
  } | null
  labResult: (LabResultData & { testName: string }) | null
  prescription: { status: string; medications: { name: string; dosage: string; frequency: string; duration: string }[] } | null
}
type History = { page: number; pageSize: number; total: number; records: HistoryRecord[] }

const TYPE_LABEL: Record<string, string> = {
  CONSULTATION: 'Consultation', VITALS: 'Vitals', PRESCRIPTION: 'Prescription', LAB_RESULT: 'Lab result', RADIOLOGY: 'Radiology',
}

function RecordBody({ r }: { r: HistoryRecord }) {
  if (r.consultation) {
    const c = r.consultation
    return (
      <div className="text-sm text-[#0D1117] flex flex-col gap-1">
        <p><span className="text-gray-500">Diagnosis: </span>{c.diagnosis}</p>
        {c.symptoms.length > 0 && <p><span className="text-gray-500">Symptoms: </span>{c.symptoms.join(', ')}</p>}
        <p className="whitespace-pre-wrap"><span className="text-gray-500">Findings: </span>{c.findings}</p>
        {c.notes && <p className="whitespace-pre-wrap"><span className="text-gray-500">Notes: </span>{c.notes}</p>}
      </div>
    )
  }
  if (r.vitals) {
    const v = r.vitals
    const parts = [
      v.bpSystolic != null && v.bpDiastolic != null ? `BP ${v.bpSystolic}/${v.bpDiastolic}` : null,
      v.pulse != null ? `Pulse ${v.pulse}` : null,
      v.temperature != null ? `Temp ${v.temperature}°C` : null,
      v.spo2 != null ? `SpO₂ ${v.spo2}%` : null,
      v.weight != null ? `${v.weight} kg` : null,
      v.bmi != null ? `BMI ${v.bmi}` : null,
    ].filter(Boolean)
    return <p className="text-sm text-[#0D1117]">{parts.join(' · ')}</p>
  }
  if (r.labResult) {
    return (
      <div>
        <p className="text-sm font-semibold text-[#0D1117] mb-1">{r.labResult.testName}</p>
        <LabResultTable result={r.labResult} />
      </div>
    )
  }
  if (r.prescription) {
    return (
      <ul className="text-sm text-[#0D1117]">
        {r.prescription.medications.map((m, i) => (
          <li key={i}><span className="font-semibold">{m.name}</span> — {m.dosage}, {m.frequency}, {m.duration}</li>
        ))}
      </ul>
    )
  }
  return null
}

export default function PatientHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const [chart, setChart] = useState<Chart | null>(null)
  const [history, setHistory] = useState<History | null>(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadChart = useCallback(async () => {
    try {
      const { data } = await api.get<Chart>(`/clinical/patients/${patientId}/chart`)
      setChart(data)
    } catch (err) {
      setError(errorMessage(err, 'Could not load the patient chart'))
    }
  }, [patientId])

  const loadHistory = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const { data } = await api.get<History>(`/clinical/patients/${patientId}/records`, { params: { page: p } })
      setHistory(data)
    } catch (err) {
      setError(errorMessage(err, 'Could not load the history'))
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { loadChart() }, [loadChart])
  useEffect(() => { loadHistory(page) }, [loadHistory, page])

  const pages = history ? Math.max(1, Math.ceil(history.total / history.pageSize)) : 1

  return (
    <div className="p-6 lg:p-8">
      <Link href="/doctor/patients" className="text-sm text-primary flex items-center gap-1 mb-4"><HiArrowLeft size={16} /> Find a patient</Link>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4"><p className="text-sm text-red-600">{error}</p></div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <aside className="lg:col-span-1">
          <PatientChartCard chart={chart} showHistory={false} />
        </aside>

        <div className="lg:col-span-2">
          <h2 className="text-sm font-bold text-[#0D1117] mb-3">Medical history</h2>
          {loading && !history ? (
            <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : history && history.records.length === 0 ? (
            <p className="text-sm text-gray-400">No records yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {history?.records.map(r => (
                <li key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{TYPE_LABEL[r.type] ?? r.type}{r.title === 'Addendum' ? ' · Addendum' : ''}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {r.createdBy.firstName} {r.createdBy.lastName}
                    </p>
                  </div>
                  <RecordBody r={r} />
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
      </div>
    </div>
  )
}
