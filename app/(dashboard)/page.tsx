'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineUserGroup, HiOutlineCalendar } from 'react-icons/hi'
import api from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'

type Stats = {
  departmentCount: number
  staffCount: number
  patientCount: number
  appointmentCount: number
}

export default function DashboardHome() {
  const router = useRouter()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const user = await getCurrentUser()
      // This dashboard is scoped to one hospital — a Super Admin has
      // no hospitalId at all, so send them to their own platform-wide
      // dashboard instead of showing a meaningless empty view here.
      if (user?.role === 'SUPER_ADMIN') {
        router.replace('/super-admin')
        return
      }
      setCheckingAccess(false)
      loadStats()
    }
    checkAccess()
  }, [router])

  const loadStats = async () => {
    try {
      const { data } = await api.get('/hospital-admin/stats')
      setStats(data)
    } catch {
      setStats({ departmentCount: 0, staffCount: 0, patientCount: 0, appointmentCount: 0 })
    } finally {
      setLoading(false)
    }
  }

  if (checkingAccess) return null

  const cards = [
    { label: 'Departments', value: stats?.departmentCount, icon: HiOutlineOfficeBuilding, color: '#0A7EA4', bg: '#E0F4FB' },
    { label: 'Staff Members', value: stats?.staffCount, icon: HiOutlineUsers, color: '#12B886', bg: '#E6FAF4' },
    { label: 'Registered Patients', value: stats?.patientCount, icon: HiOutlineUserGroup, color: '#534AB7', bg: '#EEEDFE' },
    { label: "Today's Appointments", value: stats?.appointmentCount, icon: HiOutlineCalendar, color: '#FB8C00', bg: '#FFF3E0' },
  ]

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-xl font-bold text-[#0D1117]">Dashboard</h1>
      <p className="text-sm text-gray-400 mt-1 mb-6">Overview of your hospital on Medovite</p>

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
        <h2 className="text-sm font-bold text-[#0D1117] mb-2">Getting started</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Welcome to your Medovite Admin Portal. Start by setting up your hospital&apos;s
          departments, then invite your medical staff to join.
        </p>
      </div>
    </div>
  )
}
