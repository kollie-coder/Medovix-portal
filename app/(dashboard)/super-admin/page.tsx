'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HiOutlineGlobeAlt, HiOutlineCheckCircle, HiOutlineUsers, HiOutlineUserGroup } from 'react-icons/hi'
import api from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'

type PlatformStats = {
  hospitalCount: number
  activeHospitalCount: number
  totalStaff: number
  totalPatients: number
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const user = await getCurrentUser()
      if (!user || user.role !== 'SUPER_ADMIN') {
        router.replace('/')
        return
      }
      setCheckingAccess(false)
      loadStats()
    }
    checkAccess()
  }, [router])

  const loadStats = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/super-admin/stats')
      setStats(data)
    } catch (err) {
      console.error('Failed to load platform stats', err)
    } finally {
      setLoading(false)
    }
  }

  if (checkingAccess) return null

  const cards = [
    { label: 'Hospitals on Platform', value: stats?.hospitalCount, icon: HiOutlineGlobeAlt, color: '#0A7EA4', bg: '#E0F4FB' },
    { label: 'Active Hospitals', value: stats?.activeHospitalCount, icon: HiOutlineCheckCircle, color: '#12B886', bg: '#E6FAF4' },
    { label: 'Total Staff', value: stats?.totalStaff, icon: HiOutlineUsers, color: '#534AB7', bg: '#EEEDFE' },
    { label: 'Total Registered Patients', value: stats?.totalPatients, icon: HiOutlineUserGroup, color: '#FB8C00', bg: '#FFF3E0' },
  ]

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-xl font-bold text-[#0D1117]">Platform Overview</h1>
      <p className="text-sm text-gray-400 mt-1 mb-6">Medovite-wide stats across every onboarded hospital</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: card.bg }}
              >
                <Icon size={20} color={card.color} />
              </div>
              <p className="text-2xl font-bold text-[#0D1117]">
                {loading ? '—' : card.value}
              </p>
              <p className="text-xs text-gray-400 mt-1">{card.label}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-[#0D1117] mb-2">Super Admin</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          This is the platform-level view across all hospitals on Medovite. Head to
          the Hospitals page to onboard a new hospital or manage existing ones.
        </p>
      </div>
    </div>
  )
}
