'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  HiOutlineViewGrid, HiOutlineOfficeBuilding, HiOutlineUsers,
  HiOutlineCog, HiOutlineLogout, HiMenuAlt3, HiX, HiOutlineGlobeAlt,
} from 'react-icons/hi'
import { isAuthenticated, logout, getCurrentUser, PortalUser } from '@/lib/auth'

const HOSPITAL_NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: HiOutlineViewGrid },
  { label: 'Departments', href: '/departments', icon: HiOutlineOfficeBuilding },
  { label: 'Staff', href: '/staff', icon: HiOutlineUsers },
  { label: 'Settings', href: '/settings', icon: HiOutlineCog },
]

const PLATFORM_NAV_ITEMS = [
  { label: 'Dashboard', href: '/super-admin', icon: HiOutlineViewGrid },
  { label: 'Hospitals', href: '/super-admin/hospitals', icon: HiOutlineGlobeAlt },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<PortalUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const check = async () => {
      if (!isAuthenticated()) {
        router.replace('/login')
        return
      }
      const current = await getCurrentUser()
      if (!current || (current.role !== 'ADMIN' && current.role !== 'SUPER_ADMIN')) {
        router.replace('/login')
        return
      }
      setUser(current)
      setChecking(false)
    }
    check()
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const renderNavLink = (item: { label: string; href: string; icon: any }, onClick?: () => void) => {
    const active = pathname === item.href
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClick}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
        style={{
          backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
          color: active ? '#ffffff' : 'rgba(255,255,255,0.65)',
        }}
      >
        <Icon size={18} />
        {item.label}
      </Link>
    )
  }

  // A Super Admin isn't tied to any single hospital, so the
  // hospital-scoped items (Departments, Staff, hospital Settings)
  // don't apply to them — they see the Platform section only, with
  // its own Dashboard (platform-wide stats) and Hospitals management.
  const renderNav = (onLinkClick?: () => void) => (
    <>
      {isSuperAdmin ? (
        <>
          <div className="px-3 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Platform
            </p>
          </div>
          {PLATFORM_NAV_ITEMS.map(item => renderNavLink(item, onLinkClick))}
        </>
      ) : (
        HOSPITAL_NAV_ITEMS.map(item => renderNavLink(item, onLinkClick))
      )}
    </>
  )

  return (
    <div className="min-h-screen flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0" style={{ backgroundColor: '#1A1A2E' }}>
        <div className="px-6 py-6">
          <Image
            src="/medovite-logo-navbar-tight-white.png"
            alt="Medovite"
            width={130}
            height={37}
            style={{ objectFit: 'contain', height: 'auto' }}
          />
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
          {renderNav()}
        </nav>

        <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="px-3 py-2 mb-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
              {isSuperAdmin && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: '#12B886', color: '#fff' }}>
                  SUPER ADMIN
                </span>
              )}
            </div>
            <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            <HiOutlineLogout size={18} />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <Image
          src="/medovite-logo-navbar-tight.png"
          alt="Medovite"
          width={110}
          height={31}
          style={{ objectFit: 'contain', height: 'auto' }}
        />
        <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="text-gray-600">
          {mobileNavOpen ? <HiX size={22} /> : <HiMenuAlt3 size={22} />}
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-14 overflow-y-auto" style={{ backgroundColor: '#1A1A2E' }}>
          <nav className="px-4 py-4 flex flex-col gap-1">
            {renderNav(() => setMobileNavOpen(false))}

            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium mt-4 border-t pt-4"
              style={{ color: 'rgba(255,255,255,0.65)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <HiOutlineLogout size={18} />
              Log out
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:pt-0 pt-14">
        {children}
      </main>
    </div>
  )
}
