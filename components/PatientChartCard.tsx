'use client'
import { HiOutlineExclamation } from 'react-icons/hi'

export type ChartMedication = { name: string; dosage: string; frequency: string; duration: string }

export type Chart = {
  patientNumber: string
  patient: {
    id: string
    firstName: string
    lastName: string
    gender: string | null
    dateOfBirth: string | null
    phone: string | null
    patientProfile: {
      bloodGroup: string
      allergies: string[]
      chronicConditions: string[]
      weight: number | null
      height: number | null
      emergencyName: string | null
      emergencyPhone: string | null
      emergencyRelation: string | null
    } | null
  }
  recentRecords: {
    id: string
    type: string
    title: string
    createdAt: string
    consultation: { diagnosis: string } | null
  }[]
  activePrescriptions: { id: string; medications: ChartMedication[] }[]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const label = 'text-xs font-semibold text-gray-500 uppercase tracking-wide'

// The at-a-glance summary a doctor needs before seeing a patient.
export default function PatientChartCard({ chart, showHistory = true }: { chart: Chart | null; showHistory?: boolean }) {
  const profile = chart?.patient.patientProfile
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
      <h2 className="text-sm font-bold text-[#0D1117] mb-4">Patient chart</h2>
      {!chart ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="flex flex-col gap-4 text-sm">
          <div>
            <p className={`${label} mb-1.5`}>Allergies</p>
            {profile && profile.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.allergies.map(al => (
                  <span key={al} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-red-50 text-red-700">
                    <HiOutlineExclamation size={12} /> {al}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">None recorded</p>
            )}
          </div>
          <div>
            <p className={`${label} mb-1.5`}>Chronic conditions</p>
            <p className="text-[#0D1117]">
              {profile && profile.chronicConditions.length > 0
                ? profile.chronicConditions.join(', ')
                : <span className="text-gray-400">None recorded</span>}
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className={`${label} mb-1`}>Blood group</p>
              <p className="text-[#0D1117]">{profile ? profile.bloodGroup.replace('_', ' ') : '—'}</p>
            </div>
            <div>
              <p className={`${label} mb-1`}>Weight / Height</p>
              <p className="text-[#0D1117]">
                {profile?.weight ? `${profile.weight} kg` : '—'} / {profile?.height ? `${profile.height} cm` : '—'}
              </p>
            </div>
          </div>
          {profile?.emergencyName && (
            <div>
              <p className={`${label} mb-1`}>Emergency contact</p>
              <p className="text-[#0D1117]">
                {profile.emergencyName}{profile.emergencyRelation ? ` (${profile.emergencyRelation})` : ''}
                {profile.emergencyPhone ? ` · ${profile.emergencyPhone}` : ''}
              </p>
            </div>
          )}
          {chart.activePrescriptions.length > 0 && (
            <div>
              <p className={`${label} mb-1.5`}>Current medications</p>
              <ul className="flex flex-col gap-1">
                {chart.activePrescriptions.flatMap(p => p.medications).map((m, i) => (
                  <li key={i} className="text-[#0D1117]">{m.name} <span className="text-gray-400">{m.dosage}, {m.frequency}</span></li>
                ))}
              </ul>
            </div>
          )}
          {showHistory && (
            <div>
              <p className={`${label} mb-1.5`}>Recent history</p>
              {chart.recentRecords.length === 0 ? (
                <p className="text-gray-400">No earlier records</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {chart.recentRecords.map(r => (
                    <li key={r.id} className="text-[#0D1117]">
                      <span className="text-gray-400 text-xs">{fmtDate(r.createdAt)} · </span>
                      {r.consultation?.diagnosis ?? r.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}