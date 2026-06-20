'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Bike, AlertTriangle, Plus, Search, TrendingUp, Clock, TriangleAlert } from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    'bg-indigo-50 text-indigo-600',
  COMPLETED: 'bg-slate-100 text-slate-500',
  OVERDUE:   'bg-red-50 text-red-500',
  CANCELLED: 'bg-red-50 text-red-500',
}

type Rental = {
  id: string
  status: string
  startAt: string
  expectedReturnAt: string | null
  amountPaid: number | null
  bikeCount?: number
  bike: { name: string; code: string }
  customer: { firstName: string; lastName: string }
}

type KPI = { revenueToday: number; activeCount: number; overdueCount: number }

type Props = {
  tenant: string
  rentals: Rental[]
  kpi: KPI
  labels: {
    title: string; new: string; active: string; noActive: string
    inProgress: string; closeArrow: string; lateReturn: string
    history: string; client: string; bike: string; noHistory: string
    kpiRevenue: string; kpiActive: string; kpiOverdue: string
    tabAll: string; tabActive: string; tabOverdue: string
    tabCompleted: string; tabCancelled: string
    searchPlaceholder: string; inProgressLabel: string
  }
  statusLabels: Record<string, string>
}

const TABS = ['all', 'active', 'overdue', 'completed', 'cancelled'] as const
type Tab = typeof TABS[number]

export default function RentalsClient({ tenant, rentals, kpi, labels, statusLabels }: Props) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return rentals.filter(r => {
      // Tab filter
      if (tab === 'active')    { if (r.status !== 'ACTIVE') return false }
      if (tab === 'overdue')   { if (!(r.status === 'OVERDUE' || (r.status === 'ACTIVE' && r.expectedReturnAt && new Date(r.expectedReturnAt) < new Date()))) return false }
      if (tab === 'completed') { if (r.status !== 'COMPLETED') return false }
      if (tab === 'cancelled') { if (r.status !== 'CANCELLED') return false }
      // Search filter
      if (q) {
        const name = `${r.customer.firstName} ${r.customer.lastName}`.toLowerCase()
        const code = r.bike.code.toLowerCase()
        const bikeName = r.bike.name.toLowerCase()
        if (!name.includes(q) && !code.includes(q) && !bikeName.includes(q)) return false
      }
      return true
    })
  }, [rentals, tab, search])

  const activeRentals = filtered.filter(r => r.status === 'ACTIVE' || r.status === 'OVERDUE')
  const closedRentals = filtered.filter(r => r.status !== 'ACTIVE' && r.status !== 'OVERDUE')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{labels.title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{kpi.activeCount} {labels.inProgress}</p>
        </div>
        <Link
          href={`/${tenant}/rentals/new`}
          className="flex items-center gap-1.5 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8b5cf6)' }}
        >
          <Plus size={14} /> {labels.new}
        </Link>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          flex: 1, background: 'linear-gradient(135deg,#eef2ff,#f0fdf4)',
          border: '1px solid #c7d2fe', borderRadius: '14px', padding: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <TrendingUp size={13} style={{ color: '#6366f1' }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{labels.kpiRevenue}</span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{kpi.revenueToday.toFixed(0)} €</p>
        </div>
        <div style={{
          flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: '14px', padding: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Clock size={13} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{labels.kpiActive}</span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{kpi.activeCount}</p>
        </div>
        <div style={{
          flex: 1, background: kpi.overdueCount > 0 ? '#fff1f2' : '#f8fafc',
          border: `1px solid ${kpi.overdueCount > 0 ? '#fecdd3' : '#e2e8f0'}`,
          borderRadius: '14px', padding: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <TriangleAlert size={13} style={{ color: kpi.overdueCount > 0 ? '#ef4444' : '#94a3b8' }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: kpi.overdueCount > 0 ? '#ef4444' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{labels.kpiOverdue}</span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 800, color: kpi.overdueCount > 0 ? '#ef4444' : '#94a3b8' }}>{kpi.overdueCount}</p>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={labels.searchPlaceholder}
          style={{
            width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px',
            borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff',
            fontSize: '14px', color: '#1e293b', outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => { e.target.style.borderColor = '#6366f1' }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
        />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '2px' }}>
        {TABS.map(t => {
          const count = rentals.filter(r => {
            if (t === 'all') return true
            if (t === 'active') return r.status === 'ACTIVE'
            if (t === 'overdue') return r.status === 'OVERDUE' || (r.status === 'ACTIVE' && r.expectedReturnAt && new Date(r.expectedReturnAt) < new Date())
            if (t === 'completed') return r.status === 'COMPLETED'
            if (t === 'cancelled') return r.status === 'CANCELLED'
            return false
          }).length
          const active = tab === t
          return (
            <button key={t} type="button" onClick={() => setTab(t)}
              style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: '20px', fontSize: '12px',
                fontWeight: 600, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                borderColor: active ? '#6366f1' : '#e2e8f0',
                background: active ? '#6366f1' : '#fff',
                color: active ? '#fff' : '#64748b',
              }}>
              {labels[`tab${t.charAt(0).toUpperCase() + t.slice(1)}` as keyof typeof labels]} {count > 0 && <span style={{ opacity: 0.7 }}>· {count}</span>}
            </button>
          )
        })}
      </div>

      {/* Active rentals */}
      {(tab === 'all' || tab === 'active' || tab === 'overdue') && (
        <div className="mb-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
            {labels.active} — {activeRentals.length}
          </p>
          {activeRentals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <Bike size={24} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{labels.noActive}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeRentals.map(rental => {
                const elapsedMs = Date.now() - new Date(rental.startAt).getTime()
                const totalHours = Math.floor(elapsedMs / 3600000)
                const minutes = Math.floor((elapsedMs % 3600000) / 60000)
                const days = Math.floor(totalHours / 24)
                const remHours = totalHours % 24
                const durationLabel = days > 0
                  ? `${days}j ${remHours > 0 ? `${remHours}h` : ''}`.trim()
                  : totalHours > 0
                    ? `${totalHours}h${minutes > 0 ? `${minutes}min` : ''}`
                    : `${minutes}min`
                const isOverdue = rental.status === 'OVERDUE' || (rental.expectedReturnAt && new Date(rental.expectedReturnAt) < new Date())
                return (
                  <div
                    key={rental.id}
                    className={`bg-white rounded-2xl border p-3.5 flex items-center justify-between gap-3 ${isOverdue ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}
                    style={isOverdue ? { borderLeft: '4px solid #f87171' } : {}}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: isOverdue ? '#f87171' : '#34d399',
                        boxShadow: isOverdue ? '0 0 0 3px #fee2e2' : '0 0 0 3px #d1fae5',
                      }} />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {rental.customer.firstName} {rental.customer.lastName}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {rental.bike.name}{(rental.bikeCount ?? 1) > 1 ? ` +${(rental.bikeCount ?? 1) - 1}` : ''} · <span className="font-mono">{rental.bike.code}</span> · {durationLabel} {labels.inProgressLabel}
                        </p>
                        {isOverdue && (
                          <p className="text-xs text-red-500 font-medium mt-0.5 flex items-center gap-1">
                            <AlertTriangle size={10} /> {labels.lateReturn}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/${tenant}/rentals/${rental.id}`}
                      className="text-white text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0 active:scale-95 transition-all"
                      style={{ background: '#6366F1' }}
                    >
                      {labels.closeArrow}
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* History */}
      {(tab === 'all' || tab === 'completed' || tab === 'cancelled') && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">{labels.history}</p>

          {closedRentals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <Bike size={24} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{labels.noHistory}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">{labels.client}</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{labels.bike}</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Date</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">€</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {closedRentals.map(rental => {
                      const statusColor = STATUS_COLOR[rental.status] ?? 'bg-slate-100 text-slate-500'
                      const statusLabel = statusLabels[rental.status.toLowerCase()] ?? rental.status
                      return (
                        <tr key={rental.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 text-sm font-medium text-slate-900">
                            {rental.customer.firstName} {rental.customer.lastName}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">{rental.bike.name}{(rental.bikeCount ?? 1) > 1 ? ` (+${(rental.bikeCount ?? 1) - 1})` : ''}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {new Date(rental.startAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                            {rental.amountPaid ? `${Number(rental.amountPaid).toFixed(2)} €` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/${tenant}/rentals/${rental.id}`}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full hover:opacity-80 ${statusColor}`}
                            >
                              {statusLabel}
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {closedRentals.map(rental => {
                  const statusColor = STATUS_COLOR[rental.status] ?? 'bg-slate-100 text-slate-500'
                  const statusLabel = statusLabels[rental.status.toLowerCase()] ?? rental.status
                  return (
                    <Link
                      key={rental.id}
                      href={`/${tenant}/rentals/${rental.id}`}
                      className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 block active:scale-[0.99] transition-all"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {rental.customer.firstName} {rental.customer.lastName}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {rental.bike.name}{(rental.bikeCount ?? 1) > 1 ? ` (+${(rental.bikeCount ?? 1) - 1})` : ''} · {new Date(rental.startAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-slate-700">
                          {rental.amountPaid ? `${Number(rental.amountPaid).toFixed(0)} €` : '—'}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
