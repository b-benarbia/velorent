'use client'

import { useState, useEffect, useMemo } from 'react'
import { Download, TrendingUp } from 'lucide-react'
import AnimatedNumber from '../_components/AnimatedNumber'

interface Invoice {
  id: string
  number: string
  issuedAt: string
  amountHt: number
  taxRate: number
  amountTtc: number
  currency: string
  rental: {
    id: string
    paymentMethod: string
    customer: { firstName: string; lastName: string }
    bike: { name: string; code: string }
  }
}

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Espèces', CARD: 'Carte', BIZUM: 'Bizum', TRANSFER: 'Virement',
}

const PAYMENT_COLOR: Record<string, string> = {
  CASH: '#6366F1', CARD: '#818cf8', BIZUM: '#a5b4fc', TRANSFER: '#c7d2fe',
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  if (data.length === 0) return null

  const max = Math.max(...data.map(d => d.value), 1)
  const H = 120
  const SVG_W = 800
  const barW = Math.min(60, Math.max(16, (SVG_W / data.length) * 0.45))
  const gap = (SVG_W - data.length * barW) / (data.length + 1)

  return (
    <div style={{ height: 160, overflow: 'hidden' }}>
    <svg
      viewBox={`0 0 ${SVG_W} ${H + 28}`}
      style={{ width: '100%', height: '100%' }}
      preserveAspectRatio="none"
    >
      {[0, 0.33, 0.66, 1].map((t, i) => (
        <line
          key={i}
          x1={0} y1={H * (1 - t)}
          x2={SVG_W} y2={H * (1 - t)}
          stroke="rgba(148,163,184,0.15)"
          strokeWidth={1}
        />
      ))}
      {data.map((d, i) => {
        const x = gap + i * (barW + gap)
        const barH = Math.max(3, (d.value / max) * (H * 0.85))
        const isHov = hovered === i
        return (
          <g key={i}>
            <rect
              x={x} y={H - barH} width={barW} height={barH} rx={4}
              fill={isHov ? '#818cf8' : '#6366F1'}
              opacity={isHov ? 1 : 0.85}
              style={{ transition: 'fill 0.15s, opacity 0.15s' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
            {isHov && (
              <text
                x={x + barW / 2} y={H - barH - 6}
                textAnchor="middle"
                fontSize={12}
                fill="#6366F1"
                fontWeight="600"
              >
                {d.value.toFixed(0)}€
              </text>
            )}
            <text
              x={x + barW / 2} y={H + 20}
              textAnchor="middle"
              fontSize={10}
              fill="#94a3b8"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
    </div>
  )
}

export default function AccountingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [monthFilter, setMonthFilter] = useState<string>('')

  useEffect(() => {
    fetch('/api/invoices')
      .then(r => r.json())
      .then(data => { setInvoices(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  const months = useMemo(() =>
    Array.from(new Set(invoices.map(inv => inv.issuedAt.slice(0, 7)))).sort().reverse()
  , [invoices])

  const filtered = useMemo(() =>
    monthFilter ? invoices.filter(inv => inv.issuedAt.startsWith(monthFilter)) : invoices
  , [invoices, monthFilter])

  const totalTtc = filtered.reduce((s, inv) => s + Number(inv.amountTtc), 0)
  const totalHt  = filtered.reduce((s, inv) => s + Number(inv.amountHt), 0)
  const totalTva = totalTtc - totalHt
  const avgTtc   = filtered.length > 0 ? totalTtc / filtered.length : 0
  const amounts  = filtered.map(inv => Number(inv.amountTtc)).sort((a, b) => a - b)
  const minTtc   = amounts[0] ?? 0
  const maxTtc   = amounts[amounts.length - 1] ?? 0
  const medianTtc = amounts.length > 0
    ? amounts.length % 2 === 0
      ? (amounts[amounts.length / 2 - 1] + amounts[amounts.length / 2]) / 2
      : amounts[Math.floor(amounts.length / 2)]
    : 0

  // Bar chart data
  const chartData = useMemo(() => {
    if (monthFilter) {
      // daily within the month
      const byDay: Record<string, number> = {}
      filtered.forEach(inv => {
        const day = inv.issuedAt.slice(8, 10)
        byDay[day] = (byDay[day] ?? 0) + Number(inv.amountTtc)
      })
      return Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, value]) => ({ label: parseInt(day).toString(), value }))
    } else {
      // monthly across all time
      const byMonth: Record<string, number> = {}
      invoices.forEach(inv => {
        const m = inv.issuedAt.slice(0, 7)
        byMonth[m] = (byMonth[m] ?? 0) + Number(inv.amountTtc)
      })
      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([m, value]) => ({
          label: new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short' }),
          value,
        }))
    }
  }, [filtered, monthFilter, invoices])

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    const byMethod: Record<string, number> = {}
    filtered.forEach(inv => {
      const pm = inv.rental.paymentMethod
      byMethod[pm] = (byMethod[pm] ?? 0) + Number(inv.amountTtc)
    })
    const total = Object.values(byMethod).reduce((s, v) => s + v, 0) || 1
    return Object.entries(byMethod)
      .sort(([, a], [, b]) => b - a)
      .map(([method, amount]) => ({
        method,
        label: PAYMENT_LABEL[method] ?? method,
        amount,
        pct: Math.round((amount / total) * 100),
        color: PAYMENT_COLOR[method] ?? '#6366F1',
      }))
  }, [filtered])

  function exportCSV() {
    const rows = [
      ['Numéro', 'Date', 'Client', 'Vélo', 'Code', 'Paiement', 'HT (€)', 'TVA (%)', 'TTC (€)'],
      ...filtered.map(inv => [
        inv.number,
        new Date(inv.issuedAt).toLocaleDateString('fr-FR'),
        `${inv.rental.customer.firstName} ${inv.rental.customer.lastName}`,
        inv.rental.bike.name,
        inv.rental.bike.code,
        PAYMENT_LABEL[inv.rental.paymentMethod] ?? inv.rental.paymentMethod,
        Number(inv.amountHt).toFixed(2),
        (Number(inv.taxRate) * 100).toFixed(0),
        Number(inv.amountTtc).toFixed(2),
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `velorent-compta${monthFilter ? `-${monthFilter}` : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const monthLabel = monthFilter
    ? new Date(monthFilter + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : 'toute la période'

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Comptabilité</h1>
          <p className="text-sm text-slate-400 mt-0.5">{filtered.length} facture{filtered.length !== 1 ? 's' : ''} · {monthLabel}</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-40 transition-opacity"
          style={{ background: '#6366F1' }}
        >
          <Download size={14} /> Exporter CSV
        </button>
      </div>

      {/* Month pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => setMonthFilter('')}
          className="text-xs font-semibold px-4 py-1.5 rounded-full flex-shrink-0 transition-all"
          style={{
            background: !monthFilter ? '#6366F1' : 'white',
            color: !monthFilter ? '#fff' : '#64748b',
            border: !monthFilter ? 'none' : '1px solid #e2e8f0',
          }}
        >
          Toute la période
        </button>
        {months.map(m => {
          const active = monthFilter === m
          return (
            <button
              key={m}
              onClick={() => setMonthFilter(m)}
              className="text-xs font-semibold px-4 py-1.5 rounded-full flex-shrink-0 transition-all capitalize"
              style={{
                background: active ? '#6366F1' : 'white',
                color: active ? '#fff' : '#64748b',
                border: active ? 'none' : '1px solid #e2e8f0',
              }}
            >
              {new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Chargement...</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 stagger">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 card-hover">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">CA TTC</p>
              <p className="text-2xl font-semibold tracking-tight" style={{ color: '#6366F1' }}>
                <AnimatedNumber value={totalTtc} decimals={2} suffix=" €" duration={800} />
              </p>
              <p className="text-xs text-slate-400 mt-1">{monthLabel}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 card-hover">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">CA HT</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">
                <AnimatedNumber value={totalHt} decimals={2} suffix=" €" duration={800} />
              </p>
              <p className="text-xs text-slate-400 mt-1">hors taxes</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 card-hover">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">TVA collectée</p>
              <p className="text-2xl font-semibold tracking-tight text-amber-500">
                <AnimatedNumber value={totalTva} decimals={2} suffix=" €" duration={800} />
              </p>
              <p className="text-xs text-slate-400 mt-1">à reverser</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 card-hover">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Factures</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">
                <AnimatedNumber value={filtered.length} duration={600} />
              </p>
              <p className="text-xs text-slate-400 mt-1">locations clôturées</p>
            </div>
          </div>

          {/* Bar chart */}
          {chartData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-900">
                  {monthFilter ? 'CA par jour' : 'Évolution du CA'}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <TrendingUp size={12} style={{ color: '#6366F1' }} />
                  <span style={{ color: '#6366F1' }} className="font-medium">{totalTtc.toFixed(0)} €</span>
                  <span>total</span>
                </div>
              </div>
              <BarChart data={chartData} />
            </div>
          )}

          {/* Payment breakdown + Panier moyen */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Payment breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-semibold text-slate-900 mb-4">Par mode de paiement</p>
                {paymentBreakdown.length === 0 ? (
                  <p className="text-sm text-slate-400">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {paymentBreakdown.map(pm => (
                      <div key={pm.method}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-600 font-medium">{pm.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{pm.amount.toFixed(0)} €</span>
                            <span className="text-xs font-semibold text-slate-700">{pm.pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pm.pct}%`, background: pm.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Panier moyen */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-semibold text-slate-900 mb-3">Panier moyen</p>
                <p className="text-3xl font-semibold tracking-tight mb-1" style={{ color: '#6366F1' }}>
                  <AnimatedNumber value={avgTtc} decimals={2} suffix=" €" duration={700} />
                </p>
                <p className="text-xs text-slate-400 mb-5">par location</p>
                <div className="space-y-2.5 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Location la plus haute</span>
                    <span className="font-semibold text-slate-700">{maxTtc.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Médiane</span>
                    <span className="font-semibold text-slate-700">{medianTtc.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Location la plus basse</span>
                    <span className="font-semibold text-slate-700">{minTtc.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
              <p className="text-slate-400 text-sm">Aucune facture{monthFilter ? ' ce mois' : ''}</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Détail des factures</p>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>HT total : <span className="font-semibold text-slate-700">{totalHt.toFixed(2)} €</span></span>
                  <span>TTC total : <span className="font-semibold" style={{ color: '#6366F1' }}>{totalTtc.toFixed(2)} €</span></span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Numéro', 'Date', 'Client', 'Vélo', 'Paiement', 'HT', 'TTC'].map((h, i) => (
                        <th
                          key={h}
                          className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 ${i >= 5 ? 'text-right' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv, idx) => (
                      <tr
                        key={inv.id}
                        className="border-t border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{inv.number}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {new Date(inv.issuedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 text-xs">
                          {inv.rental.customer.firstName} {inv.rental.customer.lastName}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="text-slate-700">{inv.rental.bike.name}</span>
                          <span className="text-slate-400 font-mono ml-1 text-[10px]">{inv.rental.bike.code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(99,102,241,0.08)', color: '#6366F1' }}
                          >
                            {PAYMENT_LABEL[inv.rental.paymentMethod] ?? inv.rental.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500">{Number(inv.amountHt).toFixed(2)} €</td>
                        <td className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#6366F1' }}>
                          {Number(inv.amountTtc).toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
