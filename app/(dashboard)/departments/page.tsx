'use client'
import { useEffect, useState } from 'react'
import { HiOutlinePlus, HiX, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'
import api from '@/lib/api'

type Department = {
  id: string
  name: string
  createdAt: string
  _count: { staff: number }
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)

  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/hospital-admin/departments')
      setDepartments(data)
    } catch (err) {
      console.error('Failed to load departments', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Remove "${dept.name}"? This can't be undone.`)) return
    try {
      await api.delete(`/hospital-admin/departments/${dept.id}`)
      loadDepartments()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Could not remove department')
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0D1117]">Departments</h1>
          <p className="text-sm text-gray-400 mt-1">Organize your hospital&apos;s staff by department</p>
        </div>
        <button
          onClick={() => { setEditingDept(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
        >
          <HiOutlinePlus size={18} />
          Add Department
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : departments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-400">No departments yet. Add your first one to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Name</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Staff</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr key={dept.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-4 font-medium text-[#0D1117]">{dept.name}</td>
                  <td className="px-5 py-4 text-gray-500">{dept._count.staff}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => { setEditingDept(dept); setShowModal(true) }}
                        className="text-gray-400 hover:text-primary"
                      >
                        <HiOutlinePencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(dept)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <HiOutlineTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <DepartmentModal
          department={editingDept}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadDepartments() }}
        />
      )}
    </div>
  )
}

function DepartmentModal({
  department, onClose, onSuccess,
}: {
  department: Department | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState(department?.name ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (department) {
        await api.patch(`/hospital-admin/departments/${department.id}`, { name })
      } else {
        await api.post('/hospital-admin/departments', { name })
      }
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not save department')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0D1117]">
            {department ? 'Edit Department' : 'Add Department'}
          </h2>
          <button onClick={onClose} className="text-gray-400"><HiX size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <input
            required
            autoFocus
            placeholder="Department name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
          >
            {loading ? 'Saving...' : department ? 'Save Changes' : 'Add Department'}
          </button>
        </form>
      </div>
    </div>
  )
}
