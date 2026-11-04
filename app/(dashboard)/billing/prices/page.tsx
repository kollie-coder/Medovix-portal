'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { HiArrowLeft } from 'react-icons/hi'
import api from '@/lib/api'
import { errorMessage } from '@/components/VitalsForm'
import { formatNaira, koboToInput, nairaToKobo } from '@/lib/money'
import { TYPE_LABEL } from '@/lib/billing'

type Price = { id: string; type: string; name: string; price: number; active: boolean }
const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary'

export default function PricesPage() {
  const [items, setItems] = useState<Price[]>([])
  const [error, setError] = useState('')
  const [type, setType] = useState('LAB')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')

  const load = useCallback(async () => {
    try { setItems((await api.get<Price[]>('/billing/prices')).data) }
    catch (err) { setError(errorMessage(err, 'Could not load the price list')) }
  }, [])
  useEffect(() => { load() }, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const kobo = nairaToKobo(price)
    if (kobo == null) { setError('Enter a valid price'); return }
    setError(''); setSaving(true)
    try {
      await api.post('/billing/prices', { type, name: name.trim(), price: kobo })
      setName(''); setPrice(''); await load()
    } catch (err) { setError(errorMessage(err, 'Could not add that item')) }
    finally { setSaving(false) }
  }

  const patch = async (id: string, body: Record<string, unknown>) => {
    setError('')
    try { await api.patch(`/billing/prices/${id}`, body); setEditing(null); await load() }
    catch (err) { setError(errorMessage(err, 'Could not update that item')) }
  }

  const grouped = Object.keys(TYPE_LABEL).map(t => ({ t, rows: items.filter(i => i.type === t) })).filter(g => g.rows.length > 0)

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href="/billing" className="text-sm text-primary flex items-center gap-1 mb-4"><HiArrowLeft size={16} /> Billing</Link>
      <h1 className="text-xl font-bold text-[#0D1117]">Price list</h1>
      <p className="text-sm text-gray-400 mt-1 mb-5">Prices fill in automatically when you invoice a visit. Match the name exactly, e.g. the lab test or medicine name the doctor uses. Changing a price never changes invoices already issued.</p>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4"><p className="text-sm text-red-600">{error}</p></div>}

      <form onSubmit={add} className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
        <label className="text-xs text-gray-500 sm:col-span-3">Type
          <select className={inputClass} value={type} onChange={e => setType(e.target.value)}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-500 sm:col-span-5">Name<input required className={inputClass} placeholder="e.g. Full blood count" value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="text-xs text-gray-500 sm:col-span-2">Price (₦)<input required inputMode="decimal" className={inputClass} placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} /></label>
        <button type="submit" disabled={saving} className="sm:col-span-2 bg-primary text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-60">{saving ? 'Adding...' : 'Add'}</button>
      </form>

      {grouped.length === 0 ? <p className="text-sm text-gray-400">No prices yet.</p> : grouped.map(g => (
        <section key={g.t} className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{TYPE_LABEL[g.t]}</h2>
          <ul className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {g.rows.map(r => (
              <li key={r.id} className="px-4 py-2.5 flex items-center justify-between gap-3" style={{ opacity: r.active ? 1 : 0.5 }}>
                <span className="text-sm text-[#0D1117] min-w-0 truncate">{r.name}</span>
                <span className="flex items-center gap-3 shrink-0">
                  {editing === r.id ? (
                    <>
                      <input autoFocus inputMode="decimal" className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                      <button onClick={() => { const k = nairaToKobo(editPrice); if (k == null) setError('Enter a valid price'); else patch(r.id, { price: k }) }} className="text-xs font-semibold text-primary">Save</button>
                      <button onClick={() => setEditing(null)} className="text-xs text-gray-500">Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold">{formatNaira(r.price)}</span>
                      <button onClick={() => { setEditing(r.id); setEditPrice(koboToInput(r.price)) }} className="text-xs font-semibold text-primary">Edit</button>
                      <button onClick={() => patch(r.id, { active: !r.active })} className="text-xs font-semibold text-gray-500">{r.active ? 'Hide' : 'Show'}</button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
