'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bike,
  Wrench,
  CalendarDays,
  Receipt,
  Settings,
  LogOut,
} from 'lucide-react'

const NAV_ITEMS = [
  { key: 'dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { key: 'rentals',      label: 'Locations',   icon: Bike },
  { key: 'bikes',        label: 'Flotte',       icon: Wrench },
  { key: 'reservations', label: 'Réservations', icon: CalendarDays },
  { key: 'accounting',   label: 'Compta',       icon: Receipt },
]

interface SidebarProps {
  tenant: string
  tenantSlug: string
  role: string
}

export default function Sidebar({ tenant, tenantSlug, role }: SidebarProps) {
  const pathname = usePathname()

  const nav = [
    ...NAV_ITEMS,
    ...(role === 'OWNER' ? [{ key: 'settings', label: 'Paramètres', icon: Settings }] : []),
  ]

  // Mobile bottom nav — show max 5 items (settings hidden on mobile if not owner)
  const mobileNav = nav.slice(0, 5)

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col fixed h-full z-10">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bike size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight">VeloRent</span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 truncate font-mono">{tenantSlug}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const href = `/${tenant}/${item.key}`
            const isActive = pathname.startsWith(href)
            const Icon = item.icon
            return (
              <Link
                key={item.key}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-blue-600' : 'text-gray-400'} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-3 border-t border-gray-100">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
            >
              <LogOut size={16} className="text-gray-400" />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <Bike size={12} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">VeloRent</span>
          <span className="text-xs text-gray-400 font-mono">· {tenantSlug}</span>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
            <LogOut size={16} className="text-gray-400" />
          </button>
        </form>
      </header>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 px-2 py-1 safe-area-pb">
        <div className="flex justify-around">
          {mobileNav.map((item) => {
            const href = `/${tenant}/${item.key}`
            const isActive = pathname.startsWith(href)
            const Icon = item.icon
            return (
              <Link
                key={item.key}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
