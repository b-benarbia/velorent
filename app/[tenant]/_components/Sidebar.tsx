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
  Search,
} from 'lucide-react'
import CommandPalette from './CommandPalette'

const NAV_ITEMS = [
  { key: 'dashboard',    label: 'Dashboard',     icon: LayoutDashboard, section: 'Principal', badgeKey: null },
  { key: 'rentals',      label: 'Locations',     icon: Bike,            section: 'Principal', badgeKey: 'rentals' },
  { key: 'reservations', label: 'Réservations',  icon: CalendarDays,    section: 'Principal', badgeKey: 'reservations' },
  { key: 'bikes',        label: 'Flotte',        icon: Wrench,          section: 'Gestion',   badgeKey: null },
  { key: 'accounting',   label: 'Compta',        icon: Receipt,         section: 'Gestion',   badgeKey: null },
]

interface SidebarProps {
  tenant: string
  tenantSlug: string
  role: string
  activeRentalsCount: number
  pendingReservationsCount: number
}

export default function Sidebar({ tenant, tenantSlug, role, activeRentalsCount, pendingReservationsCount }: SidebarProps) {
  const pathname = usePathname()

  const badges: Record<string, number> = {
    rentals: activeRentalsCount,
    reservations: pendingReservationsCount,
  }

  const nav = [
    ...NAV_ITEMS,
    ...(role === 'OWNER' ? [{ key: 'settings', label: 'Paramètres', icon: Settings, section: 'Accès', badgeKey: null }] : []),
  ]

  const mobileNav = nav.slice(0, 5)

  const sections: { label: string; items: typeof NAV_ITEMS }[] = []
  for (const item of nav) {
    const sec = sections.find(s => s.label === item.section)
    if (sec) sec.items.push(item)
    else sections.push({ label: item.section, items: [item] })
  }

  return (
    <>
      <CommandPalette tenant={tenant} />

      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className="hidden md:flex w-56 flex-col fixed h-full z-10 overflow-hidden"
        style={{ background: '#0F172A' }}
      >
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 grid-pattern pointer-events-none" />

        {/* Logo */}
        <div className="relative px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #8b5cf6 100%)',
                boxShadow: '0 0 12px rgba(99,102,241,0.4)',
              }}
            >
              <Bike size={15} className="text-white" />
            </div>
            <div>
              <span className="font-semibold text-white text-[15px] tracking-tight block leading-tight">VeloRent</span>
              <span className="text-[11px] truncate font-mono" style={{ color: '#475569' }}>{tenantSlug}</span>
            </div>
          </div>
        </div>

        {/* Cmd+K search trigger */}
        <div className="relative px-3 pt-3 pb-1">
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
              window.dispatchEvent(event)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors group"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#475569' }}
          >
            <Search size={12} style={{ color: '#334155' }} />
            <span className="flex-1 text-left">Rechercher...</span>
            <kbd className="text-[10px] font-mono" style={{ color: '#1e3a5f' }}>⌘K</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 px-3 py-3 overflow-y-auto">
          {sections.map((section, si) => (
            <div key={section.label} className={si > 0 ? 'mt-5' : ''}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 mb-1.5" style={{ color: '#1e3a5f' }}>
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const href = `/${tenant}/${item.key}`
                  const isActive = pathname.startsWith(href)
                  const Icon = item.icon
                  const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0
                  return (
                    <Link
                      key={item.key}
                      href={href}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium group relative overflow-hidden"
                      style={{
                        background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: isActive ? '#a5b4fc' : '#475569',
                      }}
                    >
                      {/* Active left border glow */}
                      {isActive && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                          style={{ background: 'linear-gradient(180deg, #6366F1 0%, #8b5cf6 100%)', boxShadow: '0 0 6px #6366F1' }}
                        />
                      )}
                      <Icon
                        size={15}
                        strokeWidth={isActive ? 2.5 : 1.8}
                        style={{ color: isActive ? '#6366F1' : '#334155' }}
                        className="transition-colors duration-150 group-hover:text-slate-300"
                      />
                      <span className={`flex-1 transition-colors duration-150 ${isActive ? '' : 'group-hover:text-slate-300'}`}>
                        {item.label}
                      </span>
                      {badgeCount > 0 && (
                        <span
                          className="text-[10px] font-semibold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1"
                          style={{
                            background: isActive ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.15)',
                            color: isActive ? '#a5b4fc' : '#6366F1',
                          }}
                        >
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="relative px-3 pb-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold"
              style={{ background: '#1e293b', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {tenantSlug.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-white truncate">{tenantSlug}</p>
              <p className="text-[10px]" style={{ color: '#334155' }}>{role === 'OWNER' ? 'Propriétaire' : 'Employé'}</p>
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium group transition-all duration-150"
              style={{ color: '#334155' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.color = '#f87171'
                el.style.background = 'rgba(239,68,68,0.08)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.color = '#334155'
                el.style.background = 'transparent'
              }}
            >
              <LogOut size={14} />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-20 px-4 py-3 flex items-center justify-between border-b overflow-hidden"
        style={{ background: '#0F172A', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
      >
        <div className="absolute inset-0 grid-pattern pointer-events-none" />
        <div className="relative flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8b5cf6 100%)' }}>
            <Bike size={13} className="text-white" />
          </div>
          <span className="font-semibold text-white text-sm">VeloRent</span>
          <span className="text-xs font-mono" style={{ color: '#334155' }}>· {tenantSlug}</span>
        </div>
        <form action="/api/auth/logout" method="POST" className="relative">
          <button type="submit" className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity">
            <LogOut size={16} className="text-slate-400" />
          </button>
        </form>
      </header>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 border-t px-2 py-1 safe-area-pb"
        style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex justify-around">
          {mobileNav.map((item) => {
            const href = `/${tenant}/${item.key}`
            const isActive = pathname.startsWith(href)
            const Icon = item.icon
            const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0
            return (
              <Link
                key={item.key}
                href={href}
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all relative"
                style={{ color: isActive ? '#6366F1' : '#334155' }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
                {badgeCount > 0 && (
                  <span
                    className="absolute top-1 right-1 text-[9px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-0.5"
                    style={{ background: '#6366F1', color: '#fff' }}
                  >
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
