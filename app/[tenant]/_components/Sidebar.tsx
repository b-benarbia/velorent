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
  CalendarRange,
  MoreHorizontal,
} from 'lucide-react'
import CommandPalette from './CommandPalette'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslations } from 'next-intl'

const RunivoMark = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <rect x="3" y="3" width="2.5" height="12" rx="1.25" fill="white" />
    <path d="M8.5 5L13.5 9L8.5 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const NAV_KEYS = [
  { key: 'dashboard',    tKey: 'dashboard',    icon: LayoutDashboard, section: 'principal', badgeKey: null },
  { key: 'rentals',      tKey: 'rentals',      icon: Bike,            section: 'principal', badgeKey: 'rentals' },
  { key: 'reservations', tKey: 'reservations', icon: CalendarDays,    section: 'principal', badgeKey: 'reservations' },
  { key: 'planning',     tKey: 'planning',     icon: CalendarRange,   section: 'principal', badgeKey: null },
  { key: 'bikes',        tKey: 'bikes',        icon: Wrench,          section: 'gestion',   badgeKey: null },
  { key: 'accounting',   tKey: 'accounting',   icon: Receipt,         section: 'gestion',   badgeKey: null },
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
  const t = useTranslations('nav')

  const badges: Record<string, number> = {
    rentals: activeRentalsCount,
    reservations: pendingReservationsCount,
  }

  const NAV_ITEMS = NAV_KEYS.map(item => ({ ...item, label: t(item.tKey as Parameters<typeof t>[0]) }))

  const nav = [
    ...NAV_ITEMS,
    ...(role === 'OWNER' ? [{ key: 'settings', tKey: 'settings', label: t('settings'), icon: Settings, section: 'acces', badgeKey: null }] : []),
  ]

  const mobileNav = nav.filter(i => ['dashboard','rentals','reservations','planning','bikes'].includes(i.key))

  return (
    <>
      <CommandPalette tenant={tenant} />

      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className="hidden md:flex w-56 flex-col fixed h-full z-10 overflow-hidden"
        style={{
          background: 'linear-gradient(200deg, #0A0F1C 0%, #070B14 60%, #060912 100%)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.6), inset -1px 0 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Ambient glow — top-left (logo area) */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: -60, left: -60, width: 220, height: 220,
            background: 'radial-gradient(ellipse, rgba(13,148,136,0.12) 0%, transparent 65%)',
          }}
        />
        {/* Ambient glow — bottom-right */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: -40, right: -40, width: 180, height: 180,
            background: 'radial-gradient(ellipse, rgba(8,145,178,0.07) 0%, transparent 65%)',
          }}
        />

        {/* ── Logo area ── */}
        <div className="relative px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            {/* Mark with glow ring */}
            <div className="relative flex-shrink-0">
              <div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{ background: 'rgba(13,148,136,0.2)', filter: 'blur(8px)', transform: 'scale(1.3)' }}
              />
              <div
                className="relative w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)',
                  boxShadow: '0 2px 8px rgba(13,148,136,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                <RunivoMark size={16} />
              </div>
            </div>
            <div>
              <p className="font-bold text-white leading-none mb-0.5" style={{ fontSize: 15, letterSpacing: '-0.03em' }}>Runivo</p>
              <p className="font-mono leading-none" style={{ fontSize: 10, color: '#2A4A6A' }}>{tenantSlug}</p>
            </div>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="relative px-3 pb-3">
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
              window.dispatchEvent(event)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#2A4A6A' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)' }}
          >
            <Search size={11} style={{ color: '#1A3050' }} />
            <span className="flex-1 text-left">{t('search')}</span>
            <kbd className="text-[9px] font-mono px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: '#162840', border: '1px solid rgba(255,255,255,0.06)' }}>⌘K</kbd>
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="relative flex-1 px-2 overflow-y-auto">

          {/* Group 1 — principal */}
          <div className="space-y-px">
            {nav.filter(i => i.section === 'principal').map((item) => {
              const href = `/${tenant}/${item.key}`
              const isActive = pathname.startsWith(href)
              const Icon = item.icon
              const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0
              return (
                <Link
                  key={item.key}
                  href={href}
                  className="flex items-center gap-2.5 px-2.5 py-[8px] rounded-lg text-[13px] font-medium relative transition-all duration-100"
                  style={{
                    background: isActive
                      ? 'rgba(255,255,255,0.07)'
                      : 'transparent',
                    color: isActive ? '#ffffff' : '#3D5578',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                    if (!isActive) (e.currentTarget as HTMLElement).style.color = '#4A6480'
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
                    if (!isActive) (e.currentTarget as HTMLElement).style.color = '#3D5578'
                  }}
                >
                  <Icon
                    size={15}
                    strokeWidth={isActive ? 2 : 1.6}
                    style={{
                      color: isActive ? '#0D9488' : '#2A4A6A',
                      filter: isActive ? 'drop-shadow(0 0 6px rgba(13,148,136,0.6))' : 'none',
                      transition: 'filter 0.2s',
                    }}
                  />
                  <span className="flex-1 tracking-tight">{item.label}</span>
                  {badgeCount > 0 && (
                    <span
                      className="text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1"
                      style={{
                        background: isActive ? 'rgba(13,148,136,0.25)' : 'rgba(255,255,255,0.05)',
                        color: isActive ? '#2DD4BF' : '#3D5578',
                      }}
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Divider */}
          <div className="my-3 mx-2" style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

          {/* Group 2 — gestion */}
          <div className="space-y-px">
            {nav.filter(i => i.section === 'gestion').map((item) => {
              const href = `/${tenant}/${item.key}`
              const isActive = pathname.startsWith(href)
              const Icon = item.icon
              return (
                <Link
                  key={item.key}
                  href={href}
                  className="flex items-center gap-2.5 px-2.5 py-[8px] rounded-lg text-[13px] font-medium relative transition-all duration-100"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                    color: isActive ? '#ffffff' : '#3D5578',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                    if (!isActive) (e.currentTarget as HTMLElement).style.color = '#4A6480'
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
                    if (!isActive) (e.currentTarget as HTMLElement).style.color = '#3D5578'
                  }}
                >
                  <Icon
                    size={15}
                    strokeWidth={isActive ? 2 : 1.6}
                    style={{
                      color: isActive ? '#0D9488' : '#2A4A6A',
                      filter: isActive ? 'drop-shadow(0 0 6px rgba(13,148,136,0.6))' : 'none',
                      transition: 'filter 0.2s',
                    }}
                  />
                  <span className="flex-1 tracking-tight">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Settings — accès */}
          {nav.filter(i => i.section === 'acces').length > 0 && (
            <>
              <div className="my-3 mx-2" style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />
              <div className="space-y-px">
                {nav.filter(i => i.section === 'acces').map((item) => {
                  const href = `/${tenant}/${item.key}`
                  const isActive = pathname.startsWith(href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.key}
                      href={href}
                      className="flex items-center gap-2.5 px-2.5 py-[8px] rounded-lg text-[13px] font-medium relative transition-all duration-100"
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                        color: isActive ? '#ffffff' : '#3D5578',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                        if (!isActive) (e.currentTarget as HTMLElement).style.color = '#4A6480'
                      }}
                      onMouseLeave={e => {
                        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
                        if (!isActive) (e.currentTarget as HTMLElement).style.color = '#3D5578'
                      }}
                    >
                      <Icon
                        size={15}
                        strokeWidth={isActive ? 2 : 1.6}
                        style={{
                          color: isActive ? '#0D9488' : '#2A4A6A',
                          filter: isActive ? 'drop-shadow(0 0 6px rgba(13,148,136,0.6))' : 'none',
                          transition: 'filter 0.2s',
                        }}
                      />
                      <span className="flex-1 tracking-tight">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </nav>

        {/* ── Footer ── */}
        <div className="relative px-3 pb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {/* User row */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-2 transition-all"
            style={{ cursor: 'default' }}
          >
            {/* Avatar — teal gradient */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)', boxShadow: '0 0 8px rgba(13,148,136,0.3)' }}
            >
              {tenantSlug.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: '#94A3B8' }}>{tenantSlug}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981', boxShadow: '0 0 4px rgba(16,185,129,0.6)' }} />
                <span style={{ fontSize: 9, color: '#1A3050' }}>{role === 'OWNER' ? t('owner') : t('employee')}</span>
              </div>
            </div>
          </div>

          <LanguageSwitcher />

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all duration-150"
              style={{ color: '#1A3050' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.color = '#f87171'
                el.style.background = 'rgba(239,68,68,0.07)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.color = '#1A3050'
                el.style.background = 'transparent'
              }}
            >
              <LogOut size={13} />
              {t('logout')}
            </button>
          </form>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-20 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(7,11,20,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 1px 24px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)', boxShadow: '0 0 10px rgba(13,148,136,0.4)' }}
          >
            <RunivoMark size={15} />
          </div>
          <span className="font-bold text-white text-sm" style={{ letterSpacing: '-0.025em' }}>Runivo</span>
          <span className="text-[11px] font-mono" style={{ color: '#2A4A6A' }}>· {tenantSlug}</span>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="p-1.5 rounded-lg transition-opacity" style={{ opacity: 0.4 }}>
            <LogOut size={16} className="text-slate-400" />
          </button>
        </form>
      </header>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 px-1 py-1 safe-area-pb"
        style={{
          background: 'rgba(7,11,20,0.94)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 -1px 24px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex justify-around items-center">
          {mobileNav.map((item) => {
            const href = `/${tenant}/${item.key}`
            const isActive = pathname.startsWith(href)
            const Icon = item.icon
            const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0
            return (
              <Link
                key={item.key}
                href={href}
                className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all relative"
                style={{ color: isActive ? '#0D9488' : '#2A4A6A' }}
              >
                <Icon
                  size={19}
                  strokeWidth={isActive ? 2 : 1.6}
                  style={{ filter: isActive ? 'drop-shadow(0 0 5px rgba(13,148,136,0.6))' : 'none' }}
                />
                <span className="text-[9px] font-semibold leading-none mt-0.5">{item.label}</span>
                {badgeCount > 0 && (
                  <span
                    className="absolute top-1 right-0.5 text-[8px] font-bold min-w-[13px] h-[13px] flex items-center justify-center rounded-full px-0.5"
                    style={{ background: '#0D9488', color: '#fff' }}
                  >
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
          {/* More */}
          <div className="relative">
            <button
              className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all"
              style={{
                color: (pathname.includes('/accounting') || pathname.includes('/settings')) ? '#0D9488' : '#2A4A6A',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
              onClick={() => {
                const el = document.getElementById('mobile-more-menu')
                if (el) el.classList.toggle('hidden')
              }}
            >
              <MoreHorizontal size={19} strokeWidth={1.6} />
              <span className="text-[9px] font-semibold leading-none mt-0.5">Plus</span>
            </button>
            <div
              id="mobile-more-menu"
              className="hidden absolute bottom-full right-0 mb-2 w-44 rounded-2xl overflow-hidden z-50"
              style={{
                background: 'rgba(7,11,20,0.97)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
              }}
            >
              <Link
                href={`/${tenant}/accounting`}
                onClick={() => document.getElementById('mobile-more-menu')?.classList.add('hidden')}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium"
                style={{ color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <Receipt size={15} style={{ color: '#0D9488' }} />
                {t('accounting')}
              </Link>
              {role === 'OWNER' && (
                <Link
                  href={`/${tenant}/settings`}
                  onClick={() => document.getElementById('mobile-more-menu')?.classList.add('hidden')}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium"
                  style={{ color: '#94A3B8' }}
                >
                  <Settings size={15} style={{ color: '#0D9488' }} />
                  {t('settings')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
