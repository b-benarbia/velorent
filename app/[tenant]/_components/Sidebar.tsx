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
  { key: 'dashboard',    label: 'Dashboard',     icon: LayoutDashboard, section: 'Principal' },
  { key: 'rentals',      label: 'Locations',     icon: Bike,            section: 'Principal' },
  { key: 'reservations', label: 'Réservations',  icon: CalendarDays,    section: 'Principal' },
  { key: 'bikes',        label: 'Flotte',        icon: Wrench,          section: 'Gestion' },
  { key: 'accounting',   label: 'Compta',        icon: Receipt,         section: 'Gestion' },
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
    ...(role === 'OWNER' ? [{ key: 'settings', label: 'Paramètres', icon: Settings, section: 'Accès' }] : []),
  ]

  const mobileNav = nav.slice(0, 5)

  // Build sections for desktop sidebar
  const sections: { label: string; items: typeof NAV_ITEMS }[] = []
  for (const item of nav) {
    const sec = sections.find(s => s.label === item.section)
    if (sec) sec.items.push(item)
    else sections.push({ label: item.section, items: [item] })
  }

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex w-56 flex-col fixed h-full z-10" style={{ background: '#0F172A' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#6366F1' }}>
              <Bike size={15} className="text-white" />
            </div>
            <div>
              <span className="font-semibold text-white text-[15px] tracking-tight block leading-tight">VeloRent</span>
              <span className="text-[11px] truncate font-mono" style={{ color: '#64748b' }}>{tenantSlug}</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {sections.map((section, si) => (
            <div key={section.label} className={si > 0 ? 'mt-5' : ''}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] px-2 mb-1.5" style={{ color: '#334155' }}>
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const href = `/${tenant}/${item.key}`
                  const isActive = pathname.startsWith(href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.key}
                      href={href}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all"
                      style={{
                        background: isActive ? '#6366F1' : 'transparent',
                        color: isActive ? '#ffffff' : '#94a3b8',
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#cbd5e1' }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
                    >
                      <Icon size={15} strokeWidth={isActive ? 2.5 : 1.8} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold" style={{ background: '#1e293b', color: '#94a3b8' }}>
              {tenantSlug.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-white truncate">{tenantSlug}</p>
              <p className="text-[10px]" style={{ color: '#475569' }}>{role === 'OWNER' ? 'Propriétaire' : 'Employé'}</p>
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all"
              style={{ color: '#64748b' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f43f5e'; (e.currentTarget as HTMLElement).style.background = 'rgba(244,63,94,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <LogOut size={14} />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-20 px-4 py-3 flex items-center justify-between border-b" style={{ background: '#0F172A', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#6366F1' }}>
            <Bike size={13} className="text-white" />
          </div>
          <span className="font-semibold text-white text-sm">VeloRent</span>
          <span className="text-xs font-mono" style={{ color: '#475569' }}>· {tenantSlug}</span>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="p-1.5 rounded-lg">
            <LogOut size={16} style={{ color: '#475569' }} />
          </button>
        </form>
      </header>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 border-t px-2 py-1 safe-area-pb" style={{ background: '#0F172A', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex justify-around">
          {mobileNav.map((item) => {
            const href = `/${tenant}/${item.key}`
            const isActive = pathname.startsWith(href)
            const Icon = item.icon
            return (
              <Link
                key={item.key}
                href={href}
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
                style={{ color: isActive ? '#6366F1' : '#475569' }}
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
