'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifyPage() {
  const router = useRouter()
  const [ref, setRef] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = ref.trim().toUpperCase()
    if (clean) router.push(`/verify/${encodeURIComponent(clean)}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-md flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#0D1117]">Check a medical document</h1>
          <p className="text-sm text-gray-400 mt-1">Enter the reference printed at the bottom of a sick note or referral letter, e.g. MD-AB3K-9XYZ.</p>
        </div>
        <input
          required
          autoFocus
          value={ref}
          onChange={e => setRef(e.target.value)}
          placeholder="MD-XXXX-XXXX"
          className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm uppercase outline-none focus:border-primary"
        />
        <button type="submit" className="bg-primary text-white text-sm font-semibold py-2.5 rounded-lg">Check</button>
      </form>
    </div>
  )
}
