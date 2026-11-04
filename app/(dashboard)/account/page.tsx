'use client'
import { useCallback, useEffect, useState } from 'react'
import { HiOutlineClipboardCopy, HiCheck } from 'react-icons/hi'
import api from '@/lib/api'
import { errorMessage } from '@/components/VitalsForm'

type Me = {
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: string
  twoFactorEnabled: boolean
}

type TwoFactorStatus = { twoFactorEnabled: boolean; remainingBackupCodes: number }

const inputClass = 'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary'
const buttonClass = 'bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60'

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 max-w-xl">
      <h2 className="text-sm font-bold text-[#0D1117]">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Notice({ kind, text }: { kind: 'error' | 'success'; text: string }) {
  if (!text) return null
  const style = kind === 'error'
    ? 'bg-red-50 border-red-200 text-red-600'
    : 'bg-[#E6FAF4] border-[#9FE1CB] text-[#085041]'
  return (
    <div className={`border rounded-lg px-3 py-2 mb-3 ${style}`}>
      <p className="text-sm">{text}</p>
    </div>
  )
}

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [loadError, setLoadError] = useState('')

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get<Me>('/auth/me')
      setMe(data)
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load your account'))
    }
  }, [])

  useEffect(() => { loadMe() }, [loadMe])

  if (loadError) {
    return <div className="p-6 lg:p-8"><Notice kind="error" text={loadError} /></div>
  }
  if (!me) {
    return (
      <div className="p-12 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0D1117]">My account</h1>
        <p className="text-sm text-gray-400 mt-1">{me.email}</p>
      </div>

      <ProfileCard me={me} onSaved={loadMe} />
      <PasswordCard />
      <TwoFactorCard enabledOnAccount={me.twoFactorEnabled} onChanged={loadMe} />
    </div>
  )
}

function ProfileCard({ me, onSaved }: { me: Me; onSaved: () => void }) {
  const [firstName, setFirstName] = useState(me.firstName)
  const [lastName, setLastName] = useState(me.lastName)
  const [phone, setPhone] = useState(me.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setDone(''); setSaving(true)
    try {
      await api.put('/auth/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      })
      setDone('Profile updated.')
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Could not update your profile'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="Profile" subtitle="Your email address is your sign-in name and can only be changed by your hospital administrator.">
      <Notice kind="error" text={error} />
      <Notice kind="success" text={done} />
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <input required className={inputClass} placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} />
          <input required className={inputClass} placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />
        </div>
        <input className={inputClass} placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
        <button type="submit" disabled={saving} className={`${buttonClass} self-start`}>
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </Card>
  )
}

function PasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setDone('')
    if (next.length < 8) { setError('The new password must be at least 8 characters.'); return }
    if (next !== confirm) { setError('The new passwords do not match.'); return }
    setSaving(true)
    try {
      await api.put('/auth/change-password', { currentPassword: current, newPassword: next })
      setCurrent(''); setNext(''); setConfirm('')
      setDone('Password changed. You will be asked to sign in again on your other devices.')
    } catch (err) {
      setError(errorMessage(err, 'Could not change your password'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="Password">
      <Notice kind="error" text={error} />
      <Notice kind="success" text={done} />
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input required type="password" autoComplete="current-password" className={inputClass} placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} />
        <input required type="password" autoComplete="new-password" className={inputClass} placeholder="New password (8+ characters)" value={next} onChange={e => setNext(e.target.value)} />
        <input required type="password" autoComplete="new-password" className={inputClass} placeholder="Repeat new password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <button type="submit" disabled={saving} className={`${buttonClass} self-start`}>
          {saving ? 'Changing...' : 'Change password'}
        </button>
      </form>
    </Card>
  )
}

function BackupCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(codes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
        <p className="text-sm text-amber-800">
          Save these backup codes somewhere safe. Each works once if you lose your phone. They are shown only now.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
        {codes.map(c => <code key={c} className="text-sm font-mono text-[#0D1117]">{c}</code>)}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={copy} className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          {copied ? <HiCheck size={16} /> : <HiOutlineClipboardCopy size={16} />} {copied ? 'Copied' : 'Copy codes'}
        </button>
        <button type="button" onClick={onDone} className={buttonClass}>I have saved them</button>
      </div>
    </div>
  )
}

function TwoFactorCard({ enabledOnAccount, onChanged }: { enabledOnAccount: boolean; onChanged: () => void }) {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [setup, setSetup] = useState<{ secret: string; qrCode: string } | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'idle' | 'disable' | 'regenerate'>('idle')
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.get<TwoFactorStatus>('/auth/2fa/status')
      setStatus(data)
    } catch (err) {
      setError(errorMessage(err, 'Could not load two-factor status'))
    }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus, enabledOnAccount])

  const begin = async () => {
    setError(''); setBusy(true)
    try {
      const { data } = await api.post('/auth/2fa/setup')
      setSetup(data)
    } catch (err) {
      setError(errorMessage(err, 'Could not start setup'))
    } finally {
      setBusy(false)
    }
  }

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const { data } = await api.post('/auth/2fa/verify', { code: code.trim() })
      setBackupCodes(data.backupCodes)
      setSetup(null); setCode('')
      await loadStatus()
      onChanged()
    } catch (err) {
      setError(errorMessage(err, 'That code was not accepted'))
    } finally {
      setBusy(false)
    }
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      if (mode === 'disable') {
        await api.post('/auth/2fa/disable', { password })
      } else {
        const { data } = await api.post('/auth/2fa/backup-codes/regenerate', { password })
        setBackupCodes(data.backupCodes)
      }
      setPassword(''); setMode('idle')
      await loadStatus()
      onChanged()
    } catch (err) {
      setError(errorMessage(err, 'Could not complete that'))
    } finally {
      setBusy(false)
    }
  }

  const enabled = status?.twoFactorEnabled ?? enabledOnAccount

  return (
    <Card
      title="Two-factor sign-in"
      subtitle="Adds a code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy) to your password. Strongly recommended for staff who can see patient records."
    >
      <Notice kind="error" text={error} />

      {backupCodes ? (
        <BackupCodes codes={backupCodes} onDone={() => setBackupCodes(null)} />
      ) : setup ? (
        <form onSubmit={confirmSetup} className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">1. Scan this QR code with your authenticator app.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qrCode} alt="Two-factor QR code" className="w-44 h-44 border border-gray-200 rounded-lg" />
          <p className="text-xs text-gray-400 break-all">Can&apos;t scan? Enter this key instead: <code className="font-mono">{setup.secret}</code></p>
          <p className="text-sm text-gray-600">2. Enter the 6-digit code the app shows.</p>
          <input required inputMode="numeric" autoComplete="one-time-code" className={inputClass} placeholder="123456" value={code} onChange={e => setCode(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setSetup(null); setCode('') }} className="text-sm text-gray-500 px-3 py-2">Cancel</button>
            <button type="submit" disabled={busy} className={buttonClass}>{busy ? 'Checking...' : 'Turn on'}</button>
          </div>
        </form>
      ) : mode !== 'idle' ? (
        <form onSubmit={submitPassword} className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">
            {mode === 'disable' ? 'Enter your password to turn two-factor sign-in off.' : 'Enter your password to create a fresh set of backup codes. The old ones stop working.'}
          </p>
          <input required type="password" autoComplete="current-password" className={inputClass} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setMode('idle'); setPassword('') }} className="text-sm text-gray-500 px-3 py-2">Cancel</button>
            <button type="submit" disabled={busy} className={buttonClass}>{busy ? 'Working...' : 'Confirm'}</button>
          </div>
        </form>
      ) : enabled ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[#0D1117]">
            <span className="text-xs font-semibold px-2 py-1 rounded-full mr-2" style={{ backgroundColor: '#E6FAF4', color: '#0B6B4D' }}>On</span>
            {status ? `${status.remainingBackupCodes} backup codes left` : ''}
          </p>
          <div className="flex gap-4">
            <button type="button" onClick={() => setMode('regenerate')} className="text-sm font-semibold text-primary">New backup codes</button>
            <button type="button" onClick={() => setMode('disable')} className="text-sm font-semibold text-red-600">Turn off</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={begin} disabled={busy} className={buttonClass}>
          {busy ? 'Starting...' : 'Set up two-factor sign-in'}
        </button>
      )}
    </Card>
  )
}