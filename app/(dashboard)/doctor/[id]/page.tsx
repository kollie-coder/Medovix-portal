'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { HiArrowLeft, HiOutlinePlus, HiX, HiOutlineExclamation } from 'react-icons/hi'
import api from '@/lib/api'
import VitalsForm, { errorMessage } from '@/components/VitalsForm'
import PatientChartCard, { Chart } from '@/components/PatientChartCard'
import LabResultTable, { LabResultData } from '@/components/LabResultTable'
import SlotPicker from '@/components/SlotPicker'
import { getCurrentUser } from '@/lib/auth'
import { NOTE_TEMPLATES } from '@/lib/noteTemplates'

// ── Types (what the API returns) ─────────────────────────

type Vitals = {
  bpSystolic: number | null; bpDiastolic: number | null; pulse: number | null; temperature: number | null
  spo2: number | null; weight: number | null; height: number | null; bmi: number | null; notes: string | null
}
type Medication = { name: string; dosage: string; frequency: string; duration: string; instructions?: string | null }
type VisitRecord = {
  id: string
  type: 'CONSULTATION' | 'VITALS' | 'PRESCRIPTION' | 'LAB_RESULT' | 'RADIOLOGY'
  title: string
  createdAt: string
  createdBy: { firstName: string; lastName: string; role: string }
  consultation: { diagnosis: string; symptoms: string[]; findings: string; notes: string | null; followUpDate: string | null } | null
  vitals: Vitals | null
  prescription: { id: string; status: string; refillsAllowed: number; notes: string | null; medications: Medication[] } | null
}
type LabOrder = {
  id: string
  testName: string
  priority: string
  status: string
  clinicalNotes: string | null
  cancelReason: string | null
  resultRecord: { labResult: LabResultData | null } | null
}
type Letter = {
  id: string
  reference: string
  type: 'SICK_NOTE' | 'REFERRAL'
  content: Record<string, string | number | null>
  createdAt: string
}
type Visit = {
  id: string
  type: string
  status: string
  scheduledAt: string
  reason: string | null
  patientNumber: string | null
  patient: { id: string; firstName: string; lastName: string; gender: string | null; dateOfBirth: string | null }
  records: VisitRecord[]
  labOrders: LabOrder[]
}

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary'

function age(dob: string | null) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
      <h2 className="text-sm font-bold text-[#0D1117] mb-4">{title}</h2>
      {children}
    </section>
  )
}

function ErrorBox({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
      <p className="text-sm text-red-600">{message}</p>
    </div>
  )
}

const RX_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Waiting at pharmacy', color: '#9A3412', bg: '#FFEDD5' },
  DISPENSED: { label: 'Dispensed', color: '#0B6B4D', bg: '#E6FAF4' },
  CANCELLED: { label: 'Declined by pharmacy', color: '#991B1B', bg: '#FEE2E2' },
  COMPLETED: { label: 'Completed', color: '#0B6B4D', bg: '#E6FAF4' },
}

const LAB_STATUS: Record<string, string> = {
  REQUESTED: 'Requested',
  SAMPLE_COLLECTED: 'Sample collected',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Result ready',
  CANCELLED: 'Cancelled',
}

// ── Page ─────────────────────────────────────────────────

export default function VisitPage() {
  const { id } = useParams<{ id: string }>()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [chart, setChart] = useState<Chart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [letters, setLetters] = useState<Letter[]>([])

  const loadVisit = useCallback(async () => {
    try {
      const { data } = await api.get<Visit>(`/clinical/appointments/${id}`)
      setVisit(data)
      return data
    } catch (err) {
      setError(errorMessage(err, 'Could not load this visit'))
      return null
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadChart = useCallback(async (patientId: string) => {
    try {
      const { data } = await api.get<Chart>(`/clinical/patients/${patientId}/chart`)
      setChart(data)
    } catch (err) {
      setError(errorMessage(err, 'Could not load the patient chart'))
    }
  }, [])

  const loadLetters = useCallback(async () => {
    try {
      const { data } = await api.get<Letter[]>(`/documents/appointments/${id}`)
      setLetters(data)
    } catch {
      // Letters are only available once the consultation has started.
      setLetters([])
    }
  }, [id])

  useEffect(() => {
    loadVisit().then(v => { if (v) { loadChart(v.patient.id); loadLetters() } })
  }, [loadVisit, loadChart, loadLetters])

  // Pharmacy and lab work on this visit's orders, so check back now and then.
  useEffect(() => {
    const t = setInterval(() => { loadVisit() }, 30000)
    return () => clearInterval(t)
  }, [loadVisit])

  const start = async () => {
    setBusy(true); setError('')
    try {
      await api.post(`/clinical/appointments/${id}/start`)
      await loadVisit()
    } catch (err) {
      setError(errorMessage(err, 'Could not start this visit'))
    } finally {
      setBusy(false)
    }
  }

  const complete = async () => {
    setBusy(true); setError('')
    try {
      await api.post(`/clinical/appointments/${id}/complete`)
      setConfirmComplete(false)
      await loadVisit()
    } catch (err) {
      setError(errorMessage(err, 'Could not complete this visit'))
      setConfirmComplete(false)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!visit) {
    return (
      <div className="p-6 lg:p-8">
        <Link href="/doctor" className="text-sm text-primary flex items-center gap-1 mb-4"><HiArrowLeft size={16} /> Back</Link>
        <ErrorBox message={error || 'Visit not found'} />
      </div>
    )
  }

  const inProgress = visit.status === 'IN_PROGRESS'
  const completed = visit.status === 'COMPLETED'
  const canRecordVitals = visit.status === 'CHECKED_IN' || inProgress
  const canStart = visit.status === 'CHECKED_IN' || (visit.type === 'TELEMEDICINE' && visit.status === 'CONFIRMED')

  const vitalsRecords = visit.records.filter(r => r.type === 'VITALS' && r.vitals)
  const consultation = visit.records.find(r => r.type === 'CONSULTATION' && r.title !== 'Addendum')
  const addenda = visit.records.filter(r => r.type === 'CONSULTATION' && r.title === 'Addendum')
  const prescriptions = visit.records.filter(r => r.type === 'PRESCRIPTION' && r.prescription)

  const a = age(visit.patient.dateOfBirth)

  return (
    <div className="p-6 lg:p-8">
      <Link href="/doctor" className="text-sm text-primary flex items-center gap-1 mb-4"><HiArrowLeft size={16} /> My patients</Link>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0D1117]">{visit.patient.firstName} {visit.patient.lastName}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {a !== null ? `${a} yrs` : ''}{visit.patient.gender ? ` · ${visit.patient.gender}` : ''}
            {visit.patientNumber ? ` · ${visit.patientNumber}` : ''}
            {visit.reason ? ` · ${visit.reason}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            {visit.status.replace('_', ' ')}
          </span>
          {canStart && (
            <button onClick={start} disabled={busy} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
              {busy ? 'Starting...' : 'Start consultation'}
            </button>
          )}
          {inProgress && !confirmComplete && (
            <button onClick={() => setConfirmComplete(true)} className="bg-[#0B6B4D] text-white text-sm font-semibold px-4 py-2 rounded-lg">
              Complete visit
            </button>
          )}
          {inProgress && confirmComplete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Notes can&apos;t be edited afterwards.</span>
              <button onClick={() => setConfirmComplete(false)} className="text-sm text-gray-500 px-2">Cancel</button>
              <button onClick={complete} disabled={busy} className="bg-[#0B6B4D] text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
                {busy ? 'Completing...' : 'Yes, complete'}
              </button>
            </div>
          )}
        </div>
      </div>

      <ErrorBox message={error} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <aside className="lg:col-span-1">
          <PatientChartCard chart={chart} />
          <Link href={`/doctor/patients/${visit.patient.id}`} className="text-sm font-semibold text-primary">
            View full history →
          </Link>
        </aside>

        {/* Work area */}
        <div className="lg:col-span-2">
          <Section title="Vital signs">
            {vitalsRecords.length === 0 ? (
              <p className="text-sm text-gray-400 mb-3">No vitals recorded for this visit yet.</p>
            ) : (
              <ul className="flex flex-col gap-2 mb-4">
                {vitalsRecords.map(r => {
                  const v = r.vitals as Vitals
                  const parts = [
                    v.bpSystolic != null && v.bpDiastolic != null ? `BP ${v.bpSystolic}/${v.bpDiastolic}` : null,
                    v.pulse != null ? `Pulse ${v.pulse}` : null,
                    v.temperature != null ? `Temp ${v.temperature}°C` : null,
                    v.spo2 != null ? `SpO₂ ${v.spo2}%` : null,
                    v.weight != null ? `${v.weight} kg` : null,
                    v.height != null ? `${v.height} cm` : null,
                    v.bmi != null ? `BMI ${v.bmi}` : null,
                  ].filter(Boolean)
                  return (
                    <li key={r.id} className="text-sm text-[#0D1117]">
                      {parts.join(' · ')}
                      <span className="text-xs text-gray-400"> — {r.createdBy.firstName} {r.createdBy.lastName}, {new Date(r.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      {v.notes ? <span className="block text-xs text-gray-500">{v.notes}</span> : null}
                    </li>
                  )
                })}
              </ul>
            )}
            {canRecordVitals && <VitalsForm appointmentId={visit.id} onSaved={loadVisit} />}
          </Section>

          <Section title="Consultation">
            {consultation?.consultation ? (
              <div className="flex flex-col gap-3 text-sm">
                <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Diagnosis</p><p className="text-[#0D1117]">{consultation.consultation.diagnosis}</p></div>
                {consultation.consultation.symptoms.length > 0 && (
                  <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Symptoms</p><p className="text-[#0D1117]">{consultation.consultation.symptoms.join(', ')}</p></div>
                )}
                <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Findings</p><p className="text-[#0D1117] whitespace-pre-wrap">{consultation.consultation.findings}</p></div>
                {consultation.consultation.notes && (
                  <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p><p className="text-[#0D1117] whitespace-pre-wrap">{consultation.consultation.notes}</p></div>
                )}
                {consultation.consultation.followUpDate && (
                  <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Follow-up</p><p className="text-[#0D1117]">{fmtDate(consultation.consultation.followUpDate)}</p></div>
                )}
              </div>
            ) : inProgress ? (
              <ConsultationForm appointmentId={visit.id} onSaved={loadVisit} />
            ) : (
              <p className="text-sm text-gray-400">Start the consultation to write notes.</p>
            )}

            {addenda.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                {addenda.map(ad => (
                  <p key={ad.id} className="text-sm text-[#0D1117]">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Addendum · {fmtDate(ad.createdAt)} · </span>
                    {ad.consultation?.findings}
                  </p>
                ))}
              </div>
            )}
            {consultation && (inProgress || completed) && <AddendumForm appointmentId={visit.id} onSaved={loadVisit} />}
          </Section>

          <Section title="Prescriptions">
            {prescriptions.filter(p => p.prescription!.status !== 'CANCELLED').length > 1 && (
              <div className="mb-3">
                <a href={`/print/visit-prescriptions/${visit.id}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary">
                  Print all prescriptions for this visit
                </a>
              </div>
            )}
            {prescriptions.length === 0 ? (
              <p className="text-sm text-gray-400 mb-3">Nothing prescribed yet.</p>
            ) : (
              <ul className="flex flex-col gap-3 mb-4">
                {prescriptions.map(p => {
                  const rx = p.prescription!
                  const st = RX_STATUS[rx.status] ?? { label: rx.status, color: '#374151', bg: '#F3F4F6' }
                  return (
                    <li key={p.id} className="text-sm border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                        <a href={`/print/prescription/${rx.id}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary">Print</a>
                      </div>
                      {rx.medications.map((m, i) => (
                        <p key={i} className="text-[#0D1117]">
                          <span className="font-semibold">{m.name}</span> — {m.dosage}, {m.frequency}, {m.duration}
                          {m.instructions ? <span className="text-gray-500"> ({m.instructions})</span> : null}
                        </p>
                      ))}
                      {rx.status === 'CANCELLED' && rx.notes && (
                        <p className="mt-2 text-xs text-red-700 whitespace-pre-wrap">{rx.notes.split('\n').filter(l => l.startsWith('[Pharmacy declined')).join('\n')}</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {inProgress && <PrescriptionForm appointmentId={visit.id} onSaved={loadVisit} />}
          </Section>

          <Section title="Lab tests">
            {visit.labOrders.length === 0 ? (
              <p className="text-sm text-gray-400 mb-3">No tests requested.</p>
            ) : (
              <ul className="flex flex-col gap-3 mb-4">
                {visit.labOrders.map(o => (
                  <li key={o.id} className="text-sm border border-gray-100 rounded-lg p-3">
                    <p className="text-[#0D1117]">
                      <span className="font-semibold">{o.testName}</span>
                      {o.priority === 'URGENT' && <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700">URGENT</span>}
                      <span className="ml-2 text-xs text-gray-400">{LAB_STATUS[o.status] ?? o.status}</span>
                    </p>
                    {o.status === 'CANCELLED' && o.cancelReason && <p className="mt-1 text-xs text-gray-500">Cancelled by the lab: {o.cancelReason}</p>}
                    {o.resultRecord?.labResult && (
                      <div className="mt-2 pt-2 border-t border-gray-50">
                        <LabResultTable result={o.resultRecord.labResult} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {inProgress && <LabForm appointmentId={visit.id} onSaved={loadVisit} />}
          </Section>

          {(inProgress || completed) && (
            <Section title="Letters">
              {letters.length === 0 ? (
                <p className="text-sm text-gray-400 mb-3">No sick notes or referral letters for this visit.</p>
              ) : (
                <ul className="flex flex-col gap-2 mb-4">
                  {letters.map(l => (
                    <li key={l.id} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg p-3">
                      <span className="text-[#0D1117]">
                        <span className="font-semibold">{l.type === 'SICK_NOTE' ? 'Sick note' : `Referral to ${String(l.content.referredTo)}`}</span>
                        <span className="text-xs text-gray-400"> · {l.reference} · {fmtDate(l.createdAt)}</span>
                      </span>
                      <a href={`/print/document/${l.id}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary">Print</a>
                    </li>
                  ))}
                </ul>
              )}
              <LetterForms appointmentId={visit.id} onSaved={loadLetters} />
            </Section>
          )}

          {(inProgress || completed) && (
            <Section title="Follow-up and referral">
              <BookingForms appointmentId={visit.id} onBooked={loadLetters} />
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Forms ────────────────────────────────────────────────

type SavedTemplate = { id: string; name: string; symptoms: string; findings: string; notes: string }

function ConsultationForm({ appointmentId, onSaved }: { appointmentId: string; onSaved: () => void }) {
  const [diagnosis, setDiagnosis] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [findings, setFindings] = useState('')
  const [notes, setNotes] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [mine, setMine] = useState<SavedTemplate[]>([])
  const [manage, setManage] = useState(false)
  const [naming, setNaming] = useState(false)
  const [tplName, setTplName] = useState('')
  const [tplBusy, setTplBusy] = useState(false)
  const [tplError, setTplError] = useState('')

  const loadMine = useCallback(async () => {
    try {
      const { data } = await api.get<SavedTemplate[]>('/note-templates')
      setMine(data)
    } catch {
      setMine([])
    }
  }, [])
  useEffect(() => { loadMine() }, [loadMine])

  const pickTemplate = (value: string) => {
    if (!value) return
    const [group, tid] = value.split(':')
    const t = group === 'mine' ? mine.find(m => m.id === tid) : NOTE_TEMPLATES.find(b => b.id === tid)
    if (!t) return
    if ((symptoms || findings || notes) && !window.confirm('Replace the notes you have typed so far with this template?')) return
    setSymptoms(t.symptoms)
    setFindings(t.findings)
    setNotes(t.notes)
  }

  const saveTemplate = async () => {
    setTplError(''); setTplBusy(true)
    try {
      await api.post('/note-templates', { name: tplName, symptoms, findings, notes })
      setNaming(false); setTplName('')
      await loadMine()
    } catch (err) {
      setTplError(errorMessage(err, 'Could not save the template'))
    } finally {
      setTplBusy(false)
    }
  }

  const deleteTemplate = async (tid: string) => {
    setTplError('')
    try {
      await api.delete(`/note-templates/${tid}`)
      await loadMine()
    } catch (err) {
      setTplError(errorMessage(err, 'Could not delete the template'))
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      await api.post(`/clinical/appointments/${appointmentId}/consultation`, {
        diagnosis,
        symptoms: symptoms.split(',').map(s => s.trim()).filter(Boolean),
        findings,
        notes: notes || undefined,
        followUpDate: followUp || undefined,
      })
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Could not save the consultation'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <ErrorBox message={error} />

      <div>
        <select
          value=""
          onChange={e => pickTemplate(e.target.value)}
          className={inputClass}
          aria-label="Start from a template"
        >
          <option value="">Start from a template (optional)</option>
          <optgroup label="Standard layouts">
            {NOTE_TEMPLATES.map(t => <option key={t.id} value={`builtin:${t.id}`}>{t.name}</option>)}
          </optgroup>
          {mine.length > 0 && (
            <optgroup label="My templates">
              {mine.map(t => <option key={t.id} value={`mine:${t.id}`}>{t.name}</option>)}
            </optgroup>
          )}
        </select>
        {mine.length > 0 && (
          <button type="button" onClick={() => setManage(v => !v)} className="mt-1.5 text-xs font-semibold text-primary">
            {manage ? 'Hide my templates' : 'Manage my templates'}
          </button>
        )}
        {manage && (
          <ul className="mt-2 flex flex-col gap-1">
            {mine.map(t => (
              <li key={t.id} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-1.5">
                <span className="text-[#0D1117]">{t.name}</span>
                <button type="button" onClick={() => deleteTemplate(t.id)} className="text-xs font-semibold text-red-600">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <input required className={inputClass} placeholder="Diagnosis" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
      <input className={inputClass} placeholder="Symptoms (comma-separated)" value={symptoms} onChange={e => setSymptoms(e.target.value)} />
      <textarea required rows={8} className={inputClass} placeholder="Examination findings" value={findings} onChange={e => setFindings(e.target.value)} />
      <textarea rows={4} className={inputClass} placeholder="Other notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />

      {(symptoms.trim() || findings.trim() || notes.trim()) && (
        !naming ? (
          <button type="button" onClick={() => { setNaming(true); setTplError('') }} className="self-start text-xs font-semibold text-primary">
            Save the symptoms, findings and notes as my template
          </button>
        ) : (
          <div className="border border-gray-100 rounded-lg p-3 flex flex-col gap-2">
            <ErrorBox message={tplError} />
            <input className={inputClass} placeholder="Template name, e.g. Asthma review" maxLength={60} value={tplName} onChange={e => setTplName(e.target.value)} />
            <p className="text-xs text-gray-400">Saves the wording only. Remove anything about this patient first. Only you can see your templates.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setNaming(false); setTplError('') }} className="text-sm text-gray-500 px-3 py-2">Cancel</button>
              <button type="button" onClick={saveTemplate} disabled={tplBusy || tplName.trim().length < 2} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
                {tplBusy ? 'Saving...' : 'Save template'}
              </button>
            </div>
          </div>
        )
      )}
      {!naming && <ErrorBox message={tplError} />}

      <label className="text-xs text-gray-500">
        Follow-up date (optional)
        <input type="date" className={inputClass} value={followUp} onChange={e => setFollowUp(e.target.value)} />
      </label>
      <p className="text-xs text-gray-400">Once saved, the consultation can&apos;t be edited. Corrections are added as an addendum.</p>
      <button type="submit" disabled={saving} className="self-start bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
        {saving ? 'Saving...' : 'Save consultation'}
      </button>
    </form>
  )
}

function AddendumForm({ appointmentId, onSaved }: { appointmentId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      await api.post(`/clinical/appointments/${appointmentId}/addendum`, { note })
      setNote(''); setOpen(false)
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Could not save the addendum'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-4 text-xs font-semibold text-primary">
        + Add an addendum
      </button>
    )
  }
  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2">
      <ErrorBox message={error} />
      <textarea required rows={3} className={inputClass} placeholder="Correction or additional note" value={note} onChange={e => setNote(e.target.value)} />
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 px-3 py-2">Cancel</button>
        <button type="submit" disabled={saving} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
          {saving ? 'Saving...' : 'Save addendum'}
        </button>
      </div>
    </form>
  )
}

type MedRow = { name: string; dosage: string; frequency: string; duration: string; instructions: string }
const EMPTY_MED: MedRow = { name: '', dosage: '', frequency: '', duration: '', instructions: '' }

function PrescriptionForm({ appointmentId, onSaved }: { appointmentId: string; onSaved: () => void }) {
  const [meds, setMeds] = useState<MedRow[]>([{ ...EMPTY_MED }])
  const [refills, setRefills] = useState('0')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [allergy, setAllergy] = useState<{ medication: string; allergy: string }[] | null>(null)

  const setMed = (i: number, k: keyof MedRow) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setMeds(prev => prev.map((m, idx) => (idx === i ? { ...m, [k]: e.target.value } : m)))

  const send = async (confirmAllergyOverride: boolean) => {
    setError(''); setSaving(true)
    try {
      await api.post(`/clinical/appointments/${appointmentId}/prescriptions`, {
        medications: meds.map(m => ({
          name: m.name, dosage: m.dosage, frequency: m.frequency, duration: m.duration,
          instructions: m.instructions || undefined,
        })),
        refillsAllowed: parseInt(refills, 10) || 0,
        notes: notes || undefined,
        confirmAllergyOverride: confirmAllergyOverride || undefined,
      })
      setMeds([{ ...EMPTY_MED }]); setRefills('0'); setNotes(''); setAllergy(null)
      onSaved()
    } catch (err) {
      const data = (err as { response?: { data?: { code?: string; matches?: { medication: string; allergy: string }[] } } })?.response?.data
      if (data?.code === 'ALLERGY_WARNING' && data.matches) {
        setAllergy(data.matches)
      } else {
        setError(errorMessage(err, 'Could not save the prescription'))
      }
    } finally {
      setSaving(false)
    }
  }

  const submit = (e: React.FormEvent) => { e.preventDefault(); send(false) }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <ErrorBox message={error} />

      {allergy && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5"><HiOutlineExclamation size={16} /> Allergy warning</p>
          <ul className="text-sm text-red-700 mt-1">
            {allergy.map((m, i) => <li key={i}>{m.medication} — patient is allergic to {m.allergy}</li>)}
          </ul>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => setAllergy(null)} className="text-sm font-semibold text-gray-700 px-3 py-2 border border-gray-200 rounded-lg bg-white">
              Change prescription
            </button>
            <button type="button" disabled={saving} onClick={() => send(true)} className="text-sm font-semibold text-white px-3 py-2 rounded-lg bg-red-600 disabled:opacity-60">
              Prescribe anyway
            </button>
          </div>
        </div>
      )}

      {meds.map((m, i) => (
        <div key={i} className="border border-gray-100 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">Medication {i + 1}</p>
            {meds.length > 1 && (
              <button type="button" onClick={() => setMeds(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400"><HiX size={16} /></button>
            )}
          </div>
          <input required className={inputClass} placeholder="Name, e.g. Amoxicillin 500mg" value={m.name} onChange={setMed(i, 'name')} />
          <div className="grid grid-cols-3 gap-2">
            <input required className={inputClass} placeholder="Dose" value={m.dosage} onChange={setMed(i, 'dosage')} />
            <input required className={inputClass} placeholder="How often" value={m.frequency} onChange={setMed(i, 'frequency')} />
            <input required className={inputClass} placeholder="For how long" value={m.duration} onChange={setMed(i, 'duration')} />
          </div>
          <input className={inputClass} placeholder="Instructions (optional)" value={m.instructions} onChange={setMed(i, 'instructions')} />
        </div>
      ))}

      <button type="button" onClick={() => setMeds(prev => [...prev, { ...EMPTY_MED }])} className="self-start flex items-center gap-1 text-xs font-semibold text-primary">
        <HiOutlinePlus size={14} /> Add another medication
      </button>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-gray-500">
          Refills allowed
          <input className={inputClass} inputMode="numeric" value={refills} onChange={e => setRefills(e.target.value)} />
        </label>
        <label className="text-xs text-gray-500">
          Note to pharmacist
          <input className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} />
        </label>
      </div>

      <button type="submit" disabled={saving} className="self-start bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
        {saving ? 'Saving...' : 'Save prescription'}
      </button>
    </form>
  )
}

type TestRow = { testName: string; urgent: boolean; clinicalNotes: string }

function LabForm({ appointmentId, onSaved }: { appointmentId: string; onSaved: () => void }) {
  const [tests, setTests] = useState<TestRow[]>([{ testName: '', urgent: false, clinicalNotes: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (i: number, patch: Partial<TestRow>) =>
    setTests(prev => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      await api.post(`/clinical/appointments/${appointmentId}/lab-orders`, {
        tests: tests.map(t => ({
          testName: t.testName,
          priority: t.urgent ? 'URGENT' : 'ROUTINE',
          clinicalNotes: t.clinicalNotes || undefined,
        })),
      })
      setTests([{ testName: '', urgent: false, clinicalNotes: '' }])
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Could not send the lab request'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <ErrorBox message={error} />
      {tests.map((t, i) => (
        <div key={i} className="flex flex-col gap-2 border border-gray-100 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <input required className={inputClass} placeholder="Test, e.g. Full blood count" value={t.testName} onChange={e => update(i, { testName: e.target.value })} />
            <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
              <input type="checkbox" checked={t.urgent} onChange={e => update(i, { urgent: e.target.checked })} /> Urgent
            </label>
            {tests.length > 1 && (
              <button type="button" onClick={() => setTests(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400"><HiX size={16} /></button>
            )}
          </div>
          <input className={inputClass} placeholder="Clinical notes for the lab (optional)" value={t.clinicalNotes} onChange={e => update(i, { clinicalNotes: e.target.value })} />
        </div>
      ))}
      <button type="button" onClick={() => setTests(prev => [...prev, { testName: '', urgent: false, clinicalNotes: '' }])} className="self-start flex items-center gap-1 text-xs font-semibold text-primary">
        <HiOutlinePlus size={14} /> Add another test
      </button>
      <button type="submit" disabled={saving} className="self-start bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
        {saving ? 'Sending...' : 'Request tests'}
      </button>
    </form>
  )
}

function LetterForms({ appointmentId, onSaved }: { appointmentId: string; onSaved: () => void }) {
  const [mode, setMode] = useState<'none' | 'sick' | 'referral'>('none')
  return (
    <div>
      <div className="flex gap-4">
        <button type="button" onClick={() => setMode(mode === 'sick' ? 'none' : 'sick')} className="text-xs font-semibold text-primary">+ Sick note</button>
        <button type="button" onClick={() => setMode(mode === 'referral' ? 'none' : 'referral')} className="text-xs font-semibold text-primary">+ Referral letter</button>
      </div>
      {mode === 'sick' && <SickNoteForm appointmentId={appointmentId} onSaved={() => { setMode('none'); onSaved() }} />}
      {mode === 'referral' && <ReferralForm appointmentId={appointmentId} onSaved={() => { setMode('none'); onSaved() }} />}
    </div>
  )
}

function SickNoteForm({ appointmentId, onSaved }: { appointmentId: string; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [showDiagnosis, setShowDiagnosis] = useState(false)
  const [diagnosis, setDiagnosis] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      await api.post(`/documents/appointments/${appointmentId}/sick-note`, {
        startDate, endDate,
        includeDiagnosis: showDiagnosis,
        diagnosis: showDiagnosis ? diagnosis : undefined,
        remarks: remarks || undefined,
      })
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Could not create the sick note'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4">
      <ErrorBox message={error} />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-gray-500">Unfit from<input type="date" required className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
        <label className="text-xs text-gray-500">Unfit until (inclusive)<input type="date" required className={inputClass} value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} /></label>
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={showDiagnosis} onChange={e => setShowDiagnosis(e.target.checked)} />
        Show the condition on the note (only if the patient agrees)
      </label>
      {showDiagnosis && <input className={inputClass} placeholder="Condition to show" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />}
      <input className={inputClass} placeholder="Remarks, e.g. light duties on return (optional)" value={remarks} onChange={e => setRemarks(e.target.value)} />
      <p className="text-xs text-gray-400">Once issued, a sick note can&apos;t be changed. Issue a new one if something needs correcting.</p>
      <button type="submit" disabled={saving} className="self-start bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
        {saving ? 'Issuing...' : 'Issue sick note'}
      </button>
    </form>
  )
}

function ReferralForm({ appointmentId, onSaved }: { appointmentId: string; onSaved: () => void }) {
  const [referredTo, setReferredTo] = useState('')
  const [department, setDepartment] = useState('')
  const [urgency, setUrgency] = useState('ROUTINE')
  const [reason, setReason] = useState('')
  const [summary, setSummary] = useState('')
  const [medication, setMedication] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      await api.post(`/documents/appointments/${appointmentId}/referral`, {
        referredTo, urgency, reason, clinicalSummary: summary,
        department: department || undefined,
        currentMedication: medication || undefined,
      })
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Could not create the referral'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4">
      <ErrorBox message={error} />
      <input required className={inputClass} placeholder="Refer to (doctor or hospital)" value={referredTo} onChange={e => setReferredTo(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <input className={inputClass} placeholder="Department (optional)" value={department} onChange={e => setDepartment(e.target.value)} />
        <select className={inputClass} value={urgency} onChange={e => setUrgency(e.target.value)}>
          <option value="ROUTINE">Routine</option>
          <option value="URGENT">Urgent</option>
          <option value="EMERGENCY">Emergency</option>
        </select>
      </div>
      <textarea required rows={2} className={inputClass} placeholder="Reason for referral" value={reason} onChange={e => setReason(e.target.value)} />
      <textarea required rows={4} className={inputClass} placeholder="Clinical summary: history, findings, tests done" value={summary} onChange={e => setSummary(e.target.value)} />
      <input className={inputClass} placeholder="Current medication (optional)" value={medication} onChange={e => setMedication(e.target.value)} />
      <button type="submit" disabled={saving} className="self-start bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
        {saving ? 'Issuing...' : 'Issue referral'}
      </button>
    </form>
  )
}

type Colleague = { id: string; name: string; department: string | null; specialization: string | null }

function BookingForms({ appointmentId, onBooked }: { appointmentId: string; onBooked: () => void }) {
  const [mode, setMode] = useState<'none' | 'followup' | 'refer'>('none')
  const [done, setDone] = useState('')
  return (
    <div>
      {done && (
        <div className="bg-[#E6FAF4] border border-[#9FE1CB] rounded-lg px-3 py-2 mb-3"><p className="text-sm text-[#085041]">{done}</p></div>
      )}
      <div className="flex gap-4">
        <button type="button" onClick={() => { setMode(mode === 'followup' ? 'none' : 'followup'); setDone('') }} className="text-xs font-semibold text-primary">+ Book a follow-up</button>
        <button type="button" onClick={() => { setMode(mode === 'refer' ? 'none' : 'refer'); setDone('') }} className="text-xs font-semibold text-primary">+ Refer to a colleague</button>
      </div>
      {mode === 'followup' && (
        <FollowUpForm appointmentId={appointmentId} onDone={msg => { setMode('none'); setDone(msg) }} />
      )}
      {mode === 'refer' && (
        <InternalReferralForm appointmentId={appointmentId} onDone={msg => { setMode('none'); setDone(msg); onBooked() }} />
      )}
    </div>
  )
}

function whenLabel(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function FollowUpForm({ appointmentId, onDone }: { appointmentId: string; onDone: (msg: string) => void }) {
  const [meId, setMeId] = useState('')
  const [slot, setSlot] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { getCurrentUser().then(u => { if (u) setMeId(u.id) }) }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slot) { setError('Choose a time first'); return }
    setError(''); setSaving(true)
    try {
      await api.post(`/scheduling/appointments/${appointmentId}/follow-up`, { scheduledAt: slot, reason: reason || undefined })
      onDone(`Follow-up booked for ${whenLabel(slot)}. The patient has been notified.`)
    } catch (err) {
      setError(errorMessage(err, 'Could not book the follow-up'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4">
      <ErrorBox message={error} />
      {meId && <SlotPicker doctorId={meId} value={slot} onChange={setSlot} />}
      <input className={inputClass} placeholder="Reason, e.g. review blood pressure (optional)" value={reason} onChange={e => setReason(e.target.value)} />
      <button type="submit" disabled={saving || !slot} className="self-start bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
        {saving ? 'Booking...' : slot ? `Book ${whenLabel(slot)}` : 'Choose a time'}
      </button>
    </form>
  )
}

function InternalReferralForm({ appointmentId, onDone }: { appointmentId: string; onDone: (msg: string) => void }) {
  const [doctors, setDoctors] = useState<Colleague[]>([])
  const [doctorId, setDoctorId] = useState('')
  const [slot, setSlot] = useState<string | null>(null)
  const [urgency, setUrgency] = useState('ROUTINE')
  const [reason, setReason] = useState('')
  const [summary, setSummary] = useState('')
  const [medication, setMedication] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Colleague[]>('/scheduling/doctors').then(r => setDoctors(r.data)).catch(() => setError('Could not load the list of doctors'))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slot) { setError('Choose a time first'); return }
    setError(''); setSaving(true)
    try {
      const { data } = await api.post(`/scheduling/appointments/${appointmentId}/refer`, {
        doctorId, scheduledAt: slot, urgency, reason, clinicalSummary: summary,
        currentMedication: medication || undefined,
      })
      const who = doctors.find(d => d.id === doctorId)?.name ?? 'the doctor'
      onDone(`Referred to ${who} for ${whenLabel(slot)}. They have been notified. Letter reference ${data.reference}.`)
    } catch (err) {
      setError(errorMessage(err, 'Could not complete the referral'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4">
      <ErrorBox message={error} />
      {doctors.length === 0 ? (
        <p className="text-sm text-gray-400">There are no other doctors at this hospital yet.</p>
      ) : (
        <>
          <select required className={inputClass} value={doctorId} onChange={e => setDoctorId(e.target.value)}>
            <option value="">Choose a doctor</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}{d.specialization ? ` · ${d.specialization}` : ''}{d.department ? ` · ${d.department}` : ''}
              </option>
            ))}
          </select>
          {doctorId && <SlotPicker doctorId={doctorId} value={slot} onChange={setSlot} />}
          <select className={inputClass} value={urgency} onChange={e => setUrgency(e.target.value)}>
            <option value="ROUTINE">Routine</option>
            <option value="URGENT">Urgent</option>
            <option value="EMERGENCY">Emergency</option>
          </select>
          <textarea required rows={2} className={inputClass} placeholder="Reason for referral" value={reason} onChange={e => setReason(e.target.value)} />
          <textarea required rows={4} className={inputClass} placeholder="Clinical summary: history, findings, tests done" value={summary} onChange={e => setSummary(e.target.value)} />
          <input className={inputClass} placeholder="Current medication (optional)" value={medication} onChange={e => setMedication(e.target.value)} />
          <p className="text-xs text-gray-400">This books the patient with that doctor and saves a referral letter you can print.</p>
          <button type="submit" disabled={saving || !slot} className="self-start bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
            {saving ? 'Referring...' : slot ? `Refer and book ${whenLabel(slot)}` : 'Choose a time'}
          </button>
        </>
      )}
    </form>
  )
}
