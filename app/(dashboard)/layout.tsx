'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  HiOutlineViewGrid, HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineUserGroup,
  HiOutlineCog, HiOutlineLogout, HiMenuAlt3, HiX, HiOutlineGlobeAlt, HiOutlineCalendar,
  HiOutlineCreditCard, HiOutlineClipboardList, HiOutlineClock, HiOutlineHeart,
  HiOutlineUserCircle, HiOutlineSearch, HiOutlineBeaker, HiOutlineShoppingBag, HiOutlineBell,
} from 'react-icons/hi'
import { isAuthenticated, logout, getCurrentUser, PortalUser } from '@/lib/auth'
import api from '@/lib/api'

type HospitalBrand = { name: string; logo: string | null }

function hospitalInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

const ACCOUNT_NAV = { label: 'Account', href: '/account', icon: HiOutlineUserCircle }

const HOSPITAL_NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: HiOutlineViewGrid },
  { label: 'Departments', href: '/departments', icon: HiOutlineOfficeBuilding },
  { label: 'Staff', href: '/staff', icon: HiOutlineUsers },
  { label: 'Patients', href: '/patients', icon: HiOutlineUserGroup },
  { label: 'Appointments', href: '/appointments', icon: HiOutlineCalendar },
  { label: 'Billing', href: '/billing', icon: HiOutlineCreditCard },
  { label: 'Audit Log', href: '/audit-log', icon: HiOutlineClipboardList },
  { label: 'Settings', href: '/settings', icon: HiOutlineCog },
  ACCOUNT_NAV,
]

const PLATFORM_NAV_ITEMS = [
  { label: 'Dashboard', href: '/super-admin', icon: HiOutlineViewGrid },
  { label: 'Hospitals', href: '/super-admin/hospitals', icon: HiOutlineGlobeAlt },
  ACCOUNT_NAV,
]

type NavItem = { label: string; href: string; icon: any }

// What each role sees in the sidebar, where they land after login, and which
// top-level sections they may open. `allowed: null` means no restriction here
// (the API still enforces permissions on every request).
const ROLE_CONFIG: Record<string, { home: string; nav: NavItem[]; allowed: string[] | null; badge?: string }> = {
  ADMIN: { home: '/', nav: HOSPITAL_NAV_ITEMS, allowed: null },
  SUPER_ADMIN: { home: '/super-admin', nav: PLATFORM_NAV_ITEMS, allowed: null, badge: 'SUPER ADMIN' },
  RECEPTIONIST: {
    home: '/reception',
    nav: [
      { label: 'Reception', href: '/reception', icon: HiOutlineClock },
      { label: 'Patients', href: '/patients', icon: HiOutlineUserGroup },
      { label: 'Appointments', href: '/appointments', icon: HiOutlineCalendar },
      ACCOUNT_NAV,
    ],
    allowed: ['/reception', '/patients', '/appointments', '/account'],
    badge: 'RECEPTION',
  },
  DOCTOR: {
    home: '/doctor',
    nav: [
      { label: 'My patients', href: '/doctor', icon: HiOutlineClipboardList },
      { label: 'Schedule', href: '/doctor/schedule', icon: HiOutlineCalendar },
      { label: 'Find a patient', href: '/doctor/patients', icon: HiOutlineSearch },
      { label: 'Results', href: '/doctor/inbox', icon: HiOutlineBell },
      ACCOUNT_NAV,
    ],
    allowed: ['/doctor', '/account'],
    badge: 'DOCTOR',
  },
  NURSE: {
    home: '/nurse',
    nav: [{ label: 'Vitals', href: '/nurse', icon: HiOutlineHeart }, ACCOUNT_NAV],
    allowed: ['/nurse', '/account'],
    badge: 'NURSE',
  },
  LAB_TECHNICIAN: {
    home: '/lab',
    nav: [{ label: 'Lab requests', href: '/lab', icon: HiOutlineBeaker }, ACCOUNT_NAV],
    allowed: ['/lab', '/account'],
    badge: 'LAB',
  },
  PHARMACIST: {
    home: '/pharmacy',
    nav: [{ label: 'Prescriptions', href: '/pharmacy', icon: HiOutlineShoppingBag }, ACCOUNT_NAV],
    allowed: ['/pharmacy', '/account'],
    badge: 'PHARMACY',
  },
  ACCOUNTANT: {
    home: '/billing',
    nav: [{ label: 'Billing', href: '/billing', icon: HiOutlineCreditCard }, ACCOUNT_NAV],
    allowed: ['/billing', '/account'],
    badge: 'ACCOUNTS',
  },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<PortalUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [hospitalBrand, setHospitalBrand] = useState<HospitalBrand | null>(null)
  const [unread, setUnread] = useState<{ count: number; critical: number }>({ count: 0, critical: 0 })

  useEffect(() => {
    const check = async () => {
      if (!isAuthenticated()) {
        router.replace('/login')
        return
      }
      const current = await getCurrentUser()
      if (!current || !ROLE_CONFIG[current.role as string]) {
        router.replace('/login')
        return
      }
      setUser(current)
      setChecking(false)

      // Hospital-scoped users (not Super Admin) see their own
      // hospital's branding in the sidebar instead of the generic
      // Medovite logo.
      if (current.role !== 'SUPER_ADMIN') {
        try {
          const { data } = await api.get('/hospital-admin/hospital/brand')
          setHospitalBrand({ name: data.name, logo: data.logo ?? null })
        } catch {
          // Non-fatal — falls back to the Medovite logo below.
        }
      }
    }
    check()
  }, [router])

  // Doctors: keep the Results badge fresh.
  useEffect(() => {
    if (user?.role !== 'DOCTOR') return
    let stop = false
    const load = async () => {
      try {
        const { data } = await api.get('/inbox/unread-count')
        if (!stop) setUnread({ count: data.count ?? 0, critical: data.critical ?? 0 })
      } catch {
        // The badge is a convenience; ignore failures.
      }
    }
    load()
    const t = setInterval(load, 30000)
    const onChange = () => load()
    window.addEventListener('inbox-changed', onChange)
    return () => { stop = true; clearInterval(t); window.removeEventListener('inbox-changed', onChange) }
  }, [user?.role])

  // Keep each role inside the sections it is meant to use.
  useEffect(() => {
    if (!user) return
    const config = ROLE_CONFIG[user.role as string]
    if (!config || !config.allowed) return
    const permitted = config.allowed.some(p => pathname === p || pathname.startsWith(p + '/'))
    if (!permitted) router.replace(config.home)
  }, [user, pathname, router])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  // When two menu items could both match the current page (e.g. /doctor and
  // /doctor/patients), only the most specific one is highlighted.
  const navItems: NavItem[] = isSuperAdmin ? PLATFORM_NAV_ITEMS : (ROLE_CONFIG[user?.role as string]?.nav ?? [])
  const matchesPath = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
  const activeHref = navItems
    .filter(i => matchesPath(i.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  const renderNavLink = (item: { label: string; href: string; icon: any }, onClick?: () => void) => {
    const active = item.href === activeHref
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
        {item.href === '/doctor/inbox' && unread.count > 0 && (
          <span
            className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
            style={{ backgroundColor: unread.critical > 0 ? '#DC2626' : '#12B886' }}
          >
            {unread.count > 99 ? '99+' : unread.count}
          </span>
        )}
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
        (ROLE_CONFIG[user?.role as string]?.nav ?? []).map(item => renderNavLink(item, onLinkClick))
      )}
    </>
  )

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen overflow-y-auto" style={{ backgroundColor: '#1A1A2E' }}>
        <div className="px-6 py-6">
          {!isSuperAdmin && hospitalBrand ? (
            <div className="flex items-center gap-2.5 min-w-0">
              {hospitalBrand.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hospitalBrand.logo}
                  alt={hospitalBrand.name}
                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff' }}
                >
                  {hospitalInitials(hospitalBrand.name)}
                </div>
              )}
              <p className="text-sm font-bold text-white truncate leading-tight">{hospitalBrand.name}</p>
            </div>
          ) : (
            <Image
              src="/medovite-logo-navbar-tight-white.png"
              alt="Medovite"
              width={130}
              height={37}
              style={{ objectFit: 'contain', height: 'auto' }}
            />
          )}
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
          {renderNav()}
        </nav>

        <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="px-3 py-2 mb-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
              {ROLE_CONFIG[user?.role as string]?.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: '#12B886', color: '#fff' }}>
                  {ROLE_CONFIG[user?.role as string]?.badge}
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

          {!isSuperAdmin && hospitalBrand && (
            <div className="flex items-center gap-1.5 px-3 pt-3 mt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Powered by</span>
              <Image
                src="/medovite-logo-navbar-tight-white.png"
                alt="Medovite"
                width={64}
                height={18}
                style={{ objectFit: 'contain', height: 'auto', opacity: 0.45 }}
              />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        {!isSuperAdmin && hospitalBrand ? (
          <div className="flex items-center gap-2 min-w-0">
            {hospitalBrand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hospitalBrand.logo} alt={hospitalBrand.name} className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ backgroundColor: '#E0F4FB', color: '#065f7a' }}>
                {hospitalInitials(hospitalBrand.name)}
              </div>
            )}
            <p className="text-sm font-bold text-[#0D1117] truncate">{hospitalBrand.name}</p>
          </div>
        ) : (
          <Image
            src="/medovite-logo-navbar-tight.png"
            alt="Medovite"
            width={110}
            height={31}
            style={{ objectFit: 'contain', height: 'auto' }}
          />
        )}
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
      <main className="flex-1 lg:pt-0 pt-14 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  )
}