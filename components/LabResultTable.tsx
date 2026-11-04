'use client'

export type LabResultRow = {
  parameter: string
  value: string
  unit: string | null
  range: string | null
  flag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL'
}

export type LabResultData = {
  overallStatus: string
  impression: string | null
  results: LabResultRow[]
}

const FLAG_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  NORMAL: { color: '#0B6B4D', bg: '#E6FAF4', label: 'Normal' },
  HIGH: { color: '#92400E', bg: '#FEF3C7', label: 'High' },
  LOW: { color: '#92400E', bg: '#FEF3C7', label: 'Low' },
  CRITICAL: { color: '#991B1B', bg: '#FEE2E2', label: 'Critical' },
}

const OVERALL_STYLE: Record<string, { color: string; bg: string }> = {
  NORMAL: { color: '#0B6B4D', bg: '#E6FAF4' },
  ABNORMAL: { color: '#92400E', bg: '#FEF3C7' },
  CRITICAL: { color: '#991B1B', bg: '#FEE2E2' },
  CORRECTION: { color: '#3C3489', bg: '#EEEDFE' },
}

// A lab result as a small table, used by the lab technician and by doctors.
export default function LabResultTable({ result }: { result: LabResultData }) {
  const overall = OVERALL_STYLE[result.overallStatus] ?? { color: '#374151', bg: '#F3F4F6' }
  const rows = Array.isArray(result.results) ? result.results : []
  return (
    <div className="text-sm">
      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2" style={{ backgroundColor: overall.bg, color: overall.color }}>
        {result.overallStatus.charAt(0) + result.overallStatus.slice(1).toLowerCase()}
      </span>
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-400">
                <th className="py-1 pr-3 font-semibold">Test</th>
                <th className="py-1 pr-3 font-semibold">Result</th>
                <th className="py-1 pr-3 font-semibold">Normal range</th>
                <th className="py-1 font-semibold">Flag</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const f = FLAG_STYLE[r.flag] ?? FLAG_STYLE.NORMAL
                return (
                  <tr key={i} className="border-t border-gray-50">
                    <td className="py-1.5 pr-3 text-[#0D1117]">{r.parameter}</td>
                    <td className="py-1.5 pr-3 text-[#0D1117] font-medium">{r.value}{r.unit ? ` ${r.unit}` : ''}</td>
                    <td className="py-1.5 pr-3 text-gray-500">{r.range ?? '—'}</td>
                    <td className="py-1.5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: f.bg, color: f.color }}>{f.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {result.impression && <p className="mt-2 text-[#0D1117] whitespace-pre-wrap"><span className="text-gray-500">Impression: </span>{result.impression}</p>}
    </div>
  )
}
